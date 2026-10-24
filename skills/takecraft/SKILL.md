---
name: takecraft
description: 用本地 Takecraft 将品牌文案、功能点和可选截图/音乐制作成二维产品动效 MP4，或修改已有 project.json。支持三套主题和可复用动作。
---

# Takecraft

Agent 提供内容与动画意图，固定工具编排、渲染、混音与检查。普通制片优先使用 compose；需求能用现有参数表达时，不改工具源码。

## 找到同版本工具

以当前 SKILL.md 所在目录为 Skill 目录，运行 `node "<Skill目录>/scripts/run.mjs" <命令> --json`。Skill 可独立安装；入口读取旁边的 runtime.json，通过 npm 获取并缓存准确版本，不依赖源码 checkout 或全局 takecraft。保留当前工作目录；作品和素材使用绝对路径更清楚。

首次安装要求 Node.js >=22.20（包含 npm）、FFmpeg/ffprobe。运行 `version --json` 核对 runtime.json，再运行 `setup --json`；setup 复用已有 Chrome，或下载匹配的 Chromium。缺少 Node/FFmpeg 时报告检查结果；在用户安装请求授权范围内，可用已有 Homebrew 安装 `node@24`、`ffmpeg`，不要为普通制片擅自替换用户环境。首版只验收 macOS + Codex。

日常制片先运行 `doctor --json`，再用 `catalog --kind all --summary --json` 发现动作、主题和配方。首次获取或缓存缺失时需要联网；失败保留错误，不换成 latest 或其他全局版本。不要在制作过程中更新工具。

更新时从 PlonGuo/takecraft 最新正式 GitHub Release 获取固定 tag，用 skills CLI 安装该 tag 的 Skill，再运行上述检查。安装前检查 `~/.agents/skills/takecraft`、`${CODEX_HOME:-~/.codex}/skills/takecraft` 和项目 `.agents/skills/takecraft`；同名自定义 Skill 或源码链接不能直接覆盖。先保留旧内容，明确来源后迁移。安装后当前会话显式读取新 SKILL.md；后续若未自动识别，提示新建 Codex 会话。完成报告包括 Skill 来源/tag、作用域、工具版本和实际检查结果。

## 从需求制作产品片

1. 获取品牌、主标题、标语、2–3 个功能点、行动文案及风格。用户允许时补写简短文案；不把虚构产品或占位图冒充用户素材。
2. 查询 `describe brief --json`，按实际字段约束写入独立的 brief.json。主题 paper 为柔和卡片，midnight 为深色列表，editorial 为大字海报；style 可选 calm/snappy/playful。文案由模板自动折行，不插入硬换行。截图、音乐必须是已有本地文件，其相对路径按 brief 所在目录解析。
3. 调用 `compose /absolute/brief.json /absolute/new-film --json`。只能用新目录；工具会生成 project.json 并复制素材。不要每次手写底层属性轨道。
4. 调用 `preview /absolute/new-film/project.json --json` 检查关键帧，再 `build /absolute/new-film/project.json --json`。进度在 stderr，stdout 是一次紧凑结果；不要逐帧轮询。
5. 读取质量报告，检查实际成片。交付 MP4、预览和字幕的可点击路径；明确哪些视觉或听感未实际验收。技术通过不代表节奏和美感通过。

## 精调与错误处理

- `project.json` 是生成后的编辑入口，brief 的改动不会自动同步过去。重编排用 compose 输出到新目录；精调直接改 project，随后 validate/preview/build。
- 按需查询 `describe action:enter`、`action:morph`、`action:focus` 等。保留跨节拍对象 id。同属性动作不能重叠，focus 不与手写 camera 混用。复杂清单参考 [清单约定](references/project.md)，精确字段以 `describe project` 为准。
- 失败按 Issue 的 code/path 修正需求或清单；最多两轮自动修正，仍失败则保留错误并报告。用户要求“只测试工具”时直接报告工具缺陷，不修改源码。
- `status FILM --json` 查看最近运行；中断后用相同 build 加 `--resume`。完整阶段自动验证缓存并复用，改音乐可复用画面。
- 不手改 timeline、帧序列或运行报告；不默认清理旧作品。增加尚不存在的效果属于工具开发，需要符合用户当次任务范围。

v0 默认配方为 15 秒、1080p30。支持本地音乐/旁白、基础音效和定时 SRT；没有自动配音、逐词对齐、4K60、运动模糊或云渲染。素材不自动上传，不开通付费服务。
