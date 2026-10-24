# 第一次试用 Takecraft

这次试用验证：Agent 能否仅提供内容并调用工具，就生成一条完整产品片。像填写制作单，把制作步骤交给固定工具。

## 在新 Codex 对话中试用

打开本地仓库 `/Users/plonguo/Git/takecraft`，粘贴下面的提示词，把品牌和功能换成你的真实需求。v0 Skill 已使用新配方；已安装用户可直接调用 takecraft Skill。下方绝对路径示例用于本机开发 checkout，安装版入口见 README。

```text
请用现有 Takecraft 工具为「星笺」做一条 15 秒产品介绍视频。
主题：midnight（深色科技）。
主标题：把零散想法，变成清晰行动。
标语：记录、整理，然后开始。
功能：随手记录、自动归类、行动清单。请为每项写一句简短说明。
结尾文案：从一个想法开始。

工具入口：/Users/plonguo/Git/takecraft/scripts/run.mjs
先调用 doctor 和 describe brief，按 schema 生成需求文件，
再用 compose、preview、build 完成制作。
作品放在 /Users/plonguo/Takecraft Videos 下的全新子目录。
此次只测试现有工具：不要修改工具源码、编写新动画算法或安装 Skill。
失败时保留错误并报告，不要自行修改工具来掩盖问题。
完成后给我可点击的 MP4、预览和质量报告路径。
```

## 在终端手动试用

先从仓库复制一份 [需求示例](../examples/product-launch-v2/brief.json) 到作品根目录，改其中的品牌、文案与功能点。下面命令中的 `cp -n` 保留已经存在的文件。

```sh
cd /Users/plonguo/Git/takecraft
mkdir -p "/Users/plonguo/Takecraft Videos"
cp -n examples/product-launch-v2/brief.json "/Users/plonguo/Takecraft Videos/试用需求.json"
```

保存需求后运行：

```sh
node scripts/run.mjs compose "/Users/plonguo/Takecraft Videos/试用需求.json" "/Users/plonguo/Takecraft Videos/我的第一次试用" --theme midnight --json
node scripts/run.mjs build "/Users/plonguo/Takecraft Videos/我的第一次试用/project.json" --json
```

成功结果中的 `artifacts.video.path` 是 MP4 路径，`artifacts.quality.path` 是技术质量报告路径。复制路径到 Finder 的“前往文件夹”即可定位。视频在作品目录的隐藏 `.takecraft/runs/` 子目录中。

换主题时，把 `--theme` 改为 `paper`（纸间）或 `editorial`（构想），并使用新的作品目录。compose 不覆盖已有目录；修改需求后也应重新 compose 到新目录。原项目重复 build 则会验证并复用缓存。

## 看什么、反馈什么

- 内容：品牌与功能是否正确，文字有没有缺失或重叠。
- 动作：窗口展开、卡片入场、镜头与结尾收拢是否顺畅。
- 节奏：文字是否来得及读，音效是否突兀。
- 复用：Agent 是否只编写了需求文件并调用工具，没有改源码。

反馈尽量标出“哪个视频、第几秒、实际效果、期望效果”。若生成失败，附上错误结果中的 code、path 与 message。

当前范围是 15 秒、1080p30、2–3 个功能点；文案由模板自动折行，不接受手动换行。可选截图和音乐使用本地文件路径。质量报告检查技术条件，节奏和美感需要你看成片判断。

自检：换品牌是否仍可直接出片？切换主题是否改变了布局？生成过程中是否需要改工具源码？
