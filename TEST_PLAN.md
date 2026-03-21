# 道痕日记本 Android 测试方案

日期：2026-03-21

## 目标

验证 Android 版本在当前版本逻辑下具备以下能力：

- 应用可正常构建、安装、启动
- 首次初始化账号与后续登录可用
- 今日记录、历史、石头、复盘、设置五个核心页面可用
- 草稿与完成态数据能正确持久化
- Android 与 Windows 可通过 JSON 进行双向迁移与时间合并
- 设置页导出链路可用

## 测试环境

- 项目目录：`d:\project\stone-diary`
- Android 工程：`d:\project\stone-diary\android`
- 模拟器：`Medium_Phone_API_36.1`
- 包名：`com.stonediary.mobile`

## 测试范围

1. 构建、同步、安装
2. 首次初始化与登录
3. 主导航切换
4. 今日页草稿保存
5. 完成态记录联动到历史 / 石头 / 复盘
6. Android -> Windows JSON 迁移与合并
7. Windows -> Android JSON 迁移与合并
8. Android 设置页 JSON / Markdown 导出
9. 修复项回归验证

## 合并规则验收点

- 日记按 `entryDate` 合并
- 同日期冲突时保留 `updatedAt` 更新的记录
- 石头按 `name` 合并
- 复盘按 `reviewType + periodStart + periodEnd` 合并
- 重复导入同一份快照时不重复写入

## 通过标准

- 所有核心链路无崩溃、无白屏
- Android 与 Windows 迁移后的统计结果一致
- 导出文件结构完整、内容可读
- 回归项验证通过
