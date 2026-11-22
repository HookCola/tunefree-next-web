# TuneFree 操作与修改记录

每轮在末尾追加工程操作、文件差异、命令结果和待办。`HANDOFF.md` 指向最新一轮。

## 原 Antigravity 对话的最后三次修复

根据已保存对话 `99ed1cd5-9067-43d7-aae5-d37f5eb8ef5e` 与实际 Git 提交回溯。以下浏览器行为在本轮尚未复测。[原始提交补丁](handoffs/antigravity-historical/historical-fixes.patch)

| 提交 | 用户遇到的问题 | 实际改动 |
| --- | --- | --- |
| `7322115` | 刷新后白屏 | 前置 `user` 等状态声明，移除 `v-cloak` 强制隐藏。 |
| `754f18f` | 页面先闪一下再变成纯背景 | 把无定义的 `playbackQueue.length` 替换为 `favoriteTracks.length`。底栏按钮跳到乐库。 |
| `0116bfc` | 搜索框偏左，顶栏底部有白线 | 在 `public/index.html` 设置搜索组合在主内容区居中，主题和头像按钮绝对定位至右侧，移除统一顶栏 `border-b`。 |

## 20261121-codex-takeover

用户要求接着 TuneFree 对话，并把 Codex 每轮的完整操作步骤和具体修改交给 Antigravity。

起点为 `main` 上的 `0116bfc8c16c2e4ed108cb88041b68b9b039e5f3`。当时工作区干净，本地 `origin/main` 指向同一提交。首轮起点记录依据编辑前执行的 `git status` 回建。[起点记录](handoffs/20261121-codex-takeover/before.json)

### 操作顺序

1. 只读查询 Antigravity 的会话索引和最近消息，定位标题 `Analyze TuneFree Agent Skill`。从当时的工具调用定位 `C:\Users\hookc\.gemini\antigravity\scratch\tunefree-web`，确认它与当前 Math 工作区是两个项目。
2. 在原仓库执行 `git status --short --branch`、`git log -4 --oneline`、`git show 0116bfc -- public/index.html`，成功核对版本、修改文件和旧修复。查看 `package.json` 与 `README.md`，确认入口为 `public/index.html` 和 `node server.mjs`。
3. 检查顶栏、音源胶囊、`favoriteTracks` 和 Vue 初始化。此前的三次修复确实已进入代码。窄桌面按钮碰撞和手机滚动时两个 sticky header 的行为仍需实测。
4. 核对本机 Antigravity 扩展清单，确认可从 `Antigravity: Search / Pick Conversation` 恢复原会话，再用 `Add to Antigravity Chat` 附上接力文件。
5. 在仓库新增初版 `HANDOFF.md`、`AGENTS.md` 和 `docs/agent-switching.md`，整理用户已定下的布局、动画、主题、歌词、会员与乐库要求。
6. 检查 Vue 内联脚本和服务端脚本语法。探测 `localhost:7101` 超时，于是启动端口 `17101` 的临时服务验证 HTTP 输出，再结束该测试子进程。
7. 按用户澄清，把摘要扩展为这份逐步日志、历史原始补丁与每轮完整文件快照。给项目指令和切换步骤增加编辑前后导出、记录实际验证与保留历史的要求。

### 具体文件修改

| 文件 | 修改情况及原因 |
| --- | --- |
| `AGENTS.md` | 新增。指导接手方读索引、逐步日志与补丁，并在每轮开始和结束保存快照。 |
| `HANDOFF.md` | 新增。汇总工作基线、用户已经定下的界面偏好、待验收项，链接最新证据。 |
| `docs/agent-switching.md` | 新增。写明在 VS Code 打开旧 Antigravity 会话、附上记录和换回 Codex 的步骤，提供接力提示语。 |
| `docs/agent-activity.md` | 新增。逐项保存这次实际操作、修改原因、命令结果和未完成工作。 |
| `scripts/snapshot-handoff.mjs` | 新增。导出相对 HEAD 的 tracked 和非忽略 untracked 差异、文件哈希、Git 状态。HEAD 变化时另存两个提交之间的差异。 |
| `docs/handoffs/` | 新增。保存原 Antigravity 修复及这轮 before/after 的差异和清单。生成的证据不收入它自己的差异。 |

本轮代码差异仅涉及接力文件，应用行为仍以 `0116bfc` 为基线。[完整文件差异](handoffs/20261121-codex-takeover/after.patch)

### 实际验证

- `git status --short --branch`、`git log -4 --oneline`、`git show 0116bfc -- public/index.html` 均退出 0。仓库在开始编辑时干净。
- `node --version` 输出 `v22.22.0`。提取三个非空 HTML 内联脚本后运行 `node --check`，以及检查 `server.mjs`、`src/worker.js`、`public/_worker.js` 和 `scripts/build_icons.cjs`，均通过。
- `localhost:7101` 请求超时，未观察到该端口的监听。以 `PORT=17101` 启动 `node server.mjs` 后，`/` 和 `/assets/css/icons.css` 均返回 HTTP 200，HTML 包含 `top-search-input` 和 `.mount('#app')`。测试子进程已结束。
- `node --check scripts/snapshot-handoff.mjs` 通过。在独立临时 Git 仓库实测 before/after，覆盖已有未提交改动、期间提交、编辑和删除、中文文件名、二进制文件、排除接力产物和测试凭证文件。`git apply --check --reverse` 通过，重复轮次和无效 ID 按预期拒绝。
- 浏览器布局、登录和音频播放尚未复测。下一次验收应量测 1280px、1024/1100px、390px 的搜索组合中心与按钮碰撞，并检查移动端滚动及 Vue 控制台错误。

