# Note: deploy and rollback runbook

Written after the rollback we did at 3am, so the next one is boring.

- Keep the previous release artifact around. Rollback is "repoint, restart", not
  "rebuild from the old commit".
- Health-check the new release before shifting traffic. A failed deploy that
  never took traffic is a non-event.
- One command to roll back. If it takes more than one command, nobody will do it
  correctly under pressure.

Status: proven across several deploys. Adapt the health-check to your stack.
