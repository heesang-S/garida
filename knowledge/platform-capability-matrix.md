# Platform Capability Matrix

This matrix is the shared source of truth for what the current integrations can
and cannot do across supported platforms.

| Platform | Exact model switching | MCP support | External executor support | Worker result return path | Current status |
| --- | --- | --- | --- | --- | --- |
| Codex | available through custom integration | supported | supported | available through custom integration | supported through `plugins/codex-router` and `packages/executor-codex`; current-chat switching remains host-dependent |
| Claude Code | unknown / blocked by platform API | available through custom integration | available through custom integration | available through custom integration | supported for routing/planning through `plugins/claude-router`; exact execution remains blocked by Claude Code runtime hooks |
| Devin | unknown / blocked by platform API | unknown / blocked by platform API | available through custom integration | unknown / blocked by platform API | supported for routing/planning through `plugins/devin-router`; exact execution remains blocked by Devin runtime hooks |
| Personal agent | supported | available through custom integration | supported | supported | supported through `plugins/personal-agent-router` and direct executor integration |

## Status Terms

- `supported`: available in the repo today with the current integration path.
- `unsupported`: not available and not currently wired through a supported path.
- `unknown / blocked by platform API`: depends on platform/runtime hooks that
  are not currently confirmed or exposed here.
- `available through custom integration`: possible when the calling host wires
  the router and executor packages together explicitly.

## Notes

- `Exact model switching` means the host can honor `route.model_id` for the
  next worker execution, not just display the recommendation.
- `MCP support` means the platform can consume router MCP tools directly or via
  a thin integration layer.
- `External executor support` means work can be handed to an executor package
  outside the current chat session.
- `Worker result return path` means worker and reviewer outputs can flow back to
  the calling agent in a deterministic shape.