接手方先读[文件差异](handoffs/20261121-codex-takeover/after.patch)与[清单](handoffs/20261121-codex-takeover/after.json)，再对照当前 Git 状态。继续用户下一项具体调整，或先验收上轮界面。


## 20261122-start-local-server

用户要求启动本地 TuneFree 网页。首个启动请求因自动审批上游服务错误未执行；复查端口无响应后，经审批入口重试。编辑前已保存本轮 before 快照，保留原有未提交接力文件。

执行步骤：以隐藏窗口后台运行 Node，工作目录为原 TuneFree 仓库，进程内 PORT=7101；等待启动后请求首页与图标样式。

结果：PID 32252，首页 HTTP 200，包含顶部搜索输入，图标 CSS HTTP 200。地址 http://localhost:7101 。服务保留运行供用户查看。未修改应用代码、未提交或推送；浏览器布局、音频和登录仍未验收。

## 20261122-mobile-and-source-polish

用户提出四项调整：
1. 音源切换格式统一，改为3个颜色的圆点（绿/红/橙）加文字（QQ/网易/酷我），选项样式类似复选框单选（带选中勾选标记与对齐）。
2. 主页/探索发现页将“类别浏览”移动到页面最底部。
3. 删除“类别浏览”每个卡片框里的“精选专区”（原精选推荐）文字，保留纯净分类标题与播放悬浮。
4. 修复手机视图下播放栏被底部导航遮挡消失的问题。

执行步骤与修改：
1. `public/index.html` 顶栏音源切换胶囊统一为绿点+QQ、红点+网易、橙点+酷我，选中状态呈现白底/深灰高亮、细边框与选中小勾图标 `fa-check`，在移动端与桌面端保持完全一致且紧凑统一的对齐格式。
2. 搜索框组合在窄桌面增加阶梯式响应式最大宽度限制（`max-w-[480px] sm:max-w-lg xl:max-w-2xl`），彻底消除 1024px 平板宽度下搜索展开胶囊与右上角头像按钮的碰撞重叠（实测留白安全距离从 -58px 提升至 +22px）。
3. 探索页将“类别浏览”板块从最顶端移动至“红心收藏快捷切片”下方（页面最底部）；删除了分类卡片内的“精选专区”多余标签。
4. 解决手机视图播放底栏被遮挡：将播放器定位从原重合的 `bottom-0` 调整为 `bottom-[60px] md:bottom-0`（移动端避开高 60px 的底部标签栏），并为移动端播放条顶部加入超细微播放进度指示条（mini scrubber）；内容主区域底部填充增加至 `pb-36` 避免内容被双底栏遮挡。

实际验证：
- 真实无头 Chrome 跨视口测试通过：
  - 移动端（390px）：底部标签栏（top 784, bottom 844, height 60），播放器（top 720, bottom 784, height 64），`isPlayerDirectlyAboveNav: true`，播放栏完美悬浮于底部导航上方且完全可见。
  - 窄桌面（1024px）：搜索组中心 632px 与主内容区中心 632px 完全一致，距右侧控件留白间距为 +22px，无碰撞。
  - 控制台错误为 0，Vue 渲染正常。


## 20261122-dropdown-source-selector

用户反馈：移动端三个平铺音源按钮占用了过多横向宽度，导致搜索框被压缩过窄，几乎无法输入；要求改为下拉菜单式的选择框。

执行步骤与修改：
1. `public/index.html` 顶栏音源选择器改为紧凑型下拉菜单组件（`#top-search-source-picker`）：
   - 默认折叠态为紧凑胶囊按钮（宽约 71px），动态显示当前选中的圆点颜色（绿/红/橙）、音源名称（QQ/网易/酷我）及下拉旋转箭头；
   - 点击展开浮动毛玻璃下拉菜单，列出三项音源、对应颜色圆点与选中勾选状态（`fa-check`）；
   - 点击选项自动切换音源并收起下拉菜单；全局监听点击外部自动收起。
2. 搜索输入框在 390px 移动端视口宽度从原 ~100px 恢复到 287px（占主视口约 74%），彻底解决搜索框被压缩变形的问题。

实际验证：
- 真实 Chrome 390px 自动化量测：
  - 触发器宽度 71px，输入框宽度 287px，舒适宽敞；
  - 点击正常弹出下拉菜单，3 个选项与选中状态准确；
  - 选中网易后，触发器即时更新为红点+网易并自动关闭菜单；
  - 控制台错误 0。

