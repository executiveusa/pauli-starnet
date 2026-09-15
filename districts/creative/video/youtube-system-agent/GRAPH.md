# YouTube System Agent graph

```mermaid
graph TD
  B[Creative District] --> Y[YouTube System Agent]
  Y --> M[Methodology Maintenance]
  Y --> C[Client Channel]
  Y --> F[Faceless Channel]
  Y --> T[Brand Training]
  J[20-video Jake Trinder corpus] --> M
  E[Performance evidence] --> M
  M --> P[Operating Philosophy]
  P --> C
  P --> F
  P --> T
  BR[Brand System] --> C
  BR --> F
  BR --> T
  C --> CP[Client Video Package]
  F --> FP[Faceless Video Package]
  CP --> A[Analytics + Business Outcomes]
  FP --> A
  A --> E
  G[Governance] -. approval .-> C
  G -. approval .-> F
  G -. certification .-> T
```

## Edge register

| From | Relationship | To |
|---|---|---|
| teaching corpus | evidence for | methodology maintenance |
| performance evidence | revises | operating philosophy |
| operating philosophy | constrains | every production/training workflow |
| brand system | constrains | client, faceless, training workflows |
| client brief | starts | client-channel workflow |
| niche charter | starts | faceless-channel workflow |
| approved video package | produces | performance evidence |
| governance | gates | account, client contact, spend, publish |
