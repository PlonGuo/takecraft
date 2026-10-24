---
name: takecraft
description: 用本地 Takecraft 将品牌文案、功能点和可选截图/音乐制作成二维产品动效 MP4，或修改已有 project.json。支持三套主题和可复用动作。
---

# Takecraft

Agent 提供内容与动画意图，固定工具编排、渲染、混音与检查。普通制片优先使用 compose；需求能用现有参数表达时，不改工具源码。

## 找到同版本工具

解析当前 SKILL.md 的真实路径，其所在 `skills/takecraft/` 的上两级就是工具根目录。运行 `node <工具根目录>/scripts/run.mjs <命令> --json`。安装器把代码与 Skill 放在同一版本目录，不要另找不同版本的全局命令。调用时保留当前工作目录；作品和素材使用绝对路径更清楚。

先运行 `doctor --json`。缺少依赖时报告具体检查结果，并按工具 README 安装；不在制片过程中升级工具或改动用户环境。`catalog --kind all --summary --json` 用于发现动作、主题和配方。

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
