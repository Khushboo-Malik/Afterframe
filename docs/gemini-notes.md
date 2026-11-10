# Gemini notes (README draft material)

Measured in sub-plan 03, Task 2. Sub-plan 09 folds this into the README.

## Model

- `GEMINI_MODEL=gemini-3.5-flash-lite`, chosen for cost.
- Price (paid tier, per 1M tokens): **$0.30 input / $2.50 output**, no announced change.
  For comparison, `gemini-3.8-flash` costs $0.75 / $3.75 until 2026-12-31, doubling from 2027-01-01.
- Billing: AI Studio **Prepay** credits (minimum $5), auto-reload off, so the balance is a hard cap.
  The Google Cloud $300 trial credit can't pay for Gemini API usage on accounts opened after 2026-03-02.
- Rate limits for the chosen model (AI Studio → Rate Limit): _TBD_ RPM / _TBD_ TPM / _TBD_ RPD.

## Measured with `smoke_gemini` (8:12 vlog, YouTube URL)

| Resolution | Input tokens | Output tokens | First chunk |
|---|---|---|---|
| low | 44,744 | 229 | 7.6s |
| high | 44,744 | 223 | 12.5s |

- ≈ **91 input tokens per second of video**, which matches the docs' rate for low resolution.
- `media_resolution` set on the request config made **no difference** for a YouTube URL on this
  model (low = high). We already pay the low rate, so this doesn't affect cost. The SDK also has
  a per-part `Part.media_resolution` if we ever need to force it.
- ≈ 109k input tokens per 20-min video → about **$0.034 (≈ ₹3)** for the video call.
  The extraction prompt's descriptions and the agent's calls (sub-plan 04) add a little on top.
- The agent model (`make_agent_model`) made exactly 1 tool call with `tool_choice="any"`.

## Measured with `try_ai pipeline` (sub-plan 04)

| Video | Places | Gemini calls | Input / output tokens | Places searches | Time | Cost |
|---|---|---|---|---|---|---|
| Tokyo itinerary, 14:15 | 20 (12 verified direct, 6 via agent) | 1 video + 6 agent | 82,613 / 2,015 | 20 / 26 | 28s | ≈ $0.030 (₹2.6) |
| Kashmir, 8:02, `--max-searches 3` | 18 (`partial` / `search_budget`) | 1 video | 44,533 / 1,452 | 3 / 3 | 6s | ≈ $0.017 (₹1.5) |

- An agent turn costs about 1.3k input tokens (≈ ₹0.04). Most agent candidates chose a match from
  the direct lookup's results in one turn; vague ones take 2 searches + 1 choice (3 turns).
- Places Text Search with our field mask bills as **Text Search Pro**: free up to 5,000/month on
  the global price list (35,000/month on the India list), so 5 videos/day stays at ₹0.
