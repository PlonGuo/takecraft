# 清单约定

`project.json` 描述一条视频；`init` 生成的 15 秒配方是可编辑起点。所有时间单位是秒，位置和大小是 1920×1080 画布中的像素。`duration * 30` 必须为整数。

- `assets` 按 id 引用本地 image / audio / font 文件，路径相对清单所在目录。替换同一路径的内容会使相关缓存失效。默认使用随工具安装的 Noto Sans SC 字体。
- `actors` 是持续存在的对象。组件类型通过 `catalog` 查询，`describe TYPE` 返回参数规则和示例。图片的 asset 填素材 id，文字放 text；parent 填 surface / window / shape 容器的 id，位置相对父对象；text / image / cursor 不能承载子对象。
- `tracks` 设置对象某属性在 start 到 end 之间从 from 变化到 to；同一对象同一属性不能有时间重叠。ease 可用 linear / smooth / out / spring。轨道外保持初始值或上一条的结束值。
- `camera` 是按时间递增的镜头关键点，x/y 表示镜头中心，zoom 表示缩放。默认中心为 960/540、zoom 为 1。
- `beats` 给关键帧标注时间；`carries` 记录衔接处持续存在的对象。它们不是切换页面或销毁对象的命令。
- `checks.inFrame` 声明某个对象在 start/end 间必须完整可见；所有可见文字会检查溢出。
- `audio.events` 放置 click / air / land 基础音效；`audio.clips` 引用音频 asset，设置 start/end、kind（music 或 narration）、gain、fade。音乐会按声明区间裁剪；旁白超出区间会失败。
- `captions` 以 start/end/text 导出 SRT，不烧录进画面，不支持重叠区间或自动逐词对齐。预览 HTML 展示画面；声音和字幕另行交付。

常见改动：改名称需查找所有相关文字；改品牌色检查 theme 与对象上的显式 color/background；换截图保留 asset id；换音乐只改 audio 素材和 clips。调整总时长时同时检查全部轨道、镜头、音频、字幕和可见性检查的时间范围。

同一清单的 build 自动校验已完成阶段后复用，`--resume` 明确表达恢复意图；不恢复半截帧序列。新运行有独立目录，失败不会替换 lastSuccess。不要删除旧运行目录中仍被缓存引用的文件；删掉后工具会重新生产。
