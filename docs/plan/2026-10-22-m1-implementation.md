# Takecraft M1 Implementation Plan

> **For agentic workers:** 使用 superpowers:executing-plans 在当前会话直接实施；逐任务验证并更新进度。用户指定正式计划目录为 `docs/plan/`，不创建重复计划。创建项目、初始提交和推送已获授权；后续提交/推送遵循用户当时的授权。

**Goal:** 用可编辑制作清单和固定工具链生成 15 秒、1080p30 的二维产品动效视频，并提供预览、声音、技术检查、阶段缓存和 Skill 入口。

**Architecture:** `project.json` 是唯一人工编辑的制作事实来源。编译器将素材与动作参数转换为确定性时间线；浏览器绘制画面，FFmpeg 处理声音和编码，CLI 管理全过程。Agent 只参与创意、清单修改和必要的新组件开发。

**Tech Stack:** Node.js 22 LTS、TypeScript、pnpm、Zod、Playwright、FFmpeg/ffprobe、Vitest；esbuild 打包浏览器运行时。使用实施时验证兼容的版本并提交 `pnpm-lock.yaml`。

**Spec:** [架构设计](2026-10-22-architecture.md)。本文仅细化 M1；M2/M3 不算本计划交付物。

## Global Constraints

- 单一 pnpm 工程，主要逻辑使用 TypeScript，M1 不引入 Python、数据库、云队列或在线编辑器。
- M1 输出 1920×1080、30 fps；15 秒验收片为 450 帧。目标时间区间为 `[0, duration)`。
- 第一版支持用户提供的音乐/旁白、定时 SRT 字幕和基础合成音效；不自动生成配音，不宣称逐词对齐。
- `--profile final` 在 M2 前返回 `PROFILE_UNSUPPORTED`，不把草稿伪装成 4K60。
- 任意时刻的画面由时间、清单、素材和固定运行环境决定；字体和图片必须就绪后截图。
- 只运行本机可信代码；清单不含可执行代码。渲染期间不下载远程素材，不新增隐式模型调用。
- 缓存包含输入内容、所用组件/运行时版本及相关工具版本；恢复前验证一致性和产物完整性。
- 技术检查失败时构建失败，保留报告；“未请求”的可选阶段不记为已完成。
- 不覆盖上一次成功产物；不提交密钥、依赖目录、临时日志或生成媒体。
- 独立实现代码与示例素材；不复制 onetake 受限代码、模板或指令。

## Review Focus

1. 同路径图片/字体内容被替换：必须失效相关缓存；Task 2、6 覆盖。
2. 中文长标题、缺字、特殊字符及空白输入：应安全显示或提供字段定位的错误；Task 1、3 覆盖。
3. 带空格/中文的路径、缺少浏览器/ffmpeg、外部程序非零退出：应给出可执行的诊断；Task 4、7 覆盖。
4. 音频/字幕越界、仅换音乐、非整帧时长：拒绝无效输入或按明确规则处理，不能音画截断；Task 2、5、6 覆盖。
5. 中断、损坏缓存、遗留锁和并发构建：不得误报成功或覆盖另一个任务；Task 6、8 覆盖。

## 文件与接口约定

主要文件按下列任务建立，避免空目录和没有调用方的抽象层。Task 1 建立公共类型，后续任务不得悄悄重命名接口。

| 类型 | 约定 |
| --- | --- |
| `Issue` | `{ code, path, message, severity: 'error' | 'warning' }` |
| `Project` | 从 Zod schema 推导；字段对应架构第 4 节，`schemaVersion: 1` |
| `AssetManifest` | 按 asset id 索引的本地资源记录，含内容哈希、类型、尺寸/时长/字体信息 |
| `Timeline` | 已解析的演员、属性轨道、镜头、音效事件、字幕和检查声明；含 `duration`、`fps`、`frameCount` |
| `Runtime` | `ready(): Promise<void>`、`seek(seconds): Promise<void>`、`inspect(seconds): Promise<FrameInspection>`、`dispose(): void` |
| `Artifact` | `{ path, sha256, bytes }`；产物描述，不能用一个 success 布尔值代替 |
| `BuildResult` | `{ runId, status, stages, artifacts, issues, reportPath }`；不把视频/base64/完整日志放入 JSON 响应 |

