# Takecraft 动作工具与主题 Implementation Plan

> **For agentic workers:** 使用 superpowers:executing-plans 在当前会话直接实施。用户已授权按评估调整后开始；不重复请求启动确认。进度记在本计划与对应 scratch ledger，不自动提交或推送。

**Goal:** Agent 提供简短内容和动作参数，由可复用工具生成三种主题的完整产品动效视频。

**Architecture:** Brief → 配方/主题 → Project.actions → 确定性轨道 → Motion 采样 → 既有视频流水线。CLI 提供发现、编排与生产，Skill 包装后置。

**Tech Stack:** 现有 TypeScript/pnpm/Zod/Playwright/FFmpeg，新增锁定版本 motion@14.6.0。

**Spec:** [设计](2026-10-24-motion-tools-design.md)。

## Global Constraints

- 保留 M1 清单、原曲线和命令兼容性；输出仍为 15 秒 1080p30。
- 正式文档只在 docs/plan；沿用普通分支 feat/motion-themes。
- 路径明确、仅本地素材、不覆盖作品目录、不新增模型调用。
- 所有变化由时间决定；动作和原始轨道的冲突必须拒绝。
- Motion 及编译/样式变化进入视觉缓存；不声称未经测量的 token 节省。
- 作品目录 /Users/plonguo/Takecraft Videos；Skill 改写后置。

## Review Focus

1. 同一对象先入场再变形再退场，后一个动作不得修改之前的初始状态（Task 1/2）。
2. 动作与手写轨道重叠、错峰尾部越界、镜头重叠必须定位错误（Task 1）。
3. 随机时间顺序、多个 spring 参数与动作端点不得产生时钟或状态依赖（Task 2）。
4. 中文长标题、3 个功能点、不同布局和素材有/无时均须可读，不丢字（Task 3/5）。
5. 从其他 cwd 调用、含空格的路径、已有目录与失效素材不能覆盖旧作品；换主题使缓存失效（Task 4/6）。

## Task 1: 动作契约与展开

**Files:** 新建 src/motion/schema.ts、presets.ts、registry.ts；修改 src/project/schema.ts、validate.ts、compile.ts、types.ts；测试 tests/unit/actions.test.ts。
**Interfaces:** ActionSchema / Action；`expandActions(p:Project): {actors:Actor[];tracks:Track[];camera:Project['camera'];issues:Issue[]}`；`listActions()` / `describeAction(name)`。

- [x] 写失败测试：入场前隐藏、错峰时间、morph 结束状态衔接、unknown actor、reveal 非文字、同属性冲突、尾部越界、focus 根对象/重叠/手写镜头限制。
- [x] 运行 `pnpm exec vitest run tests/unit/actions.test.ts`，Expected: 新契约/展开行为失败。
- [x] 实现 schema 与动作展开。语义校验共享底层轨道检查，不递归调用自身；编译使用规范化后的展开结果，保留声明供追踪。
- [x] 运行上述测试及 typecheck，Expected: 全通过。记录决定，不提交。

## Task 2: Motion 采样与运行时一致性

**Files:** package.json、pnpm-lock.yaml、src/runtime/sample.ts、src/pipeline/build.ts；tests/unit/sample.test.ts、tests/unit/cache.test.ts、tests/browser/actions.test.ts。
**Interfaces:** Ease 支持 `{type:'spring',bounce:number}`；现有 `ease(u,kind)` / `sample(initial,tracks,t)` 保持签名。运行时仍只接受 Timeline。

- [x] 写失败测试：Motion 曲线、准确端点、倒序/乱序一致；浏览器同一 surface 入场/变形后乱序 seek 像素和实体身份一致。
- [x] 运行目标测试，Expected: 新 spring 配置与运行时用例失败。
- [x] 安装固定版本 Motion；以其 spring/stagger 实现新动作，保留 legacy 曲线；缓存把依赖版本纳入 key。
- [x] 运行目标 suite/typecheck，Expected: 全通过。

## Task 3: 主题与需求编排器

**Files:** 新建 src/themes/registry.ts、src/recipes/brief.ts、src/recipes/product-launch.ts；修改 src/project/schema.ts、src/components/registry.ts；tests/unit/composition.test.ts、tests/browser/themes.test.ts。
**Interfaces:** `BriefSchema`、`Brief`；`composeProductLaunch(brief:Brief):Project`；`listThemes()` / `describeTheme(name)`。三主题 paper/midnight/editorial；Actor 增加显式边框/阴影/字距样式，旧默认不变。

