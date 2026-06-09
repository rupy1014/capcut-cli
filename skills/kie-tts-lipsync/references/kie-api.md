# KIE / TTS workflow reference

## Sources checked

- KIE Infinitalk From Audio docs: https://old-docs.kie.ai/market/infinitalk/from-audio
- KIE Market task polling docs: https://old-docs.kie.ai/market/common/get-task-detail
- KIE File Upload API quickstart: https://old-docs.kie.ai/file-upload-api/quickstart
- Local reference project: `~/sideProjects/ai-jobdori`

## Current KIE Infinitalk request shape

`POST https://api.kie.ai/api/v1/jobs/createTask`

```json
{
  "model": "infinitalk/from-audio",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "image_url": "https://.../character.png",
    "audio_url": "https://.../voice.mp3",
    "prompt": "A young woman with long dark hair talking on a podcast.",
    "resolution": "480p"
  }
}
```

Authentication: `Authorization: Bearer $KIE_AI_API_KEY`.

Polling: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` with the same bearer token. Successful records expose `data.state: "success"` and often put result URLs in JSON string `data.resultJson` as `{"resultUrls":["..."]}`.

## Uploads

KIE file upload base URL is `https://kieai.redpandaai.co`.

- Local file stream upload: `POST /api/file-stream-upload` with multipart fields `file`, `uploadPath`, optional `fileName`.
- Uploaded files are temporary and currently documented as auto-deleted after 3 days.
- The helper uses KIE upload, not catbox, when local image/audio paths are provided.

## Cost assumptions copied from ai-jobdori

These are estimates for gating, not billing truth:

| Service | Estimate |
| --- | --- |
| ElevenLabs | `$0.000167` per character |
| Fish Audio | `$15 / 1M UTF-8 bytes`; Korean estimate `chars * 3 * 15 / 1_000_000` |
| KIE Infinitalk 480p | `$0.015` per second |
| KIE Infinitalk 720p | `$0.06` per second |
| Topaz 4x | `$0.07` per second |

## Postprocess defaults

KIE/AI video output can be inconvenient for editing tools. For CapCut/Shorts, re-encode to:

- H.264 `libx264`
- 30fps
- closed GOP around 15 frames
- `-movflags +faststart`
- no baked audio by default (`-an`)
- 9:16 output via blurred background + centered foreground for `--aspect shorts`

## Failure modes

- Missing keys: run `env-check`; do not expose values.
- KIE task stuck in `waiting`/`queuing`/`generating`: stop after timeout, report task id.
- `resultJson` schema drift: inspect saved sidecar JSON, then rerun with updated parser or direct result URL.
- Audio/video ratio mismatch: keep voiceover as separate audio in CapCut and use `encode --aspect shorts` for the visual layer.