尚未列出的具体类型字段由实现者在对应任务中决定并通过导出类型共享；不能让浏览器和 CLI 各自维护同名但不同结构的类型。

## Task 1: 清单契约与工程基础

**Files:** `package.json`、`pnpm-lock.yaml`、`tsconfig.json`、`vitest.config.ts`、`src/project/schema.ts`、`src/project/types.ts`、`src/project/validate.ts`、`tests/unit/project.test.ts`、`tests/fixtures/project.ts`。

**Interfaces:** 输出 `ProjectSchema`、`Project`、`Issue`，以及 `validateProject(input: unknown): { project?: Project; issues: Issue[] }`。语义校验禁止重复 id、未知对象引用、负数/非有限时间和相互覆盖的同属性轨道；不访问浏览器。

- [x] 初始化 TypeScript 严格模式工程，配置 `pnpm build`、`pnpm typecheck`、`pnpm test:unit`、`pnpm test:browser`、`pnpm test:e2e`。分别选择 unit/browser/e2e 测试目录；未编写的 suite 不当作通过的验收。安装依赖并锁定版本。
- [x] 写失败用例：有效中文项目保留文本；空白标题报字段错误；重复 actor id、未知 asset id、非有限时间、冲突轨道返回对应 `Issue`；字符串中的 HTML 只是文本，不是执行内容。
- [x] 运行 `pnpm test:unit -- tests/unit/project.test.ts`，确认目标用例因未实现的校验行为失败。
- [x] 实现 schema、导出类型与语义校验；从 schema 导出 JSON Schema，避免维护第二份参数真相。
- [x] 运行上述测试和 `pnpm typecheck`，预期全部通过。进度记录 schema 决策及验证结果。

## Task 2: 素材检查与时间编译

**Files:** `src/project/assets.ts`、`src/project/compile.ts`、`src/project/hash.ts`、`tests/unit/assets.test.ts`、`tests/unit/compile.test.ts`、`tests/fixtures/assets/`。

**Interfaces:** 消费 `Project`；输出 `prepareAssets(project: Project, projectDir: string): Promise<AssetManifest>`、`compileProject(project: Project, assets: AssetManifest): Timeline`。缺图和无效资源通过含 `Issue` 的统一错误返回；Task 7 负责格式化。

- [x] 写失败用例：同路径文件换内容得到新哈希；缺图、路径不存在有准确 asset id；带中文/空格的路径可读；错误文件类型被拒绝。
- [x] 写时间用例：15 秒×30 fps 得 450 帧；总时长必须落在整帧边界，否则报 `DURATION_NOT_FRAME_ALIGNED`；相邻轨道共享端点合法，区间内部冲突失败；M1 使用显式轨道，不含命名动作展开器。
- [x] 写声音约束用例：提供的旁白时长超过分配区间报错；字幕越界报错；没有旁白不会凭空修改总时长。
- [x] 运行 `pnpm test:unit -- tests/unit/assets.test.ts tests/unit/compile.test.ts` 观察失败，再实现内容哈希、资源测量、时间编译。
- [x] 仅允许本地 asset 文件；读取 `realpath` 确认被允许的资源，静态服务不得变成任意磁盘文件服务器。不在 JSON 中拼接 shell 字符串。
- [x] 同一测试命令通过，并运行 `pnpm typecheck`。保留来源说明，不把测量缓存与路径永久绑定。

## Task 3: 连续舞台、组件与预览

**Files:** `src/runtime/index.ts`、`src/runtime/sample.ts`、`src/runtime/camera.ts`、`src/runtime/inspect.ts`、`src/components/registry.ts`、`src/components/text.ts`、`src/components/image.ts`、`src/components/surface.ts`、`src/components/cursor.ts`、`src/components/actions.ts`、`src/render/serve.ts`、`src/render/preview.ts`、`tests/unit/sample.test.ts`、`tests/browser/runtime.test.ts`。

