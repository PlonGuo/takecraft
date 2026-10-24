# Takecraft v0.2.0 分发实施计划

> **For agentic workers:** 使用 superpowers:executing-plans 在当前会话逐项实施，结束后进行一次独立全分支审阅。

**Goal:** 用户把安装请求交给 Codex 后，可安装配套 Skill/引擎并制作视频；dev/main 分支与 Actions 完成后续正式分发。

**Architecture:** npm 发布编译好的完整工具，独立 Skill 用准确版本入口调用；setup 准备浏览器并报告系统依赖。feature → dev → main，main 验证安装包后发布 npm 与 GitHub Release。

**Tech Stack:** TypeScript、Node >=22.20、pnpm 10、npm、Playwright、FFmpeg、GitHub Actions。

**Spec:** [分发设计](2026-10-24-agent-first-distribution.md)。用户本轮已授权实现及发布；此前“不执行”的状态已结束。

## Global Constraints

- 首版只完整验收 Codex + macOS；不新增动画功能、其他 Agent 适配和更新提醒。
- npm 包名 takecraft；用户已确认 npm 身份 plonguo、本机登录和 MIT 许可证。首次发布使用经 CI 验证的真实包。
- Skill 使用准确发行版本，不能跟默认 dev/main 分支拿到未发布版本。
- 不改变用户作品；临时验证产物结束后清理，只留现有两个 README demo。
- 默认分支 dev；main 正常只接收 dev 发布合并；版本号在 PR 中确定，流水线不回写源码。

## Review Focus

- npm 真实安装包缺资源/依赖：必须从源码外安装并出片。
- 符号链接、中文空格路径：入口正常运行且保留调用目录。
- 已有同名全局/项目工具：Skill 不能误调错误版本；缓存缺失明确失败或获取同版。
- 发布重复执行及旧任务重跑：检查包内容/提交，latest 不回退。
- 第三方 Skill 安装与本机旧 Skill 冲突：保护自定义文件，验证真实 Codex 识别。

### Task 1: 可发布工具与环境准备

**Files:** package.json、src/cli/{index,doctor,setup,version}.ts、bin/takecraft.mjs、scripts/check-package.mjs、tests/unit/setup.test.ts、tests/e2e/package.test.ts、LICENSE（用户确认后）。

**Interfaces:** `setup(browser?: string): Promise<DoctorResult>` 准备缺少的浏览器并复检；doctor 返回 `version`、`checks` 和 `status`，失败退出非零。`takecraft version --json` 返回版本及支持的安装平台。npm `bin` 入口显式调用 execute，不依赖 argv 的非规范化路径比较。

- [x] 写 setup 缺浏览器可修复、缺 FFmpeg 不误报成功、重复调用不下载的行为测试；验证旧实现失败。
- [x] 实现 setup/version、编译入口及 package.files/repository/engines；不依赖 tsx。保留源码开发入口和旧安装器兼容。
- [x] 写真实 tarball 测试：`pnpm pack` → 临时目录 production install → 从别的中文路径运行 doctor/init/compose/preview/build、ffprobe/完整解码。确认源码和 devDependencies 不在包里。
- [x] 运行 `pnpm typecheck`、`pnpm build`、`pnpm exec vitest run tests/unit/setup.test.ts tests/e2e/package.test.ts`；应全部通过。
- [x] 按明确文件列表提交 Task 1。

### Task 2: 独立 Skill 与准确版本调用

**Files:** skills/takecraft/{SKILL.md,runtime.json,scripts/run.mjs}、scripts/check-package.mjs、tests/e2e/skill-launcher.test.ts、README.md、docs/try-it.md。

**Interfaces:** Skill 内 `run.mjs <CLI args>` 读取 runtime.json 的 package/version，使用 npm 的固定版本执行能力；保留 cwd、参数、退出码和信号，日志 stderr、结果 stdout。检查脚本校验版本清单等于 package.version。

- [x] 先写实际子进程测试：Skill 被复制到独立目录、cwd 有错误同名包/全局命令、空格参数、失败和信号传播；观察失败。
- [x] 实现轻量入口与版本清单。若 npm exec 对本地同名包解析不满足准确版本约束，采用最小隔离调用目录并记录决定，不能绕过版本核验。
- [x] 重写 Skill 安装/检查/制作步骤，README 以给 Codex 的安装请求为主入口，安装源固定正式 Release tag；不得覆盖旧 Skill。
- [x] 运行 `pnpm exec vitest run tests/e2e/skill-launcher.test.ts` 和 Skill validator；版本一致性检查通过。
- [x] 提交 Task 2；正式公开发行后再验证 skills CLI 安装和新 Codex 会话识别。

