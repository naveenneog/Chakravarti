# Azure Media Generation Pipeline

The prototype uses keyless Microsoft Entra authentication through the signed-in
Azure CLI. No API keys or access tokens are stored in the repository.

## Outputs

| Asset | Azure service | Runtime path |
| --- | --- | --- |
| English India narration | Azure AI Speech | `public/media/kalinga-intro-en-IN.mp3` |
| Mobile chapter cinematic | Azure Sora 2 | `public/media/kalinga-intro.mp4` |
| Mauryan campaign narration | Azure AI Speech | `public/media/maurya/intro-narration.mp3` |
| Chandragupta council voice | Azure AI Speech | `public/media/maurya/chandragupta.mp3` |
| Kautilya council voice | Azure AI Speech | `public/media/maurya/kautilya.mp3` |
| Mauryan campaign cinematic | Azure Sora 2 | `public/media/maurya/intro.mp4` |

The text, voice, prompt, duration, and output paths live in
`tooling/media-manifest.json`.

## Configure

Copy `.env.example` values into the current PowerShell session or your secure
local environment. Do not commit a populated `.env`.

```powershell
$env:AZURE_FOUNDRY_ENDPOINT = "https://<account>.cognitiveservices.azure.com"
$env:AZURE_SPEECH_REGION = "eastus2"
$env:AZURE_SPEECH_RESOURCE_ID = "/subscriptions/.../accounts/<account>"
az login
```

## Generate

```powershell
python tooling\generate_media.py --audio
python tooling\generate_media.py --video
python tooling\generate_maurya_voices.py
python tooling\generate_media.py --video `
  --manifest tooling\maurya-media-manifest.json `
  --state tooling\.media-state-maurya.json
```

Running with no mode flag generates both.

Each Sora path writes its specified `tooling/.media-state*.json` before the paid
submission and stores the provider job ID before polling. A crashed or ambiguous
submission is not automatically repeated. `--force-video` is an explicit paid
re-render.

## Media doctrine

- Sora intros are short, skippable, centered for portrait crop, and contain no
  historical claims that are absent from the chapter evidence brief.
- No generated clip should invent a named historical person's exact face.
- Armor, architecture, flags, and weapons require a period-material review.
- No gore. The human cost is conveyed through sound, landscape, aftermath, and
  the codex.
- Narration names uncertainty directly.
- All spoken content also appears as text.

## Localization

Narration manifests should later add Indian-language tracks using Azure neural
voices. Translation is reviewed as historical writing, not treated as a raw UI
string conversion. Proper names, titles, dates, and evidence labels require a
human review pass.