**Interfaces:** 消费 `Timeline` 与准备好的资源；输出 `createRuntime(root: HTMLElement, timeline: Timeline): Runtime`、`listComponents()`、`describeComponent(type: string)`。组件目录由实际注册组件生成；`createPreview(timeline, assets, outDir): Promise<{ html: Artifact; stills: Artifact[] }>` 供 CLI 和 build 共用。

- [x] 写采样用例：轨道前使用初始值、轨道内插值、轨道后保持结束值，边界准确；属性解析采样不依赖播放顺序；没有物理积分状态。
- [ ] 写浏览器失败用例：顺序与乱序 seek 在同一时间的 PNG 一致；同一 surface 跨三个节拍保持同一个 DOM 实体；文本通过 `textContent` 渲染。
- [ ] 写浏览器用例：中文字体加载/缺字可诊断，长标题溢出可定位；必须可见的对象出画返回 id 和时间；缺少图片/字体时 `ready()` 拒绝而不是继续截图。字体测试使用已授权且带许可的测试字体，不依赖每台机器的默认字体。
- [x] 分别运行 `pnpm test:unit -- tests/unit/sample.test.ts` 和 `pnpm test:browser -- tests/browser/runtime.test.ts` 观察对应行为失败，再实现运行时、组件、测量与本地预览。
- [x] 通过同样命令，并实际查看关键帧。完成容器展开、镜头推进、对象收拢三种连续衔接；浏览器时间由 seek 驱动，避免 CSS 自主动画改变结果。

## Task 4: 浏览器渲染与视频编码

**Files:** `src/render/browser.ts`、`src/render/frames.ts`、`src/render/encode.ts`、`src/render/process.ts`、`tests/unit/process.test.ts`、`tests/browser/render.test.ts`、`tests/e2e/render.test.ts`。

**Interfaces:** 消费 `Timeline`、资源和 Runtime；输出 `renderFrames(input: RenderInput): Promise<FrameManifest>`、`encodeVideo(frames: FrameManifest, output: string): Promise<Artifact>`。`RenderInput` 至少含输出目录、指定浏览器、timeline 和 assets。FrameManifest 明确记录有序帧、数量、尺寸、fps、输入指纹。

- [x] 写失败用例：外部命令错误保留 stderr/exit code；带空格/中文路径无 shell 插值；缺少可执行程序明确失败。
- [ ] 写最小渲染集成用例：固定 1 秒、30 fps 得到 30 张就绪截图；渲染一次 seek 异常必须失败；最后一帧在 `duration - 1/fps`。
- [x] 写编码用例：ffprobe 检查 1920×1080、30 fps、1 秒；FFmpeg 完整解码无错误。禁止以纯 mock 代替该项验收。
- [x] 先运行对应 suite 看到失败，再实现单浏览器渲染、有序 PNG 帧和 H.264 编码；截图请求必须等待 ready/seek。单个阶段退出清理自己持有的浏览器和服务。
- [x] 运行 `pnpm test:unit -- tests/unit/process.test.ts`、`pnpm test:browser -- tests/browser/render.test.ts`、`pnpm test:e2e -- tests/e2e/render.test.ts`，预期通过。M1 保持单浏览器，运动模糊和并行留给 M2。

## Task 5: 声音、字幕与技术检查

**Files:** `src/audio/sfx.ts`、`src/audio/mix.ts`、`src/audio/subtitles.ts`、`src/quality/preflight.ts`、`src/quality/verify.ts`、`src/quality/media.ts`、`tests/unit/audio.test.ts`、`tests/unit/subtitles.test.ts`、`tests/e2e/quality.test.ts`。

**Interfaces:** `mixAudio(timeline, assets, outDir): Promise<Artifact | null>`、`writeSubtitles(timeline, outDir): Promise<Artifact | null>`、`verifyArtifacts(input: VerifyInput): Promise<QualityReport>`。`null` 只表示未请求；执行失败必须抛出或返回有明确错误的结果。

