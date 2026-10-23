# Takecraft

通过 Skill 使用的本地二维视频制作工具：Agent 负责创意与 `project.json`，固定程序负责画面、声音、字幕、编码和技术检查。

已实现 1080p30 制作、六种基础组件、中文字体检查、逐帧检查、独立音画缓存、中断恢复、CLI 和 Skill。15 秒原创“轻舟”配方包含容器展开、镜头推进和收拢成标志三个连续动作。[当前验收状态](docs/plan/README.md)与审美评价单独记录。

## 安装与第一条视频

需要 Node.js >=22.12、pnpm、FFmpeg / ffprobe，以及 Playwright Chromium 或本机 Google Chrome。依赖的准确版本由 `pnpm-lock.yaml` 固定。

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm --silent takecraft doctor --json
pnpm --silent takecraft init ./films/demo --recipe product-launch --json
pnpm --silent takecraft validate ./films/demo/project.json --json
pnpm --silent takecraft preview ./films/demo/project.json --json
pnpm --silent takecraft build ./films/demo/project.json --profile draft --json
```

macOS 安装了 Google Chrome 时，可不下载 Chromium；也可传 `--browser /absolute/path/to/browser`。`doctor` 实际启动浏览器验证依赖，不只检查文件是否存在。

结果返回 MP4、预览 HTML、字幕与质量报告的绝对路径。每次运行保存在作品目录的 `.takecraft/runs/<runId>/`，失败不替换上一次成功视频。预览 HTML 可独立打开，展示画面与时间滑块；音频在成片中，SRT 是独立文件。

## 用 Skill 制作

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

图片统一准备为静态 PNG：动态图取首帧，SVG 栅格化，运动由时间线控制。Motion 尚未接入；当前使用自写的属性采样与镜头插值。原理与素材边界见[使用文档](docs/usage.md)。

详细命令与错误说明见 [使用文档](docs/usage.md)。正式架构和实施计划统一在 [docs/plan](docs/plan/README.md)。示例与素材均独立实现，来源与许可见 [SOURCE.md](recipes/product-launch/SOURCE.md)。
