# Android 版本说明

## 目标

Android 版基于当前 Windows 版的产品逻辑实现，重点保持以下一致性：

- 账号体系一致
- 日记、石头、复盘的数据结构一致
- JSON 导出格式一致
- 历史数据导入后的合并规则一致

## 当前实现

- Windows 桌面版：
  - `Tauri + SQLite`
- Android 版：
  - `Capacitor + React`
  - 本地离线存储

Android 版当前通过同一套 TypeScript 业务层复用：

- 账号与登录逻辑
- 日记数据结构
- 石头库逻辑
- 复盘逻辑
- JSON 导入合并逻辑
- JSON 导出逻辑

## 数据互相迁移

Windows 与 Android 之间推荐通过 `JSON 导出 / 导入` 迁移，而不是直接交换数据库文件。

迁移流程：

1. 在源设备导出 `JSON`
2. 将 JSON 文件复制到目标设备
3. 在目标设备使用“导入历史 JSON”
4. 系统按规则自动合并数据

## 合并规则

- 日记：按 `entryDate` 合并
  - 若同一天都有记录，保留 `updatedAt` 较新的记录
- 石头：按 `name` 合并
  - 若名称相同，更新描述与归档状态
- 复盘：按 `reviewType + periodStart + periodEnd` 合并
  - 若同周期都有记录，保留 `updatedAt` 较新的记录

## Android 开发

```bash
npm install
npm run build
npm run android:sync
npm run android:open
```

然后使用 Android Studio 打开 `android` 目录进行调试、打包和签名。

## 当前边界

- Android 版当前不提供数据库文件级备份 / 恢复
- Android 与 Windows 的正式迁移方式是 JSON 导出 / 导入
- 如果后续要做真正的跨端数据库级同步，应单独设计同步协议，而不是直接共享数据库文件