- [x] 写音效和混音用例：固定参数生成固定 PCM 音频；事件按时间放置；负时间/超片长报错；最终音轨时长按画面长度补足或裁剪已声明可裁剪的音乐，旁白不静默截断。
- [ ] 写字幕用例：中文和多行文本可导出 SRT，时间按毫秒格式化；越界、反向区间和未声明允许的重叠拒绝。
- [x] 写成片检查用例：规格不符、音频峰值超过 -3 dBFS、损坏视频、缺失预期音轨必须失败；无音频需求时不把“无音轨”误判为失败。
- [x] 运行 `pnpm test:unit -- tests/unit/audio.test.ts tests/unit/subtitles.test.ts` 和 `pnpm test:e2e -- tests/e2e/quality.test.ts` 看到失败，再实现基础音效、混音、SRT、预检与成片检查。
- [x] 运行同样命令通过；混音在 AAC 编码后的成片上复查峰值。报告不输出未经验证的审美评分。

## Task 6: 构建编排、缓存与恢复

**Files:** `src/pipeline/build.ts`、`src/pipeline/cache.ts`、`src/pipeline/state.ts`、`src/pipeline/lock.ts`、`src/pipeline/mux.ts`、`tests/unit/cache.test.ts`、`tests/unit/state.test.ts`、`tests/e2e/recovery.test.ts`。

**Interfaces:** 消费 Task 1–5 的公开函数；输出 `buildProject(projectPath: string, options: BuildOptions): Promise<BuildResult>` 和 `readStatus(projectDir: string): Promise<BuildStatus>`。BuildOptions 包括 profile、browser、resume；不允许从清单执行任意命令。

- [x] 写缓存用例：相同输入复用已验证产物；仅音乐变化不调用截图阶段；画面文字改变会重新渲染；同路径换图、字体/组件/浏览器版本变化失效画面缓存。
- [x] 写恢复用例：成功标记存在但文件缺失/损坏时重做；中断只恢复输入指纹一致的阶段；新输入不得复用旧帧；构建之间输出路径不覆盖。
- [x] 写锁用例：同一项目并发构建被拒绝；活跃进程锁不能被抢占；遗留锁先核实进程状态再恢复；验证和发布状态使用原子写入。
- [x] 写失败用例：瞬时浏览器关闭最多额外重试 2 次；无效清单/缺图不重试；持续失败返回具体阶段并保留上次成功产物。
- [x] 运行 `pnpm test:unit -- tests/unit/cache.test.ts tests/unit/state.test.ts` 与 `pnpm test:e2e -- tests/e2e/recovery.test.ts` 观察失败，再实现阶段依赖、独立音画缓存、产物验证、锁与恢复。
- [x] 同样命令通过。全阶段产生唯一运行目录和简短 manifest；大日志不塞入 CLI JSON。

## Task 7: CLI、配方与 Skill

**Files:** `src/cli/index.ts`、`src/cli/doctor.ts`、`src/cli/output.ts`、`src/cli/init.ts`、`recipes/product-launch/project.json`、`examples/product-launch/`、`skills/takecraft/SKILL.md`、`skills/takecraft/references/project.md`、`tests/unit/cli.test.ts`、`tests/e2e/cli.test.ts`。

**Interfaces:** 提供架构第 6 节的 CLI。开发入口 `pnpm takecraft <command>`，构建后入口 `node dist/cli/index.js <command>`；package bin 指向构建入口。`--json` 的 stdout 只有一个结果对象，进度写 stderr；成功退出 0，参数/清单错误 2，生产阶段失败 1。

- [x] 写失败用例：`doctor` 检查 Node、ffmpeg、ffprobe、浏览器；`init` 在已有项目目录中拒绝覆盖；`catalog`/`describe` 与实际注册参数一致；未知 profile 和 `final` 给出明确错误。
- [x] 写 CLI 集成用例：初始化后 validate 成功；所有路径含空格/中文时仍工作；JSON 输出可解析且有 artifact/report 路径，不包含完整帧或日志；没有外部服务时不声称已生成配音。
- [x] 运行 `pnpm test:unit -- tests/unit/cli.test.ts`、`pnpm test:e2e -- tests/e2e/cli.test.ts` 观察失败，再实现入口和命令编排。
- [x] 创建自有虚构产品的配方与小型素材，标明示例性质；不从 onetake 提取案例代码或音视频资源。
- [x] 按 skill-creator 编写短 Skill：优先 catalog/describe、编辑 project.json、调用 build、按报告定向修改。仅必要时写组件，最多两轮自动清单修复；无权自动安装付费服务或上传素材。
- [x] 运行 CLI 测试和 skill-creator 的 quick_validate；用实际 Skill 流程制作一个新项目，验证无需读取整套源码。记录真实工具输出量；没有宿主 token 计量时报告未测量。

