# 使用 Takecraft

Takecraft 把一份制作清单变成视频。像一份给制作团队的拍摄表，清单描述对象和时间；程序负责逐帧计算、声音和出片。清单是唯一编辑入口，生成的 timeline、视频和报告不用手工维护。

## 画面为什么能连续变化

可以把视频想成一本翻页动画书：每一页是一张画面，连续翻动就产生运动。如果依赖电脑实时播放再录屏，电脑卡顿或素材迟到可能让录制结果发生变化；Takecraft 因此按明确的时间逐帧计算。

制作清单先经过字段、素材和时间检查，再编译成时间线，也就是“什么对象在什么时间如何变化”的表。浏览器用普通网页元素绘制对象，`seek(t)` 直接计算第 t 秒的状态。这个过程具有确定性：在相同清单、素材和运行环境下，跳到相同时间应得到相同画面，与之前播放到哪里无关。

输入框变成工作台再收成标志，是同一个容器连续改变位置、宽高和圆角；镜头移动则变换整个场景。插值负责计算起点与终点之间的数值，缓动曲线负责控制变化速度，例如逐渐起步、接近终点时减速。M1 内置 linear / smooth / out / spring 四种曲线，spring 是简化的衰减振荡公式。

Playwright 是控制浏览器的自动化工具：它等待字体和图片加载完毕，按每秒 30 次定位并截图。15 秒共生成 450 张图，再交给音视频处理工具 FFmpeg 编码、混音和合成。质量检查验证尺寸、帧数、解码、音轨、文字溢出与指定对象的可见性；节奏和美感仍需看成片判断。

当前已接入 Motion 14.6.0：它提供弹簧曲线与错峰时间计算，Takecraft 把动作展开成属性轨道，并在指定时刻采样；不用 React 或实时播放循环。旧 M1 命名曲线保留原行为。曲线解决运动速度变化，配方和主题另外负责排版与节奏。

自检：同一容器改变尺寸与直接切换两张画面有什么不同？为什么导出时需要直接计算某一秒的画面？换音乐为什么可以复用原来的截图？

## 工作目录与命令

普通产品片先写简短需求（brief），再让工具生成制作清单。它像菜单点单：你给内容与风格，配方负责安排制作步骤。否则每条片都要重新编写几十条属性轨道，Agent 负担和出错机会都会增加。

```sh
pnpm --silent takecraft catalog --kind all --json
pnpm --silent takecraft describe brief --json
pnpm --silent takecraft compose examples/product-launch-v2/brief.json "我的影片" --theme midnight --json
pnpm --silent takecraft build "我的影片/project.json" --json
```

需求包含品牌、主标题、标语、2–3 个功能点和行动文案；可选 `screenshot`、`music` 按需求文件所在目录解析，复制到新作品目录。主题 paper / midnight / editorial 同时改变排版、配色、表面与动作风格；`style` 可单独指定 calm / snappy / playful。文案不接受手动换行，模板根据宽度自动折行；多行精排仍可编辑原始 project。字段上限用 `describe brief` 查询，非法输入不会截字后继续。当前配方固定 15 秒，音乐按片长截取并淡入淡出，不自动配音。

输出 `brief.json` 保存需求，`project.json` 保存生成结果；之后可以编辑 project 精调，修改 brief 后应 compose 到新目录。两者不会自动双向同步。compose 返回的 statistics 是规范化配置字节数及动作/轨道数量，不能当作 Agent token 节省率。

从其他目录用 `node /absolute/path/takecraft/scripts/run.mjs ...` 调用即可；无需切回仓库。脚本定位工具和依赖，同时保留调用者的相对路径。全局 Skill 只需以后引用这个入口，不必把渲染器复制进 Codex 目录。

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

持续对象使用稳定 id。比如输入框展开为工作台再收拢成标志，改变的是同一容器的位置、尺寸与圆角。可用 `actions` 声明 enter（入场）、exit（退场）、morph（变形）、reveal（文字揭示）、focus（镜头）；用 `describe action:enter --json` 等按需查询参数与示例。原始 `tracks` 仍可精调，但与动作控制同一属性时不能重叠。六种组件共用参数协议，目前扩展组件需要修改本地源码与对应 schema，不支持任意远程插件。

动作按 at 排序展开；入场前隐藏，退场后保持隐藏，再入场恢复之前的非退场布局。reveal 只改变文字揭示进度，可与入场同时使用。focus 只能定位根对象在动作开始时的中心或画布中心，不跟随之后的对象移动；不可与手写 camera 混用。弹簧可越过目标形成回弹，但透明度、揭示进度和正尺寸仍由运行时约束，结束时精确落到目标。

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
