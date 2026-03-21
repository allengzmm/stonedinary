# 道痕日记本 StoneDiary

道痕日记本（StoneDiary）是一款本地离线的结构化日记与复盘软件，帮助用户围绕“事件、反应、欲望、恐惧、解释、模式、行动”进行持续记录与自我观察。

项目强调本地优先、离线可用和个人隐私保护，适合个人成长记录、情绪追踪、行为模式复盘等场景。

## 当前版本

- Windows：`v0.1.3`
- Android：`v0.1.3`

## 下载

### Windows 版本

- [道痕日记本 StoneDiary_0.1.3_x64-setup.exe](https://github.com/allengzmm/stonedinary/raw/main/release-assets/2026-03-21-v0.1.3-session-restore/%E9%81%93%E7%97%95%E6%97%A5%E8%AE%B0%E6%9C%AC%20StoneDiary_0.1.3_x64-setup.exe)
- [stone-diary.exe](https://github.com/allengzmm/stonedinary/raw/main/release-assets/2026-03-21-v0.1.3-session-restore/stone-diary.exe)

### Android 版本

- [道痕日记本-StoneDiary-v0.1.3-debug.apk](https://github.com/allengzmm/stonedinary/raw/main/release-assets/2026-03-21-v0.1.3-session-restore/%E9%81%93%E7%97%95%E6%97%A5%E8%AE%B0%E6%9C%AC-StoneDiary-v0.1.3-debug.apk)

## 功能概览

- 结构化日记记录：按固定步骤记录当天的重要事件与内在反应
- 历史记录管理：查看、编辑、删除历史日记
- 石头库：沉淀重复出现的模式，支持查看、编辑、归档和关联日记
- 周复盘 / 月复盘：自动统计阶段性数据并填写复盘总结
- 多账号本地使用：每个账号对应独立数据库
- 本地密码保护：支持账号密码登录与管理员密码重置
- 数据导出：支持 JSON、Markdown 导出
- 历史数据迁移导入：支持导入历史 JSON 数据，并按时间合并
- 数据库备份 / 恢复：支持普通备份与加密备份
- Android 版本：支持与 Windows 版本通过 JSON 双向迁移和合并

## 更新记录

### v0.1.3

- 修复 Android 设置页导入后直接打回登录页的问题，导入成功后改为站内刷新
- 增加当前账号登录态恢复，应用重启后可直接回到上次账号
- 修复 Android 容器引用旧前端 bundle 的问题，重新同步后运行最新前端资产
- 补充 Windows 与 Android 最新安装包产物

### v0.1.2

- 修复认证页中文文案显示
- 修复移动端 Markdown 导出中的石头使用次数统计
- 完成 Android / Windows JSON 迁移与合并回归验证
- 增补 Android 测试方案与测试报告

## 技术栈

- `Tauri`
- `React`
- `TypeScript`
- `SQLite`
- `Capacitor Android`

## 本地开发

1. 安装 `Node.js`、`npm`、`Rust` 以及 Tauri 所需环境
2. 在项目目录执行 `npm install`
3. 启动桌面开发环境：

```bash
npm run tauri dev
```

4. 构建桌面安装包：

```bash
npm run tauri build
```

## Android 开发

常用命令：

```bash
npm run build
npm run android:sync
npm run android:open
```

说明：

- Windows 版继续使用 `Tauri + SQLite`
- Android 版使用 `Capacitor + 本地离线存储`
- 两端共用同一份 JSON 导出结构
- 可通过 JSON 导出 / 导入在 Windows 与 Android 之间双向迁移
- 导入时按现有规则自动合并，而不是整库覆盖

详细说明见：[ANDROID.md](./ANDROID.md)

## 许可与使用说明

本项目仓库使用 [PolyForm Noncommercial 1.0.0](./LICENSE) 许可证。

补充中文说明如下：

- 本项目源码及其生成的可执行程序仅供个人学习、研究、体验和非商业传播使用
- 允许在保留许可证与声明的前提下免费传播
- 不得将本项目或其衍生版本用于销售、收费服务、商业培训、商业集成、商业交付或任何直接、间接盈利场景
- 未经明确授权，不得进行商业发行或二次商业开发

如需商业使用或授权合作，请另行获得明确授权。
