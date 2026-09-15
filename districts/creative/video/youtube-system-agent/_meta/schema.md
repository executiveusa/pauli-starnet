# Schema

## Closed node types

| type | location |
|---|---|
| team | `teams/<slug>/<Title>.md` |
| process | `teams/<slug>/processes/<slug>.md` |
| job | `teams/<slug>/jobs/<slug>.md` |
| data-asset | `teams/<slug>/data/data-<thing>.md` |
| governance | `teams/<slug>/governance.md` |

Process labels: `type`, `team`, `owner`, `ai-level` (L0-L3), `frequency`, `value`, `pain`, `consumes`, `produces`, `governance`. Names are kebab-case except human-browsed team cards. Links are wikilinks. One fact has one home.

## State

Each stage writes one product file and `gate.md` into its own `output/`. `gate.md` states `pending`, `approved`, or `changes-requested`, the approver, and timestamp. No later stage reads a pending output.