- [x] 写失败测试：三主题含不同布局/风格；2–3 个功能、文字长度限制；保留中文/HTML纯文本；无手写 tracks 的 Project 经编译产生完整时间线。
- [x] 运行测试，Expected: 新模块/行为失败。
- [x] 实现固定布局、保守文字适配、五类动作编排、配套音效与字幕，支持可选截图；不写临时SVG代替工具组件。
- [x] 浏览器检查全部节拍与过渡中点无溢出、三主题截图不同；运行 unit/browser suite，Expected: 通过。

## Task 4: Agent-facing CLI

**Files:** src/cli/index.ts、新建 src/cli/compose.ts；tests/unit/cli.test.ts、tests/e2e/compose.test.ts；examples/product-launch-v2/brief.json。
**Interfaces:** `composeProject(briefPath:string,directory:string,theme?:string)` 返回简短结果；命令 `compose BRIEF DIRECTORY --theme NAME --json`；catalog --kind 与 describe action:/theme:/brief。

- [x] 写失败测试：发现 schema/example，简短 JSON stdout；从中文/空格路径 compose 并 validate；拒绝已有目录和缺图；素材按 brief 目录解析复制。
- [x] 运行目标 suite，Expected: CLI 新命令/行为失败。
- [x] 实现命令、路径处理与只创建全新作品目录；创建原创新示例 brief。
- [x] 运行 target suite/typecheck/build，Expected: 通过；旧 CLI 用例继续通过。

## Task 5: 实际视频质量与复用验收

**Files:** tests/e2e/motion-product.test.ts；样片只写用户作品目录和忽略的 artifacts。
**Interfaces:** 通过公开 CLI compose → preview → build → status；沿用 BuildResult 和 QualityReport。

- [x] 写并运行一条 15 秒新配方端到端验收，Expected: 450 帧、完整解码、有音轨、旧作品不变；故障时先修复再继续。
- [x] 用相同 brief 输出三主题到 /Users/plonguo/Takecraft Videos 的全新目录；全部技术检查通过。
- [x] 查看入场、展开、功能展示和结尾关键帧与连续帧；检查节奏/文字/层次，必要时调整配方后重验受影响项。
- [x] 保存交付清单、便于比较的播放入口、brief/生成配置字节数与动作统计；技术通过与主观评价分开。

## Task 6: 启动入口、文档和整体验证

**Files:** scripts/run.mjs、tests/e2e/launcher.test.ts、README.md、docs/usage.md、docs/plan/README.md。
**Interfaces:** `node /absolute/tool/scripts/run.mjs <CLI args>`，保留调用者 cwd 与 CLI 参数/退出码，工具位置从启动脚本推导。

- [x] 先测从无关 cwd 调用 catalog/describe、读取相对 brief 路径和错误退出码；Expected: 尚无入口时失败。
- [x] 实现薄启动脚本，文档写明当前命令和限制；不重写 Skill。
- [x] 运行 typecheck/build/全套测试/Git whitespace 检查，Expected: 全通过。做一次独立整体验收审阅，Critical/Important 只做一次定向修复并验证。
- [x] 更新计划/进度、保留唯一未提交工作与证据，交付实际视频路径和下一步建议；不自动推送。

## 完成记录

2026-10-24：六项任务完成。实施结束时变更保留在 feat/motion-themes，未提交、未推送；随后用户明确授权保存至 GitHub。最终 typecheck/build、26 文件 106 项测试及 diff whitespace 检查通过。独立整体验收提出的两项 Important 已经过失败回归、一次定向修复及全套复验。样片与证据见计划目录 README。

本机 gstack 缺专用浏览器，播放验收改用已有 Chrome 并成功。已检查关键帧与连续采样帧、实际播放与 seek；未独立完成听感验收，不将自动检查等同于主观完美。实施结束时保留了 scratch ledger，因为当时尚未提交，不能按已归档入 Git 的前提删除唯一工作记录；后续 GitHub 保存状态见[计划与进度](README.md)。

GitHub 保存前复验：typecheck、build、26 文件 106 项测试通过（123.31 秒），独立只读审阅无阻塞。此次保存源码分支供用户试用，不发布安装包、不合并 main；沿用项目现有 package.json 版本与 docs/plan 进度约定，不另建 VERSION 或重复任务清单。
