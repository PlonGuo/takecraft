---
name: takecraft
description: 用本地 Takecraft 工具链制作或修改二维产品动效短片。适用于产品截图、品牌文案、音乐和字幕到 MP4 的制作，以及对已有 project.json 的修订。
---

# Takecraft

Agent 负责创意和清单，CLI 负责逐帧渲染、声音、编码和检查。先复用对象、动作和现成配方；清单能表达的改动不重写生产代码。

## 找到工具

本 Skill 随 Takecraft 仓库维护。解析当前 SKILL.md 的真实路径，仓库是 `skills/takecraft/` 的上两级；如果从其他位置复制安装，使用安装者提供的仓库路径。先检查该目录的 package.json。不要把用户的视频目录当成工具源码目录。

以下命令在工具仓库执行，`FILM` 使用绝对路径。用 `pnpm --silent takecraft` 避免包管理器横幅混入 JSON。依赖尚未安装时按仓库 README 设置。

```sh
pnpm --silent takecraft doctor --json
pnpm --silent takecraft catalog --summary --json
pnpm --silent takecraft init /absolute/path/to/new-film --recipe product-launch --json
```

## 制作与修订

1. 根据用户的产品、文案和素材制定节奏；示例“轻舟”是虚构产品，替换成真实需求。缺少素材时可用明确标注的占位，不能冒充客户内容。
2. 按需运行 `describe text --json` 等查询选中组件。首次改复杂时间线时读 [清单约定](references/project.md)；完整 schema 用 `describe project --json` 获取。无需读整套源代码。
3. 只修改 `FILM/project.json` 和其引用的本地素材。保持跨节拍对象 id；不手改生成的 timeline、帧、缓存或报告。
4. 调用 `validate FILM/project.json --json`，再 `preview FILM/project.json --json`；打开关键帧，检查中文、布局和衔接。
5. 调用 `build FILM/project.json --profile draft --json`。一次命令完成生产；进度在 stderr，stdout 是紧凑结果，详细错误和成片路径在 reportPath。用 `status FILM --json` 查进度或上次成功版本。
6. 查看实际视频和质量报告。技术通过不等于审美通过；明确说明未验证的播放或声音。交付 MP4、预览与字幕路径。

按 Issue 的 code/path 定向修复；自动清单修复最多两轮。仍失败时保留诊断并报告原因。中断后运行同一 build 加 `--resume`；工具只复用内容与版本一致且完整的阶段。只换音乐会复用画面。

本版仅支持 1080p30、基础合成音效、已有音乐/旁白和定时 SRT；没有自动配音、逐词对齐、4K60 或运动模糊。`final` 会明确失败。不得自动上传用户素材或开通付费服务。确需新效果时再添加本地可复用组件，并验证随机时间定位一致性。