## Task 8: 端到端验收与文档

**Files:** `tests/e2e/product-launch.test.ts`、`tests/e2e/revision.test.ts`、`README.md`、`docs/plan/README.md`、`docs/usage.md`；实际视频、帧和长日志写入被忽略的 `artifacts/` 或 `.takecraft/`。

**Interfaces:** 仅使用公开 CLI/构建入口及输出报告，不依赖私有函数绕过用户流程。

- [x] 写 15 秒样片验收：init → validate → preview → build → status；检查 450 帧、1080p30、正确时长、可解码视频、基础音效、预览图和质量报告。
- [x] 写修订验收：修改产品名称、颜色和截图得到第二条片子；只换音乐时渲染阶段缓存命中；错误清单和缺图返回失败且不破坏上一条成片。
- [x] 补充真实中断恢复/损坏缓存的端到端验证；用浏览器统计证明音乐修改没有重新截图，而不只是检查一个手写 cached 标志。
- [x] 运行 `pnpm typecheck`、`pnpm build`、`pnpm test:unit`、`pnpm test:browser`、`pnpm test:e2e`；所有已列检查必须执行，缺依赖或环境阻塞明确报告，不能跳过后宣布完成。
- [ ] 查看样片关键帧，并实际播放检查节奏、音画同步和文字可读性。使用可用的浏览器/系统媒体工具；无法播放时明确报告这一项未验收。
- [x] 更新 README 的真实安装和使用命令、当前限制、依赖要求；更新进度与验证证据。M1 完成后再制定 M2 计划，不提前把未来能力标记为实现。


## 交付核对（2026-10-24）

Task 1–5 的旧复选状态已按代码、已有提交和验证证据回填。保留的四个测试复选项是部分覆盖：尚未单独测试 surface 跨三节拍的对象身份、字体加载失败导致 ready 拒绝、渲染时 seek 异常注入、反向字幕区间。相应实现逻辑存在，不把它们描述成功能缺失，也不把未执行的细项当作通过。Task 8 已有用户观看并总体认可的反馈，音效听感及主观音画同步未逐项确认。

实现取舍：动作由显式轨道与原创配方提供；属性按时间解析计算；预检合入逐帧检查。逐组件预览图、位置/尺寸连续性自动诊断、报告 sharp/blurred 标记未实现，详见进度页的限制。

## 计划自审

- Spec coverage：架构中 M1 的清单、组件、三种衔接、素材、渲染、声音、字幕、检查、缓存、任务状态、CLI、Skill 均对应 Task 1–8；M2/M3 明确延后。
- Type consistency：Project/Timeline/Artifact 在 Task 1/2 建立共享类型；渲染、声音与编排消费这些类型，CLI 只包装公开函数。
- Review focus：五类风险分别有对应任务的正反例；审美不伪装成确定性测试。
- Execution：先完成一个任务的必要验证再推进，不为每个小步骤增加额外审阅会话。范围或接口有实质变化时写明决定与影响。
- Git：2026-10-24 用户明确要求提交推送 M1、清理旧 worktree，再从 main 新建动画主题分支；后续推送仍遵循即时授权。

## 实施前自检

1. 清单确定后为什么还需要模型逐步调用渲染内部函数？不需要，build 应自行完成生产流程。
2. 为什么不能通过相同文件名判断缓存有效？同一路径的内容、字体或组件版本可能已经改变。
3. 如何保留新创意？新增遵守 Runtime 和组件协议的能力，不改写整条工具链。
