# Takecraft · v0

把品牌、文案、功能点和风格交给 Agent，由本地工具生成完整的二维产品视频。Agent 负责内容与选择，Takecraft 负责动作计算、排版、逐帧渲染、声音、字幕和检查。

当前分发版本为 **v0.2.3**（动画能力保持 v0 封板范围）：15 秒、1080p30，五类可复用动作，Motion 弹簧采样，纸间 / 夜航 / 构想三套主题。

## Demo

**纸间 · Paper** — 柔和圆角与卡片依次入场。

https://github.com/user-attachments/assets/0d4231f4-7de7-409c-99de-5e674eb18b81

**构想 · Editorial** — 明亮色块、大字排版与容器收拢。

https://github.com/user-attachments/assets/048ef7b1-8d3c-4984-b2c4-f592695bf1c8

两个 MP4 也可从 [v0.1.1 Release](https://github.com/PlonGuo/takecraft/releases/tag/v0.1.1) 下载。无需静态截图。

## 让 Codex 帮你安装（推荐）

首版验收 **macOS + Codex**。把下面这段话交给 Codex：

> 请帮我安装 Takecraft，跨项目使用。查询 PlonGuo/takecraft 最新正式 GitHub Release 的 tag（不要用默认 dev 或未发布的 main）。先检查已有同名 Skill，保留自定义内容及旧安装；通过 skills CLI 安装该 tag 下的 takecraft Skill，选择 codex、global。随后读取安装后的 SKILL.md，准备对应版本工具，运行 version/setup/doctor 并报告结果。若最新 Release 尚无 runtime.json，说明它仍是旧分发版本，不要混装开发版。

安装器是 Vercel 的 `skills` CLI，实际形式如下；把 `VERSION` 换成 **已发布** 的版本号：

```sh
npx --yes skills add https://github.com/PlonGuo/takecraft/tree/vVERSION/skills/takecraft --skill takecraft -a codex -g -y
```

Skill 入口会获取配套的准确 npm 版本，无须 clone 仓库。Node.js >=22.20（含 npm）和 FFmpeg/ffprobe 是必需环境；macOS 已有 Homebrew 时可安装 `node@24` 和 `ffmpeg`。`setup` 检查系统依赖，并复用 Chrome 或下载 Chromium。首次获取和缓存缺失时需要网络；用户作品独立存储，更新不修改作品。

更新时再次把上述请求交给 Codex，使用最新正式 tag 安装配套 Skill，再检查环境；制作视频时不自动升级。当前会话安装后直接读取新 Skill；如果后续未识别，新开 Codex 对话。已有 `~/.agents/skills/takecraft`、`~/.codex/skills/takecraft`（或 CODEX_HOME）及项目同名 Skill 时先处理来源冲突，不要盲目覆盖。

v0.2.x 提供 npm 工具与独立 Skill。旧安装器仍可使用原封板版本 [v0.1.1](https://github.com/PlonGuo/takecraft/releases/tag/v0.1.1)：

```sh
(set -o pipefail; curl -fsSL https://raw.githubusercontent.com/PlonGuo/takecraft/v0.1.1/install.sh | bash -s -- --version v0.1.1)
```

## 用 Agent 制作

安装后在 Codex 中选用 `takecraft` Skill（可在技能菜单查找；也可以直接提及 `$takecraft`），例如：

> 用 takecraft 为「星笺」制作一条 15 秒产品介绍片，选择夜航主题，介绍随手记录、自动归类、行动清单三个功能，结尾邀请开始体验。视频保存在我的 Videos 文件夹。

Skill 会查询需求格式，生成 brief，再调用 compose / preview / build；无需为每条视频手写动画算法。支持 2–3 个功能点、可选本地截图与音乐；模板自动折行，brief 文案不接受手动换行。

## 手动使用

无需安装 Skill 也可以调用 CLI；第一次先运行 `npx --yes takecraft@0.2.3 setup --json`。也可通过 `pnpm add -g takecraft@0.2.3` 安装命令。

```sh
npx --yes takecraft@0.2.3 doctor --json
npx --yes takecraft@0.2.3 describe brief --json
npx --yes takecraft@0.2.3 compose /absolute/brief.json /absolute/new-film --theme paper --json
npx --yes takecraft@0.2.3 build /absolute/new-film/project.json --json
```

参考 [brief 示例](examples/product-launch-v2/brief.json)与[试用指南](docs/try-it.md)。compose 只创建新目录。成功结果返回 MP4、预览、SRT 和质量报告的绝对路径；中间产物位于作品的 `.takecraft/` 中。

修改项目后重新 build；只换音乐可复用画面。`--resume` 恢复已完整完成的阶段，未完成帧序列重新渲染。`status DIRECTORY --json` 查看最近运行。命令 stdout 返回一个 JSON 对象，stderr 显示进度。退出码：成功 0、无效输入 2、生产失败 1。

## 版本与后续

v0 是这一阶段的名称，Git tag 使用固定版本号：`v0.1.0` 首版、`v0.1.1` 修复、`v0.2.0` 安装分发增强、`v0.3.0` 后续动作/风格。0.x 阶段如有不兼容调整会在发行说明中标明；已发布 tag 不移动。Skill 与工具使用同一个版本号一起更新。1.0.0 表示命令和输入格式进入稳定承诺，而不是下一轮开发的编号。后续根据真实参考视频迭代动作与配方。

当前没有自动配音、逐词对齐、4K60、运动模糊、三维或云渲染。图片统一为静态帧，动画由时间线控制。技术质量检查不替代人的节奏与听感判断。

## 本地开发

```sh
git clone https://github.com/PlonGuo/takecraft.git
cd takecraft
pnpm install --frozen-lockfile
pnpm --silent takecraft doctor --json
pnpm typecheck
pnpm build
pnpm test
```

开发默认分支为 dev；feature 从 dev 创建，PR 先合入 dev，测试通过后由 dev → main 的发布 PR 触发正式分发。详见[发版流程](docs/releasing.md)。

源码入口为 `node scripts/run.mjs`，支持任意调用目录；不要把开发 checkout 当成安装器管理目录。测试会在忽略的 `artifacts/` 中产生诊断和视频，检查完可删除；`node_modules/` 是运行依赖，不是视频缓存。

[使用原理与错误处理](docs/usage.md) · [更新记录](CHANGELOG.md) · [正式计划与验证](docs/plan/README.md) · [示例素材来源](recipes/product-launch/SOURCE.md)
