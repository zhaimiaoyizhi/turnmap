# ChatMap

[English](README.md) | [中文](README.zh-CN.md)

把 ChatGPT 对话转成可编辑的思维导图。

ChatMap 是一个优先面向 Edge 的浏览器扩展，用于把当前 ChatGPT 对话映射成可视化图谱。每一轮问答会成为一个节点。节点可以跳回 ChatGPT 原文，也可以被编辑、链接、AI 总结、导出，并在之后恢复继续整理。

> 状态：早期预览版。ChatMap 尚未发布到 Edge Add-ons 或 Chrome Web Store。目前可以从源码手动安装，或从 GitHub Release 下载预览包。

## 适用场景

ChatMap 适合：

- 个人学习与复习。
- 长 ChatGPT 对话导航。
- 在单个对话内做研究、写作和知识整理。

当前版本只服务于当前打开的 ChatGPT 对话。跨多个对话的全局知识图谱不属于首发版本范围。

## 功能亮点

- **对话地图**：把当前 ChatGPT 对话转成节点图。
- **跳回原文**：点击节点即可回到 ChatGPT 中对应的问答位置。
- **可编辑图谱**：编辑标题、摘要、标签、状态、笔记、隐藏节点和链接。
- **语义链接**：不同关系类型使用不同颜色，重要链接可以加粗强调。
- **AI 辅助**：总结节点，并建议高置信度语义链接。
- **多种视图**：Side Panel、Full Page 和 Float。
- **Settings Page**：在图谱工作区之外管理 AI、界面默认值、launcher、Float 和更新偏好。
- **ChatGPT launcher**：ChatGPT 页面右侧的小启动球。左键打开 ChatMap，右键打开设置。
- **多种布局**：Single-side、Radial、Matrix 和 Two-sided。
- **导入导出**：ChatMap JSON、Obsidian Canvas、Markdown、SVG 和 PNG。
- **本地优先存储**：每个对话的图谱状态保存在浏览器本地配置中。

## 当前视图

| 视图 | 用途 |
| --- | --- |
| Side Panel | 在 Edge 侧边栏中与 ChatGPT 并排使用。 |
| Full Page | 使用更大的图谱画布，并保持与源 ChatGPT 标签页联动。 |
| Float | 在 ChatGPT 页面内使用紧凑的悬浮导航器。 |
| ChatGPT Launcher | 在 ChatGPT 页面右侧快速打开 ChatMap 或设置。 |

## 公开发布前计划

这些功能计划在更广泛公开发布前完成：

- **Update Notice**：当 GitHub Release 或商店版本有更新时提示用户。

## 从源码安装

要求：

- Node.js
- Microsoft Edge
- ChatGPT 网页会话

构建：

```powershell
npm install
npm.cmd run build
```

在 Edge 中加载：

1. 打开 `edge://extensions`。
2. 启用 Developer mode。
3. 点击 Load unpacked。
4. 选择 `<project-root>\dist`。
5. 打开一个 ChatGPT 对话。
6. 从扩展按钮或 Edge 侧边栏打开 ChatMap。

## 从 GitHub Release 安装

对于预览版，可以从 GitHub Releases 下载 zip，解压后在 Edge 开发者模式中加载解压后的文件夹。

GitHub/unpacked 安装需要手动更新。真正适合普通用户自动更新的路径是浏览器插件商店分发。

## 基础使用

1. 打开一个 ChatGPT 对话。
2. 打开 ChatMap。
3. 点击 Refresh 读取完整当前对话。
4. 选择布局。
5. 点击节点跳回 ChatGPT 原文。
6. 根据需要编辑节点或创建链接。
7. 使用 Files 导出或导入图谱。

## AI 功能

ChatMap 支持提供 OpenAI-compatible `/chat/completions` API 的服务商。

内置预设：

- OpenAI
- DeepSeek
- Custom compatible endpoint

AI 功能：

- **Summarize**：生成紧凑的节点标题和摘要。
- **Suggest Links**：在非相邻且强相关的节点之间建议语义链接。
- **Auto summarize**：启用后自动总结新节点或默认节点。

API key 保存在用户本地浏览器扩展存储中，不会提交到本仓库。

响应格式要求见 [AI Provider Guide](docs/ai-provider-guide.md)。

## 隐私

默认情况下，ChatMap 将对话图谱保存在浏览器扩展本地存储中。AI 功能会把选定的对话文本发送到用户配置的 provider。导出文件由用户自行控制。

详见 [Privacy Statement](docs/privacy-statement.md)。

## 权限

ChatMap 当前预览版请求以下必要权限：

- `activeTab`、`tabs` 和 `scripting`：用于识别当前 ChatGPT 标签页、必要时注入 content script、打开 Full Page，并跳回原始对话节点。
- `sidePanel`：提供 Edge 侧边栏界面。
- `storage`：在本地保存图谱、设置、AI provider 配置、launcher 位置和 Float 状态。
- `webRequest`：在可用时辅助读取 ChatGPT backend 请求，从而更可靠地提取完整当前对话。
- `chatgpt.com`、OpenAI、DeepSeek 的 host access。
- 自定义 OpenAI-compatible provider 使用 optional host access，仅在用户配置自定义 endpoint 时请求。

详见 [Permission Review](docs/permissions-review.md)。

## 开发

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
npm.cmd run package
```

`npm.cmd run package` 会在 `release/` 中生成 zip 包。

## 项目结构

```text
src/content       ChatGPT 提取、跳转、Float、launcher 相关代码
src/side-panel    ChatMap 主界面
src/full-page     Full Page 入口
src/background    MV3 service worker
src/shared        共享消息和类型定义
docs              用户、开发者、隐私和发布文档
scripts           构建和打包辅助脚本
```

## 文档

- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)
- [AI Provider Guide](docs/ai-provider-guide.md)
- [Privacy Statement](docs/privacy-statement.md)
- [Permission Review](docs/permissions-review.md)
- [Release Readiness](docs/release-readiness.md)
- [GitHub Release Plan](docs/github-release-plan.html)

## 已知限制

- ChatGPT 页面和 backend 行为可能随时变化。
- 对话中出现重复问题时，跳转精度可能下降。
- GitHub/unpacked 安装无法由扩展自身静默自动更新。
- 商店发布可能需要 PNG 图标和额外隐私材料。
- 自定义 AI provider 依赖 OpenAI-compatible 请求与响应格式。

## 路线图

- `0.1.x`：稳定提取、跳转、存储、AI JSON 处理和 Float 行为。
- `0.2.0`：加入 Update Notice，并增强 ChatGPT 兼容性。
- `0.3.0`：改进主题分组、语义链接、聚类和批量编辑。
- `0.4.0`：准备商店素材、图标集、隐私材料和发布自动化。
- `1.0.0`：稳定公开版本。

## 贡献

欢迎通过 GitHub Issues 提交 bug、功能建议和 AI provider 兼容性报告。

提交 pull request 前请运行：

```powershell
npm.cmd run typecheck
npm.cmd run build
```

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

不要提交 API key、私人对话导出、浏览器配置数据，或包含私人对话内容的截图。

详见 [SECURITY.md](SECURITY.md)。

## 许可证

MIT。见 [LICENSE](LICENSE)。
