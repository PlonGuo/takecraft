# Takecraft 发版

dev 是工作台，main 是交付线：功能分支从 dev 创建，PR 合入 dev 后验证，再由 dev → main 的发布 PR 分发。CI（持续集成）检查类型、测试和实际安装包；CD（持续交付）将验证过的包发布给用户。

## 版本选择

版本像设备的型号和修订号：`主版本.次版本.修订版本`，例如 `1.1.2`。

- 修复且保持兼容：`1.1.2 → 1.1.3`。
- 新增兼容能力：`1.1.2 → 1.2.0`，修订位归零。
- 不兼容改动：`1.1.2 → 2.0.0`，后两位归零。

这是语义化版本（SemVer）。数字没有一位数限制，`1.9.0` 后可以是 `1.10.0`。0.x 表示接口尚在演进，本项目仍明确记录破坏性变化；1.0.0 表示公开命令、输入格式和 Skill 调用方式进入稳定承诺，不按开发轮次自动升级。

v0.1.1 已封板；v0.2.0 负责分发；后续新动作/主题用 v0.3.0，当前版修复用 v0.2.x。发布前同步修改 package.json、skills/takecraft/runtime.json、CHANGELOG.md；测试不应改变已发布版本。正式 Git tag 为 v 加版本号，永不移动。

## 正常流程

1. feature → dev，PR 运行快速 CI：类型、打包检查、单元、全部浏览器及短片冒烟；dev 为 GitHub 默认分支。受保护的 dev 通过 PR 合入后不再重复运行 push 全套测试。
2. dev → main 发布 PR。main 只接收同仓库 dev；保留 merge commit 历史，不 squash 长期分支。生产相关文件变化必须升版，只有 docs/tests/README/CHANGELOG/AGENTS/.gitignore 变化且版本不变才跳过发布。
3. dev → main 的 PR 同样运行快速检查；main 实际提交使用同一工作流的完整测试模式，构建一次 tarball（npm 安装压缩包），从该包分别用 npm/pnpm 安装并出片，上传同一文件供发布 job 使用。
4. production job 用 OIDC（GitHub 提供的短期身份凭证）发布到 npm 的 pending 分发标签；下载准确版本，核对文件内容及源码提交，再实际出片。
5. 通过后将 npm latest 指向新版本，创建不可变 Git tag 和正式 GitHub Release。latest 是“最新版”的指针；旧任务重跑不得倒退 npm 或 GitHub 的指针。
6. 发布后将 main 合并回 dev，保留历史。Skill 安装只用正式 Release tag，不跟随默认 dev 或正在发布的 main。

全部验证在单一 macOS runner 上运行；没有宣称 Windows/Linux 或其他 Agent 已验收。发布 job 不回写版本号，不保存长期 npm token，不每次额外审批。

## 首次发布身份初始化

包拥有者为 npm 用户 `plonguo`，许可证 MIT。先通过 `npm login --auth-type=web` 登录本机，密码/验证码只输入 npm 官方页面，不放进对话、源码或 Actions secret。

npm 新包尚不存在时，不能先假装已经配置该包的 Trusted Publisher（可信发布来源）。首次使用 **main CI 已验证的真实 tarball**，本机执行 `npm publish /absolute/takecraft-0.2.0.tgz --access public --tag pending`；不上传占位包。需要时由包拥有者完成官方身份验证。

随后在 npm 的 takecraft 包设置里添加 GitHub Actions Trusted Publisher：

| 字段 | 值 |
| --- | --- |
| Organization or user | PlonGuo |
| Repository | takecraft |
| Workflow filename | release.yml |
| Environment | production |
| Allowed actions | 允许直接 npm publish；允许 npm dist-tag |

GitHub production 环境仅允许 main 部署。当前 dist-tag 的 OIDC 权限独立于 publish，本工作流固定 npm 12.2.1、Node 24；不要只开放 stage publish。绑定后重新运行同一 main 提交失败的 Release job，流程校验已存在内容并补齐 latest/tag/Release。

新可信来源必须在两天内通过它成功发布一个版本，才会完成验证并绑定仓库身份；否则配置过期。首次手动发布后，恢复旧任务只会核对已有包，不能替代这次自动发布。应准备一个有实际文档或修复内容的修订版，通过正常 dev → main 流程发布，再在 npm 设置确认来源状态已验证。

## 失败与恢复

- 上传前失败：修复或重跑原 Actions run；npm 未变化。
- 上传后 npm 同步：读回校验最多等待三分钟，间隔从两秒递增到十五秒；完整性错误立即失败。超时可以重跑原发布 job，不重复上传已有版本。
- 上传后下载/出片失败：不会推进 latest 或创建 Release。原内容可重试网络故障；内容有问题必须升新版本，不能覆盖或删除已发布版本。
- npm 成功、GitHub 失败：全流程仍失败；重跑原 run 补齐 tag/Release。已有包的版本、内容哈希和源码提交必须一致，已有 tag 必须指向原提交。
- 新版已发布后重跑旧任务：只补旧版缺失产物，不能回退 latest。发布工作流串行且不取消正在发布的任务；GitHub 等待队列可能只保留一个 pending run，因此避免同时合入多份发布 PR，确认每版发布后再发下一版。
- Actions artifact 保存 7 天；过期后重新运行该次 **全部 jobs**，从同一 SHA 重建并验证，再恢复。源码、依赖锁定与内容核对保证不静默接受不同包。

本地只读检查：`node scripts/release.mjs /absolute/package.tgz --dry-run`。要求包来自当前干净提交；不会向远端写入。正式发布只允许 main Actions。`npm whoami` 只检查本机登录，不能证明 Actions 的 OIDC 权限。

来源：[SemVer](https://semver.org/)、[npm 可信发布与 dist-tag 权限](https://docs.npmjs.com/trusted-publishers/)、[GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

自检：修 bug 是否一定升主版本？Skill 为什么不能跟随 dev？npm 已上传但 GitHub 失败是否算发版完成？旧任务重跑能否覆盖最新版？
