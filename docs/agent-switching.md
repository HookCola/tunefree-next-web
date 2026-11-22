# Codex 与 Antigravity 双向接力

两边共用真实项目目录：`C:\Users\hookc\.gemini\antigravity\scratch\tunefree-web`。

每轮具体操作写入 `docs/agent-activity.md`，完整文件差异保存在 `docs/handoffs/`，`HANDOFF.md` 是最新状态的入口。接手方先看操作记录和补丁，就能知道每个文件为什么改、怎么改、验证到哪一步。

## 每轮必须留下的内容

1. 编辑前选唯一轮次 ID，运行 `node scripts/snapshot-handoff.mjs <轮次ID> before`，记录初始 HEAD、工作区和完整差异。
2. 结束前追加逐步日志：用户要求、原因、按顺序的操作、文件/符号、修改前后行为、实际命令和结果、失败与未完成项。
3. 更新 `HANDOFF.md` 指向最新记录，运行 `node scripts/snapshot-handoff.mjs <轮次ID> after`，保存完整工作区差异及文件哈希。如果 HEAD 变了，同一目录还会保存两次 HEAD 之间的 `committed.patch`。已有轮次会保留。
4. 原本已有未提交改动时，对照 before/after 的 HEAD、差异和操作日志区分本轮工作，不能把全部 dirty changes 都说成刚修改的。补丁目录排除自身，避免递归。

`AGENTS.md` 已写入上述每轮执行要求。脚本不提交、不暂存、不推送，也不修改聊天数据库。文档与补丁描述可审阅的工程操作和代码变化。

## 换回原 Antigravity 会话

1. 在 VS Code 中打开上述项目目录，等当前助手结束编辑。
2. `Ctrl+Shift+P` → `Antigravity: Search / Pick Conversation` → 搜索 `Analyze TuneFree Agent Skill`。
3. 右键 `HANDOFF.md` → `Add to Antigravity Chat`。
4. 发送下面这句话：

   > 按 HANDOFF.md 接力：先读最新逐步操作记录、before/after 补丁和 manifest，再检查当前 git 状态。承接剩余任务，保留已有改动；每轮结束继续记录完整操作步骤、具体文件差异和验证结果。

原会话 ID：`99ed1cd5-9067-43d7-aae5-d37f5eb8ef5e`。两个菜单命令已由本机扩展 v1.13.0 的 package.json 核对。

## 换回 Codex

在相同 TuneFree 目录继续或新开任务，发送上面的接力提示语。如果仍在 Math 的旧聊天里，先明确给出 TuneFree 绝对路径。

## 本轮交接

完整记录：[agent-activity.md](agent-activity.md)。本轮建立详细接力方式，应用代码未改；临时 HTTP 检查通过，实际浏览器布局仍待验收。换电脑时将记录、补丁和所需代码一起同步。
