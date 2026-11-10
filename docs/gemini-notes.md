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
