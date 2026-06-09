---
name: kie-tts-lipsync
description: Generate cost-gated TTS voiceover assets with ElevenLabs/Fish Audio and KIE Infinitalk lip-sync video assets for CapCut/Shorts workflows. Use when the task mentions KIE/Kie.ai, TTS, voiceover, narration, lip-sync, talking character, Infinitalk, ElevenLabs, Fish Audio, or converting generated talking-head output into CapCut-ready media.
---

# KIE TTS Lip-sync

Project-local workflow for creating narration MP3s and talking-character MP4 assets before importing them into a CapCut draft.

## Hard rules

- Never print API key values. Only report whether env vars are set/missing.
- Paid calls require a dry-run/cost estimate first. Do not call ElevenLabs, Fish Audio, or KIE generation endpoints until the user explicitly approved the cost for that run.
- The helper loads `.env` from the current repo first, then `KIE_TTS_ENV` if set, then `~/sideProjects/ai-jobdori/.env` as a fallback.
- Default outputs go under `outputs/kie-tts-lipsync/`.
- For CapCut import, prefer H.264 MP4 with `-an`; keep narration/voice as separate MP3/WAV unless the draft intentionally needs baked audio.

## Quick commands

```bash
# Check keys without leaking values
node skills/kie-tts-lipsync/scripts/kie-media.mjs env-check

# Cost-only TTS preview; no paid API call
node skills/kie-tts-lipsync/scripts/kie-media.mjs tts \
  --speaker instructor \
  --text-file script.txt \
  --output outputs/kie-tts-lipsync/audio/narration.mp3 \
  --dry-run

# Generate TTS after explicit approval
node skills/kie-tts-lipsync/scripts/kie-media.mjs tts \
  --speaker student \
  --text "여기서부터 운명이 바뀌기 시작합니다." \
  --output outputs/kie-tts-lipsync/audio/student.mp3

# Cost-only KIE Infinitalk preview; no upload/generation
node skills/kie-tts-lipsync/scripts/kie-media.mjs lipsync \
  --image assets/character.png \
  --audio outputs/kie-tts-lipsync/audio/narration.mp3 \
  --prompt "A webtoon character speaks calmly to camera, subtle head motion." \
  --resolution 480p \
  --output outputs/kie-tts-lipsync/video/scene.mp4 \
  --dry-run

# Generate KIE lip-sync after approval, then postprocess for 9:16 Shorts
node skills/kie-tts-lipsync/scripts/kie-media.mjs lipsync \
  --image assets/character.png \
  --audio outputs/kie-tts-lipsync/audio/narration.mp3 \
  --prompt "A webtoon character speaks calmly to camera, subtle head motion." \
  --resolution 480p \
  --postprocess shorts \
  --output outputs/kie-tts-lipsync/video/scene.mp4

# Re-encode an existing KIE MP4 for CapCut/Shorts
node skills/kie-tts-lipsync/scripts/kie-media.mjs encode \
  --input raw-kie.mp4 \
  --output capcut-ready.mp4 \
  --aspect shorts
```

## Voice routing

| Speaker | Provider | Env vars |
| --- | --- | --- |
| `instructor` | ElevenLabs | `ELEVEN_LABS_API_KEY`, `ELEVEN_LABS_VOICE_INSTRUCTOR` or `ELEVEN_LABS_VOICE_ID` |
| `student` | Fish Audio | `FISH_AUDIO_API_KEY`, `FISH_AUDIO_VOICE_ID` |

Use `--provider elevenlabs|fish` or `--voice-id` only when overriding the default routing.

## CapCut production notes

- Lip-sync video is usually a foreground/character layer, not a full final edit. Import it as a visual asset, then keep the CapCut timeline responsible for captions, BGM, zoom/pan, transitions, and CTA.
- For webtoon-style Shorts, avoid tiny thumbnail overlays. Use full-frame character/background panels and let TTS/lip-sync cover only the shots where a character directly speaks.
- If the KIE output has odd codec/container behavior, run `encode --aspect shorts` before using it in CapCut.

See `references/kie-api.md` for endpoint notes, cost assumptions, and failure modes.
