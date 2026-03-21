# 道痕日记本 Android 测试报告

日期：2026-03-21

测试依据：[TEST_PLAN.md](./TEST_PLAN.md)

## 结论

本轮 Android 核心链路测试已完成，当前结论如下：

- 构建、同步、安装、启动通过
- 首次初始化账号通过
- 登录、退出登录通过
- 底部导航切换通过
- 今日页草稿保存通过
- 草稿可在历史页读取，且不会被复盘统计为已完成
- 完成态数据可正确联动到历史页、石头页、复盘页
- Android 与 Windows 之间的 JSON 双向迁移和按时间合并通过
- Android 设置页 JSON / Markdown 导出通过
- Android 设置页真实文件选择导入通过
- 认证页中文文案与石头使用次数统计回归通过
- 当前账号登录态恢复通过

## 执行结果

### 1. 构建与安装

- 执行：`npm.cmd run build`
- 执行：`npm.cmd run android:sync`
- 执行：`gradlew installDebug`
- 结果：通过

### 2. 首次初始化与登录

- 清空应用数据后重新启动
- 初始化管理员密码
- 创建本地账号 `demo`
- 使用账号 `demo` 成功登录
- 从设置页退出登录后可返回登录页
- 结果：通过

### 3. 主界面导航

- 今日
- 历史
- 石头
- 复盘
- 设置

五个页面均可进入，未观察到白屏或闪退。

### 4. 草稿保存链路

- 在今日页录入测试内容
- 点击“保存草稿”
- 历史页读到当天草稿记录
- 复盘页周 / 月“已完成记录”仍为 `0`
- 结果：通过

### 5. 完成态联动链路

写入完成态测试数据后，验证结果如下：

- 历史页显示状态为“已完成”
- 石头页出现 `approval_need`
- 石头使用次数为 `1`
- 复盘页周 / 月“已完成记录”为 `1`
- Top Stone 为 `approval_need`
- Top Scene 为“工作”
- 结果：通过

### 6. Android -> Windows 迁移与合并

- 从 Android 导出真实 JSON 快照
- 导入独立桌面 SQLite 测试库
- 同日期旧记录被较新的 `updatedAt` 覆盖
- 重复导入同一份快照时被正确跳过
- 结果：通过

### 7. Windows -> Android 迁移与合并

- 在桌面测试库新增一条完成态记录
- 导出桌面 JSON 快照
- 回写到 Android 当前账号本地数据
- Android 当前账号从 1 条完成记录增加到 2 条
- 复盘页周 / 月“已完成记录”变为 `2`
- Top Stones 出现 `approval_need / 1` 和 `avoid_conflict / 1`
- Top Scenes 出现“工作 / 1”和“家庭 / 1”
- 结果：通过

### 8. Android 设置页导出与导入

#### JSON 导出

- 文件名：`stone-diary-export-2026-03-21.json`
- MIME：`application/json`
- 内容包含当前 Android 数据快照
- 结果：通过

#### Markdown 导出

- 文件名：`stone-diary-export-2026-03-21.md`
- MIME：`text/markdown`
- 内容包含概览、石头库和完成态日记全文
- 结果：通过

#### JSON 导入 UI 人工回归

- 从设置页点击“导入历史 JSON”
- 成功拉起 Android 系统文件选择器 `DocumentsUI`
- 在 `Downloads` 中选择真实文件 `android-manual-ui-import.json`
- 导入后重新进入当前账号 `demo`
- 石头页出现新增石头 `self_doubt`
- 复盘页周 / 月“已完成记录”变为 `3`
- Top Stones 出现 `approval_need / 1`、`avoid_conflict / 1`、`self_doubt / 1`
- 典型记录出现 `2026-03-19 / self_doubt / friend_reply_delay`
- 结果：通过

### 9. 回归验证

#### 认证页中文文案

- 登录页标题显示为“账号登录”
- 提示文案显示为“每个账号使用独立数据库。”
- 管理员区域标题显示为“管理员找回 / 重置密码”
- 结果：通过

#### Markdown 导出中的石头使用次数

- `approval_need` 使用次数为 `1`
- `avoid_conflict` 使用次数为 `1`
- 已修复迁移数据中 `stoneId` 不一致导致统计偏低的问题
- 结果：通过

#### 当前账号登录态恢复

- 通过真实登录流程进入账号 `demo`
- 会话信息已写入本地存储
- 强制停止应用后重新启动
- 应用直接恢复到主界面，不再回到登录页
- 结果：通过

补充说明：

- 本轮同时修复了 Android 容器引用旧前端 bundle 的问题
- 处理方式是清空 `android/app/src/main/assets/public` 后重新执行同步
- 修复后 Android 端实际运行的已是当前版本前端资产

## 当前风险

1. 今日页七步输入如果继续依赖 ADB 坐标自动化，稳定性不足，后续应改成更稳的 WebView DOM 或端侧 UI 自动化方案。
