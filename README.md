# Takecraft · v0

把品牌、文案、功能点和风格交给 Agent，由本地工具生成完整的二维产品视频。Agent 负责内容与选择，Takecraft 负责动作计算、排版、逐帧渲染、声音、字幕和检查。

首个封板版本为 **v0.1.0**：15 秒、1080p30，五类可复用动作，Motion 弹簧采样，纸间 / 夜航 / 构想三套主题。

## Demo

**纸间 · Paper** — 柔和圆角与卡片依次入场。

https://github.com/user-attachments/assets/0d4231f4-7de7-409c-99de-5e674eb18b81

**构想 · Editorial** — 明亮色块、大字排版与容器收拢。

https://github.com/user-attachments/assets/048ef7b1-8d3c-4984-b2c4-f592695bf1c8

两个 MP4 也可从 [v0.1.0 Release](https://github.com/PlonGuo/takecraft/releases/tag/v0.1.0) 下载。无需静态截图。

## 一条命令安装或更新

面向 macOS / Linux。先准备 **Node.js >=22.12、pnpm 10、FFmpeg（包含 ffprobe）**；还需 curl 与 tar。安装器下载正式发布版本，安装项目依赖，并使用本机 Chrome 或准备 Playwright Chromium。Linux 若缺浏览器系统库，会报告失败，需要按 Playwright 提示安装系统依赖。

```sh
(set -o pipefail; curl -fsSL https://raw.githubusercontent.com/PlonGuo/takecraft/main/install.sh | bash)
```

**以后更新仍执行同一条命令。** 它获取最新正式 Release，不直接跟随尚未发布的 main 代码。默认位置：

- 工具与版本：`~/.local/share/takecraft/`
- Skill：`${CODEX_HOME:-~/.codex}/skills/takecraft`，通过链接使用同版本代码。
- 用户作品：由你指定，独立于安装目录，升级不修改。

依赖和 doctor 检查成功后才切换版本；失败保留当前版本。最多保留当前与上一个版本，重复安装同版不重新下载依赖。已有独立的同名 Skill 不会被覆盖。通过 `--root` / `--skill-dir` 可指定安装和 Skill 父目录。

指定版本安装或回退：

```sh
(set -o pipefail; curl -fsSL https://raw.githubusercontent.com/PlonGuo/takecraft/main/install.sh | bash -s -- --version v0.1.0)
```

如果中断后再次安装提示 `.install-lock`，先确认没有安装进程运行，再移除提示中的锁目录。新开一个 Codex 对话以加载更新后的 Skill。

## 用 Agent 制作

安装后在 Codex 中选用 `takecraft` Skill（可在技能菜单查找；也可以直接提及 `$takecraft`），例如：

> 用 takecraft 为「星笺」制作一条 15 秒产品介绍片，选择夜航主题，介绍随手记录、自动归类、行动清单三个功能，结尾邀请开始体验。视频保存在我的 Videos 文件夹。

Skill 会查询需求格式，生成 brief，再调用 compose / preview / build；无需为每条视频手写动画算法。支持 2–3 个功能点、可选本地截图与音乐；模板自动折行，brief 文案不接受手动换行。

## 手动使用

```sh
~/.local/share/takecraft/bin/takecraft doctor --json
~/.local/share/takecraft/bin/takecraft describe brief --json
~/.local/share/takecraft/bin/takecraft compose /absolute/brief.json /absolute/new-film --theme paper --json
~/.local/share/takecraft/bin/takecraft build /absolute/new-film/project.json --json
```

参考 [brief 示例](examples/product-launch-v2/brief.json)与[试用指南](docs/try-it.md)。compose 只创建新目录。成功结果返回 MP4、预览、SRT 和质量报告的绝对路径；中间产物位于作品的 `.takecraft/` 中。

修改项目后重新 build；只换音乐可复用画面。`--resume` 恢复已完整完成的阶段，未完成帧序列重新渲染。`status DIRECTORY --json` 查看最近运行。命令 stdout 返回一个 JSON 对象，stderr 显示进度。退出码：成功 0、无效输入 2、生产失败 1。

## 版本与后续

v0 是这一阶段的名称，Git tag 使用固定版本号：`v0.1.0` 首版、`v0.1.1` 修复、`v0.2.0` 新动作/风格。0.x 阶段如有不兼容调整会在发行说明中标明；已发布 tag 不移动。Skill 与工具使用同一个版本号一起更新。后续根据真实参考视频迭代动作与配方。

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

源码入口为 `node scripts/run.mjs`，支持任意调用目录；不要把开发 checkout 当成安装器管理目录。测试会在忽略的 `artifacts/` 中产生诊断和视频，检查完可删除；`node_modules/` 是运行依赖，不是视频缓存。

[使用原理与错误处理](docs/usage.md) · [更新记录](CHANGELOG.md) · [正式计划与验证](docs/plan/README.md) · [示例素材来源](recipes/product-launch/SOURCE.md)