### Task 3: 可恢复的发布流程与 Actions

**Files:** scripts/{release,release-policy,check-release}.mjs、.github/workflows/{ci,release}.yml、tests/unit/release.test.ts、docs/releasing.md。

**Interfaces:** release-policy 的纯函数处理稳定版本比较、已有包/版本检查、最新指针是否推进；release 脚本组合 npm/GitHub 操作。release CLI 只在 main 对固定 SHA 和 tarball 发布；CI 用 PR merge SHA/实际 dev SHA 验证。

- [x] 先写新版本、docs-only、代码变更未升版、已有版本内容冲突、旧失败任务重跑的测试并观察失败。
- [x] 实现发布检查、同一 tarball pending→下载校验→latest→tag/Release、有限重试、重跑恢复和防 latest 回退。
- [x] 配置 macOS 单平台 CI：类型检查、完整测试、构建和实际打包冒烟；main 发布 workflow 复用检查，最小 OIDC/GitHub 权限，production 仅 main，串行且不取消进行中的发布。
- [x] 验证 `pnpm exec vitest run tests/unit/release.test.ts`、workflow YAML/Actions 静态检查；本地 release dry-run 无远端写入。
- [x] 提交 Task 3，更新发布文档和变更记录。

### Task 4: 集成验收、审阅与正式发布

**Files:** docs/plan/README.md、CHANGELOG.md、README.md；GitHub 分支、保护规则、production 环境、npm 发布设置。

- [x] 完整运行 typecheck/build/test、Skill 校验、实际 npm/pnpm 安装包检查，记录已覆盖和未覆盖条件。
- [x] 一次独立全分支审阅；重要问题用失败回归验证后修复，完成要求的复测。
- [x] 推送 feature，PR 合入 dev 并跑 CI；设置 dev 为默认分支和必要保护规则。保护 main 仅经 PR 发布。
- [x] 用户完成 npm 身份/许可证后建立首包和 Trusted Publisher；首次身份初始化不能假装已经由未存在的 npm 包 OIDC 配置完成。
- [x] dev → main 发布 PR，观察 Actions 完整结果；任何失败明确修复或记录阻塞，不绕过发布检查。
- [x] 从公开 npm/GitHub tag 安装，验证 Codex Skill 发现与制作；最终同版升级/version/setup/doctor 通过，保留 main 历史同步回 dev，清理本次临时产物及开发 worktree。

## 版本规则

本轮 v0.2.0；修复用 v0.2.x，新动作/主题下一轮用 v0.3.0。1.0.0 表示公开命令、输入格式及 Skill 调用契约进入稳定承诺，不表示第几轮开发。参见 https://semver.org/。

## 集成验收追加修复：v0.2.2

用户反馈正式发布约十二分钟可以接受，但 feature → dev 不应等待这么久。v0.2.1 已成功 OIDC 上传并恢复完整 Release；同时暴露 npm 上传后读回的六秒等待过短。

- [x] 复现同步三十秒才可读时旧实现六秒误失败，并覆盖有界等待与完整性错误立即失败；改为最多三分钟的递增等待，回归 8/8 通过。
- [x] PR 使用快速套件，保留全部单元/浏览器和一秒编码冒烟；取消 dev push 重复全套；main 默认完整模式，检查名保持 checks / verify。
- [x] 完整套件、快速套件、actionlint 与 GitHub 实际时间验证；快速 PR 实测 2 分 13 秒。
- [x] v0.2.2 按 feature → dev → main 发布；公开同版 Skill 升级发现下述缓存问题，最终安装/同步/清理由 v0.2.3 验收完成。

## 本机升级验收追加修复：v0.2.3

v0.2.2 已发布且完整 CI 成功，实际更新本机 Skill 时发现 npm exec 强制 prefer-offline 会读取旧版本列表，误报新版本不存在。该场景不是冷安装或同版离线执行；追加升级回归后只移除这一强制选项，保留 npm 自身的缓存和准确版本解析。

- [x] 真实 fixture registry 缓存旧列表后公开新版本，旧入口 ETARGET；修复后升级、同版离线、隔离调用和信号传播 4/4 通过。
- [x] 本地全套 132/132；正常 feature → dev → main 发布（Release 40081705302 成功），公开包字节核对及本机同版 Skill 升级/version/setup/doctor 通过；同步最终状态并清理。
