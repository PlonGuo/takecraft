# 使用 Takecraft

Takecraft 把一份制作清单变成视频。像一份给制作团队的拍摄表，清单描述对象和时间；程序负责逐帧计算、声音和出片。清单是唯一编辑入口，生成的 timeline、视频和报告不用手工维护。

## 画面为什么能连续变化

可以把视频想成一本翻页动画书：每一页是一张画面，连续翻动就产生运动。如果依赖电脑实时播放再录屏，电脑卡顿或素材迟到可能让录制结果发生变化；Takecraft 因此按明确的时间逐帧计算。

制作清单先经过字段、素材和时间检查，再编译成时间线，也就是“什么对象在什么时间如何变化”的表。浏览器用普通网页元素绘制对象，`seek(t)` 直接计算第 t 秒的状态。这个过程具有确定性：在相同清单、素材和运行环境下，跳到相同时间应得到相同画面，与之前播放到哪里无关。

输入框变成工作台再收成标志，是同一个容器连续改变位置、宽高和圆角；镜头移动则变换整个场景。插值负责计算起点与终点之间的数值，缓动曲线负责控制变化速度，例如逐渐起步、接近终点时减速。M1 内置 linear / smooth / out / spring 四种曲线，spring 是简化的衰减振荡公式。

Playwright 是控制浏览器的自动化工具：它等待字体和图片加载完毕，按每秒 30 次定位并截图。15 秒共生成 450 张图，再交给音视频处理工具 FFmpeg 编码、混音和合成。质量检查验证尺寸、帧数、解码、音轨、文字溢出与指定对象的可见性；节奏和美感仍需看成片判断。

M1 没有使用 Motion、Framer Motion、React 或 Remotion。当前运行时自行采样属性；第三方动画库可以作为后续的曲线或编排实现，但仍需保持随机定位和逐帧导出一致。仅安装库不会自动改善排版、运动节奏和主题设计。

自检：同一容器改变尺寸与直接切换两张画面有什么不同？为什么导出时需要直接计算某一秒的画面？换音乐为什么可以复用原来的截图？

## 工作目录与命令

命令在工具仓库运行，作品可以保存在其他本地目录。含空格或中文的路径加引号。初始化只接受新目录；现有目录绝不覆盖。

```sh
pnpm --silent takecraft init "/absolute/path/我的影片" --json
pnpm --silent takecraft validate "/absolute/path/我的影片/project.json" --json
pnpm --silent takecraft preview "/absolute/path/我的影片/project.json" --json
pnpm --silent takecraft build "/absolute/path/我的影片/project.json" --json
pnpm --silent takecraft status "/absolute/path/我的影片" --json
```

`preview` 返回独立 HTML 和按 beats 选取的关键帧。`build` 默认也输出预览，批量验证时可用 `--no-preview`。预览是画面预览，音频在 MP4 中；字幕另存为 SRT。`status` 返回最近运行和上一次成功运行，中断不会冒充成功。

编译后可用 `node dist/cli/index.js <command>`；它与开发命令共享接口。首次安装缺浏览器时执行 `pnpm exec playwright install chromium`，或者使用 `--browser` 指定本机浏览器的可执行文件。

## 编辑清单

[清单约定](../skills/takecraft/references/project.md)解释素材、对象、轨道、镜头和声音；精确参数按需用 `describe TYPE --json` 或 `describe project --json` 获取。

持续对象使用稳定 id。比如输入框展开为工作台再收拢成标志，改变的是同一容器的位置、尺寸与圆角。M1 使用显式属性轨道，不提供动作预设展开器。六种组件共用参数协议，目前扩展组件需要修改本地源码与对应 schema，不支持任意远程插件。

同一属性的动作区间不能重叠。时长必须对应整数帧；15 秒为 450 帧，最后一帧时间是 14.9667 秒。中文字体默认随依赖安装，缺字会返回具体字符。正文和标题是纯文本，不执行 HTML。

图片按静态素材处理：准备阶段统一解码为单帧 PNG，动态图取首帧，SVG 固定为其本征尺寸的静态栅格图；图片内部动画不会播放。预览和成片使用同一份准备后的字节，原图与规范化结果都参与缓存指纹。需要运动时在清单中给对象添加轨道。SVG 在大幅放大前应提供足够的源尺寸。

## 失败与恢复

| 错误 | 处理 |
| --- | --- |
| `SCHEMA_INVALID` / `TEXT_REQUIRED` | 根据 Issue.path 修改字段，空白文本不允许 |
| `ASSET_INVALID` / `ASSET_MISSING` | 检查本地路径、文件类型及 asset id |
| `FONT_GLYPH_MISSING` | 选用覆盖所需字符的本地字体或调整字符 |
| `PARENT_TYPE` | 用 surface / window / shape 作为父容器，文字、图片与光标是叶子对象 |
| `TRACK_CONFLICT` / `TIME_RANGE` | 修正重叠动作或超出总时长的区间 |
| `NARRATION_TOO_LONG` | 延长明确分配的区间，或替换旁白；不会静默截断 |
| `TEXT_OVERFLOW` / `OUT_OF_FRAME` | 根据对象 id 和时间调整布局或镜头 |
| `PROJECT_LOCKED` | 等待同一作品的活跃构建结束，避免删除活跃锁；进程在写入锁所有者前中断时保守等待 60 秒 |
| `BUILD_INTERRUPTED` | 检查状态，再用相同 build 加 `--resume` |
| `BROWSER_MISSING` / `TOOL_MISSING` | 运行 doctor，安装或指定依赖 |
| `PROFILE_UNSUPPORTED` | 当前只支持 draft，即 1080p30 |

每次 build 自动校验缓存文件的内容指纹、大小和相关工具版本。只换音乐时不截图；替换同一路径图片时会重做画面。未完成阶段不会当作有效缓存；完整阶段可跨运行复用。不要在仍需缓存时删除旧运行目录，缓存可能引用其中的文件；缺失后工具会重新生产。

浏览器临时关闭最多额外尝试两次；无效输入不会重试。报告保留具体失败阶段、错误、产物和耗时。失败版本不写入 lastSuccess，也不覆盖之前的 MP4。渲染可能消耗较多磁盘空间，临时帧不会自动清理。

## 检查实际作品

程序检查尺寸、帧数、完整解码、音轨、峰值、文字溢出和声明的可见性。实际播放时仍要判断节奏、音效与动作是否协调、文字是否易读。美观程度不以自动分数代替人判断。

自检：修改音乐后 captures 是否为 0？改图后是否重新生成画面？失败时 lastSuccess 是否仍指向原视频？交付前是否看过关键帧和播放过成片？
