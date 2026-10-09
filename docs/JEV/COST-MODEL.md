# JEV Cost Model

## Unit framework
Every run records: `job_id, asset_type, input_count, model, provider, settings, predicted_cost, approved_ceiling, actual_cost, retries, cost_avoided, gauntlet_result, publish_state`.

Estimate best case, expected case, and guarded worst case. Include retries, tool calls, source images, judge calls, and final generation.

## Decision layer
- Video demo FACT: $0.18 / 1,700 email records = $0.0001059/record, or $0.106/1,000 classifications for that workload.
- Do not treat this as JEV tariff. Instrument actual pilot receipts.
- Economic role: cents that avoid dollars. Killing one bad Higgsfield 15s take avoids 105 credits; killing one fal 15s take avoids about $6.93.

## One source image
| Lane | Cost | Availability |
|---|---:|---|
| Gemini consumer Nano Banana 2 | $0 incremental | browser upload/send blocked |
| MuAPI Nano Banana edit | $0.03 | account has $0 balance |
| OpenRouter Qwen Image 3 + one ref | $0.033 | funded account |
| OpenRouter Seedream 5 Lite | $0.035 | funded account |
| fal original Nano Banana | $0.039 | key path unverified |
| OpenRouter Seedream 5 Pro + one ref | $0.048 | funded account; browser generation challenged |
| Higgsfield GPT Image 2 observed | 6.5 credits ~= $0.2795 monthly equivalent | 3,000 live credits |

## Five six-panel grids = 30 candidate slices
Assumes all 30 slices pass. Failures raise true cost.

| Lane | Five grids | Theoretical cost/slice |
|---|---:|---:|
| MuAPI Nano Banana | $0.15 | $0.0050 |
| OpenRouter Seedream 5 Lite | $0.175 | $0.00583 |
| OpenRouter Seedream 5 Pro + one ref/card | $0.24 | $0.0080 |
| Higgsfield GPT Image 2 | 32.5 credits ~= $1.3975 | $0.0466 |

## One finished 15s UGC package
One source image + one native 15s video.

| Lane | All-in |
|---|---:|
| MuAPI Mini 720p + MuAPI image | $1.23 |
| OpenRouter quoted video + MuAPI image | $3.4965; exact video model/provider still must be pinned |
| Higgsfield Seedance 2.5 + image | 111.5 credits ~= $4.7945 monthly equivalent; marginal cash $0 from existing credits |
| fal Seedance 2.5 720p 9:16 + image | $6.9726 |

## Three hooks x two closes = six 15s variants
| Lane | Videos only | With six new source images |
|---|---:|---:|
| MuAPI | $7.20 | $7.38 |
| OpenRouter quoted video lane | $20.799 | $20.979 with MuAPI images |
| Higgsfield | 630 credits ~= $27.09 | 669 credits ~= $28.767 |
| fal | $41.6016 | $41.8356 |

## One creator approval master + six-video matrix
Five grids for 30 candidate slices, before retries:
- MuAPI: $0.15 + $7.20 = **$7.35**.
- OpenRouter Seedream Pro grids + quoted OpenRouter videos: $0.24 + $20.799 = **$21.039**.
- Higgsfield: 32.5 + 630 = **662.5 credits**, about **$28.4875** monthly equivalent. Current 3,000 credits fund four rounds with 350 credits left.
- fal: $0.195 + $41.6016 = **$41.7966**.

## Current account truth
- Higgsfield: Ultra, 3,000 credits left. Mila native 15s Seedance 2.5 720p 9:16 High = 105 credits. Four 2K GPT Image 2 anchors = 26 credits total.
- OpenRouter: executiveusa@gmail.com, $13.39 available; four non-expired API keys visible by metadata.
- MuAPI: SSO works, but Add Credits remains incomplete and balance is $0.
- fal: fleet docs claim `FAL_AI_API -> FAL_KEY`; secret path is unproven and no current box can read Infisical.

## Guardrails
- JEV pilot is paused. Cost model is documentation only.
- JEV may predict and route, but cannot widen spend authority.
- Hard stop before total spend exceeds the owner-approved ceiling.
- Compare predicted vs actual and update rates from live provider receipts.
