# StoneDiary

StoneDiary 是一款本地离线的结构化日记与复盘软件，帮助用户围绕“事件、反应、欲望、恐惧、解释、模式、行动”进行持续记录与自我观察。

项目强调本地优先、离线可用和个人隐私保护，适合个人成长记录、情绪追踪、行为模式复盘等场景。

## 功能概览

- 结构化日记记录
  - 按固定步骤记录当天的重要事件与内在反应
- 历史记录管理
  - 查看、编辑、删除历史日记
- 石头库
  - 沉淀重复出现的模式，支持查看、编辑、归档和关联日记
- 周复盘 / 月复盘
  - 自动统计阶段性数据并填写复盘总结
- 多账号本地使用
  - 每个账号对应独立数据库
- 本地密码保护
  - 支持账号密码登录与管理员密码重置
- 数据导出
  - 支持 JSON、Markdown 导出
- 历史数据迁移导入
  - 支持导入历史 JSON 数据，并与当前数据按时间合并
- 数据库备份 / 恢复
  - 支持普通备份与加密备份
- 完全离线
  - 主要数据保存在本地，不依赖云端服务

## 技术栈

- `Tauri`
- `React`
- `TypeScript`
- `SQLite`

## 最新安装包

当前最新安装包已随仓库提供，位置在：

- [release-assets/2026-03-14-v0.1.1-history-import-merge](./release-assets/2026-03-14-v0.1.1-history-import-merge)
- [stone-diary.exe](./release-assets/2026-03-14-v0.1.1-history-import-merge/stone-diary.exe)
- [StoneDiary_0.1.1_x64_en-US.msi](./release-assets/2026-03-14-v0.1.1-history-import-merge/StoneDiary_0.1.1_x64_en-US.msi)
- [StoneDiary_0.1.1_x64-setup.exe](./release-assets/2026-03-14-v0.1.1-history-import-merge/StoneDiary_0.1.1_x64-setup.exe)

## 本地开发

1. 安装 `Node.js`、`npm`、`Rust` 与 Tauri 所需环境
2. 在项目目录执行 `npm install`
3. 运行开发环境：

```bash
npm run tauri dev
```

4. 构建桌面安装包：

```bash
npm run tauri build
```

## 仓库说明

当前仓库主要包含：

- 桌面端源码
- SQLite 本地数据结构
- 多账号本地登录与独立数据库实现
- 历史数据迁移导入与备份恢复能力
- Windows 安装包产物

## 许可证与使用说明

本项目仓库使用 [PolyForm Noncommercial 1.0.0](./LICENSE) 许可证。

补充中文说明如下：

- 本项目源码及其生成的可执行程序仅供个人学习、研究、体验和非商业传播使用
- 允许在保留许可证与声明的前提下免费传播
- 不得将本项目或其衍生版本用于销售、收费服务、商业培训、商业集成、商业交付或任何直接、间接盈利场景
- 未经明确授权，不得进行商业发行或二次商业开发

如需商业使用或授权合作，请另行获得明确授权。

## 路线图

- 优化 GitHub 首页展示
- 持续完善安装包发布流程
- 继续增强本地数据管理与迁移能力
