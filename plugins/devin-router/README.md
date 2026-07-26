# Devin Router Integration

This integration routes complex Devin work through the model router before
execution planning.

Current limitation:

- exact runtime/model selection depends on Devin APIs that are not currently
  available here
- `packages/executor-devin` is an unsupported stub

## Routed Execution

Use this integration when a Devin task should be assessed before work starts.
The expected flow is task assessment, `prepare_execution`, route selection, and
worker-brief planning.

## Further Notes

See [the Devin integration notes](../../knowledge/devin-integration-notes.md)
for the current platform blocker and the expected integration flow.
