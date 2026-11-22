# Project working agreement

- Start by reading `HANDOFF.md`, its latest entry in `docs/agent-activity.md`, and the referenced patches. Verify current Git status and recent commits before editing.
- Before each work round, choose a unique round ID and run `node scripts/snapshot-handoff.mjs <round-id> before`.
- Keep changes focused on the user's TuneFree requirements and preserve existing features. For Vue/UI changes, check browser errors and desktop, narrow desktop and mobile viewports when feasible; distinguish static checks from visual acceptance.
- At the end of every round, append to `docs/agent-activity.md`: the user's request, engineering reasons, ordered operations, exact files/symbols and before/after behavior, commands with actual results including failures, initial/final Git state, and remaining tasks. Preserve earlier entries.
- Update `HANDOFF.md` as the current-state index, then run `node scripts/snapshot-handoff.mjs <round-id> after`. Patches are relative to the recorded HEAD; use before/after snapshots and the activity log to separate pre-existing work from this round.
- Respect existing user authorization. Report commits, pushes, deployments and checks only after they actually succeed. Keep credentials and private account data out of handoff records.
