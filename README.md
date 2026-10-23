# Takecraft

本地二维视频制作工具：Agent 提供品牌、文案、功能点与风格，固定程序负责编排动作、画面、声音、字幕、编码和技术检查。

第一次使用可按[试用指南](docs/try-it.md)操作：提供了新 Codex 对话提示词、手动命令和成片检查方法。

已实现 1080p30 制作、六种基础组件、五类动作、Motion 弹簧采样、三套主题、中文字体检查、逐帧检查、独立音画缓存和中断恢复。15 秒产品片包含容器展开、镜头推进和收拢成标志；[当前验收状态](docs/plan/README.md)与审美评价单独记录。

## 安装与第一条视频

需要 Node.js >=22.12、pnpm、FFmpeg / ffprobe，以及 Playwright Chromium 或本机 Google Chrome。依赖的准确版本由 `pnpm-lock.yaml` 固定。

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm --silent takecraft doctor --json
pnpm --silent takecraft compose examples/product-launch-v2/brief.json ./films/demo --theme paper --json
pnpm --silent takecraft validate ./films/demo/project.json --json
pnpm --silent takecraft preview ./films/demo/project.json --json
pnpm --silent takecraft build ./films/demo/project.json --profile draft --json
```

macOS 安装了 Google Chrome 时，可不下载 Chromium；也可传 `--browser /absolute/path/to/browser`。`doctor` 实际启动浏览器验证依赖，不只检查文件是否存在。

结果返回 MP4、预览 HTML、字幕与质量报告的绝对路径。每次运行保存在作品目录的 `.takecraft/runs/<runId>/`，失败不替换上一次成功视频。预览 HTML 可独立打开，展示画面与时间滑块；音频在成片中，SRT 是独立文件。

## 用 Skill 制作

新的普通制作入口是 `compose`：编辑 [brief 示例](examples/product-launch-v2/brief.json)，选择 `paper`（纸间）、`midnight`（夜航）或 `editorial`（构想），再调用 `build`。无需手写属性轨道或回弹算法。当前配方支持 2–3 个功能点、可选本地截图/音乐，时长固定 15 秒。原始 `init --recipe product-launch` 继续可用。

从任意工作目录调用仓库内的启动脚本，工具与依赖按脚本位置查找，相对输入路径仍按调用目录解释：

```sh
node /absolute/path/takecraft/scripts/run.mjs catalog --kind all --json
node /absolute/path/takecraft/scripts/run.mjs describe brief --json
node /absolute/path/takecraft/scripts/run.mjs compose brief.json "我的视频" --json
node /absolute/path/takecraft/scripts/run.mjs build "我的视频/project.json" --json
```

启动脚本运行当前源码，需要先在工具仓库执行 `pnpm install`。作品位置由调用者指定，不绑定 Codex 文件夹。新版 Skill 包装暂缓，现有 Skill 仍使用原始清单工作流。

[skills/takecraft/SKILL.md](skills/takecraft/SKILL.md) 是入口。在 Codex 中可直接指定其路径使用。要让后续会话发现它，可在自己的 skills 目录创建指向仓库 `skills/takecraft` 的符号链接。移动或删除工作目录前先更新该链接。

常规工作只需查询 `catalog --summary` / `describe TYPE`，修改制作清单后调用 `build`。命令内部不调用语言模型；缓存和渲染不需要 Agent 逐帧轮询。实际 token 节省比例尚未测量。

## 修改与恢复

```sh
pnpm --silent takecraft catalog --summary --json
pnpm --silent takecraft describe text --json
pnpm --silent takecraft describe project --json
pnpm --silent takecraft build ./films/demo/project.json --resume --json
pnpm --silent takecraft status ./films/demo --json
```

只换音乐时复用画面；修改文案、同路径图片、字体、组件或浏览器版本时重新生成相关画面。每次 build 都验证缓存内容，`--resume` 明确表达恢复意图。中断时复用已经完整产出的阶段，未完成的帧序列重新渲染。同一作品同时构建会返回 `PROJECT_LOCKED`。

`--json` 的 stdout 只有一个结果对象，进度在 stderr。使用 `pnpm --silent` 去掉包管理器横幅。退出码：成功 0，参数/清单错误 2，工具或生产阶段失败 1。长日志和逐帧清单保存在运行目录。

## 验证与限制

```sh
pnpm typecheck
pnpm build
pnpm test:unit
pnpm test:browser
pnpm test:e2e
```

浏览器和端到端测试需要允许监听 localhost、启动 Chromium 与 FFmpeg。成片验收会在忽略目录 `artifacts/` 保留两版 15 秒视频和报告；`artifacts/acceptance-latest.json` 指向最近产物。构建后的入口是 `node dist/cli/index.js`。

M1 支持本地图片、已有音乐/旁白、基础合成音效和定时字幕；不含自动配音、逐词对齐、4K60、运动模糊、三维、云渲染或在线编辑器。`--profile final` 明确返回不支持。只运行本机可信代码，素材不在渲染时从远端下载。

图片统一准备为静态 PNG：动态图取首帧，SVG 栅格化，运动由时间线控制。新动作使用 Motion 14.6.0 的 spring/stagger，旧命名曲线行为保留；仍按绝对时间逐帧求值，不依赖实时播放。原理与素材边界见[使用文档](docs/usage.md)。

详细命令与错误说明见 [使用文档](docs/usage.md)。正式架构和实施计划统一在 [docs/plan](docs/plan/README.md)。示例与素材均独立实现，来源与许可见 [SOURCE.md](recipes/product-launch/SOURCE.md)。
