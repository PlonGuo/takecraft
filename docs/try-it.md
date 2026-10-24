# 第一次试用 Takecraft

这次试用验证：Agent 能否仅提供内容并调用工具，就生成一条完整产品片。像填写制作单，把制作步骤交给固定工具。

## 在新 Codex 对话中试用

先按 [README](../README.md) 让 Codex 安装最新正式版本的 Skill，并通过 setup/doctor；新会话确认能够使用 takecraft。随后粘贴：

```text
用 takecraft 为「星笺」做一条 15 秒产品介绍视频。
主题 midnight；主标题「把零散想法，变成清晰行动」。
标语「记录、整理，然后开始」。
功能：随手记录、自动归类、行动清单，各写一句简短说明。
结尾「从一个想法开始」。
作品放在 ~/Takecraft Videos 下的全新子目录。
使用现有工具，不修改源码或编写动画算法；失败保留错误并报告。
完成后给我可点击的 MP4、预览和质量报告路径。
```

## 在终端手动试用

保存 [需求示例](../examples/product-launch-v2/brief.json) 为自己的 brief.json 并修改品牌文案，然后运行：

```sh
npx --yes takecraft@0.2.3 setup --json
npx --yes takecraft@0.2.3 compose ./brief.json ./my-first-film --theme midnight --json
npx --yes takecraft@0.2.3 build ./my-first-film/project.json --json
```

开发 checkout 可将命令前缀换为 `node /absolute/takecraft/scripts/run.mjs`，使用源码版本；独立 Skill 则按其 runtime.json 调用正式 npm 版本。

成功结果的 `artifacts.video.path` 是 MP4，`artifacts.quality.path` 是技术质量报告。成片在作品目录隐藏的 `.takecraft/runs/` 子目录。换主题用 `paper` 或 `editorial`，并使用新作品目录；compose 不覆盖已有目录。原项目再次 build 会验证并复用缓存。

## 看什么、反馈什么

- 内容：品牌与功能是否正确，文字有没有缺失或重叠。
- 动作：窗口展开、卡片入场、镜头与结尾收拢是否顺畅。
- 节奏：文字是否来得及读，音效是否突兀。
- 复用：Agent 是否只编写了需求文件并调用工具，没有改源码。

反馈尽量标出“哪个视频、第几秒、实际效果、期望效果”。若生成失败，附上错误结果中的 code、path 与 message。

当前范围是 15 秒、1080p30、2–3 个功能点；文案由模板自动折行，不接受手动换行。可选截图和音乐使用本地文件路径。质量报告检查技术条件，节奏和美感需要你看成片判断。

自检：换品牌是否仍可直接出片？切换主题是否改变了布局？生成过程中是否需要改工具源码？
