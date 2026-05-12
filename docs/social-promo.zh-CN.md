# ChatMap 社交平台宣传文案

我做了一个把 ChatGPT 长对话变成思维导图的浏览器插件：ChatMap。

如果你也经常遇到这种情况：

- 和 ChatGPT 聊了几十轮，回头找重点像在翻一卷很长的纸；
- 学习、写作、研究时，AI 给了很多材料，但结构散在对话里；
- 想把一段对话整理成复习提纲、知识网络或写作框架；
- 想跳回某一轮原文，但滚动半天才找到。

ChatMap 就是为这个场景做的。

它会把当前 ChatGPT 对话按“每一轮问答”转换成可编辑的思维导图节点。你可以：

- 点击节点，直接跳回 ChatGPT 原文；
- 编辑节点标题、摘要、标签和状态；
- 手动添加或删除节点关系；
- 用 AI 自动总结节点、建议强相关链接；
- 在 Single-side、Radial、Matrix、Two-sided 等布局之间切换；
- 用 Side Panel、Full Page 或 Float 模式查看；
- 导出为 ChatMap JSON、Obsidian Canvas、Markdown、SVG、PNG；
- 本地保存每个对话的图谱状态，之后继续整理。

现在它还是早期预览版，优先支持 Edge + ChatGPT 网页端。接下来计划继续做三件事：

1. 兼容更多网页端 AI，比如豆包、DeepSeek、Kimi、Gemini、Grok 等。
2. 兼容更多浏览器，比如 Chrome、Firefox。
3. 兼容更多 API Key 和模型服务商，让 AI 总结与自动链接更灵活。

我想把 ChatMap 做成一个真正适合学习、研究和长对话整理的工具：不是把 AI 对话当成一次性聊天记录，而是把它变成可以回看、编辑、连接和沉淀的知识地图。

项目已开源，欢迎试用、提 issue、提建议：

https://github.com/Zhaimiaoyizhi/ChatMap

如果你也有很多“聊完很有用，但过两天找不到结构”的 AI 对话，欢迎试试看。
