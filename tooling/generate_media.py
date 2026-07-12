"""Generate chapter narration and a Sora intro with Azure AAD authentication.

The script keeps paid video submissions idempotent. It persists the Sora job ID
before polling and refuses to resubmit an ambiguous request unless --force-video
is explicitly supplied.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import pathlib
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST_PATH = pathlib.Path(__file__).with_name("media-manifest.json")
STATE_PATH = pathlib.Path(__file__).with_name(".media-state.json")
COGNITIVE_RESOURCE = "https://cognitiveservices.azure.com"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_az(arguments: list[str]) -> str:
    completed = subprocess.run(
        ["az", *arguments],
        capture_output=True,
        text=True,
        shell=os.name == "nt",
        timeout=120,
        check=False,
    )
    value = completed.stdout.strip()
    if completed.returncode != 0 or not value:
        detail = completed.stderr.strip() or "Azure CLI returned no value."
        raise RuntimeError(f"Azure CLI failed: {detail}. Run `az login` first.")
    return value


def aad_token() -> str:
    return run_az(
        [
            "account",
            "get-access-token",
            "--resource",
            COGNITIVE_RESOURCE,
            "--query",
            "accessToken",
            "-o",
            "tsv",
        ]
    )


def speech_resource_id() -> str:
    configured = os.environ.get("AZURE_SPEECH_RESOURCE_ID", "").strip()
    if configured:
        return configured

    account = os.environ.get("AZURE_SPEECH_ACCOUNT", "").strip()
    resource_group = os.environ.get("AZURE_SPEECH_RESOURCE_GROUP", "").strip()
    if not account or not resource_group:
        raise RuntimeError(
            "Set AZURE_SPEECH_RESOURCE_ID, or set both AZURE_SPEECH_ACCOUNT "
            "and AZURE_SPEECH_RESOURCE_GROUP."
        )

    return run_az(
        [
            "cognitiveservices",
            "account",
            "show",
            "--name",
            account,
            "--resource-group",
            resource_group,
            "--query",
            "id",
            "-o",
            "tsv",
        ]
    )


def load_json(path: pathlib.Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: pathlib.Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def request_bytes(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: int = 180,
) -> tuple[int, bytes]:
    request = urllib.request.Request(
        url,
        data=body,
        headers=headers or {},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def require_success(status: int, body: bytes, action: str) -> bytes:
    if 200 <= status < 300:
        return body
    detail = body[:500].decode("utf-8", errors="replace")
    raise RuntimeError(f"{action} failed with HTTP {status}: {detail}")


def synthesize_audio(config: dict[str, Any]) -> pathlib.Path:
    region = os.environ.get("AZURE_SPEECH_REGION", "eastus2")
    output = ROOT / config["output"]
    output.parent.mkdir(parents=True, exist_ok=True)

    ssml = (
        '<speak version="1.0" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" '
        f'xml:lang="{html.escape(config["language"])}">'
        f'<voice name="{html.escape(config["voice"])}">'
        f'<prosody rate="{html.escape(config["rate"])}" '
        f'pitch="{html.escape(config["pitch"])}">'
        f'{html.escape(config["text"])}'
        "</prosody></voice></speak>"
    )
    authorization = f"aad#{speech_resource_id()}#{aad_token()}"
    status, body = request_bytes(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        method="POST",
        headers={
            "Authorization": authorization,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "chakravarti-media-generator",
        },
        body=ssml.encode("utf-8"),
        timeout=120,
    )
    audio = require_success(status, body, "Speech synthesis")
    if len(audio) < 500:
        raise RuntimeError("Speech synthesis returned an unexpectedly small file.")

    output.write_bytes(audio)
    print(f"Audio ready: {output} ({len(audio)} bytes)")
    return output


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {}
    return load_json(STATE_PATH)


def save_video_state(status: str, **values: Any) -> dict[str, Any]:
    state = {"status": status, "updated_at": utc_now(), **values}
    write_json(STATE_PATH, state)
    return state


def submit_sora(config: dict[str, Any], endpoint: str) -> dict[str, Any]:
    request_id = uuid.uuid4().hex
    save_video_state(
        "submitting",
        request_id=request_id,
        submitted_at=utc_now(),
        output=config["output"],
    )
    payload = json.dumps(
        {
            "model": os.environ.get("AZURE_SORA_MODEL", "sora-2"),
            "prompt": config["prompt"],
            "seconds": config["seconds"],
            "size": config["size"],
        }
    ).encode("utf-8")
    api_version = os.environ.get("AZURE_SORA_API_VERSION", "preview")
    url = f"{endpoint}/openai/v1/videos?api-version={api_version}"

    for attempt in range(8):
        status, body = request_bytes(
            url,
            method="POST",
            headers={
                "Authorization": f"Bearer {aad_token()}",
                "Content-Type": "application/json",
                "X-Client-Request-Id": request_id,
            },
            body=payload,
        )
        if status == 429:
            time.sleep(min(90, 15 * (attempt + 1)))
            continue
        if status >= 500:
            save_video_state(
                "submission_unknown",
                request_id=request_id,
                submitted_at=utc_now(),
                provider_status=status,
                output=config["output"],
            )
            raise RuntimeError(
                f"Sora returned HTTP {status}; submission may have been accepted. "
                "Inspect Azure before using --force-video."
            )
        if status >= 400:
            save_video_state(
                "not_submitted",
                request_id=request_id,
                provider_status=status,
                output=config["output"],
            )
            require_success(status, body, "Sora submission")

        response = json.loads(body)
        video_id = response["id"]
        return save_video_state(
            "submitted",
            request_id=request_id,
            provider_job_id=video_id,
            submitted_at=utc_now(),
            output=config["output"],
        )

    save_video_state(
        "not_submitted",
        request_id=request_id,
        reason="rate_limit_exhausted",
        output=config["output"],
    )
    raise RuntimeError("Sora submission exhausted rate-limit retries.")


def poll_and_download_sora(
    config: dict[str, Any],
    endpoint: str,
    state: dict[str, Any],
) -> pathlib.Path:
    video_id = state.get("provider_job_id")
    if not video_id:
        raise RuntimeError("No Sora provider job ID is available to resume.")

    api_version = os.environ.get("AZURE_SORA_API_VERSION", "preview")
    headers = {"Authorization": f"Bearer {aad_token()}"}
    status_url = f"{endpoint}/openai/v1/videos/{video_id}?api-version={api_version}"

    for _ in range(180):
        status, body = request_bytes(status_url, headers=headers)
        response = json.loads(require_success(status, body, "Sora status"))
        provider_status = response.get("status")
        if provider_status == "completed":
            break
        if provider_status == "failed":
            save_video_state(
                "failed",
                provider_job_id=video_id,
                error=response.get("error"),
                output=config["output"],
            )
            raise RuntimeError(f"Sora render failed: {response.get('error')}")
        time.sleep(10)
    else:
        raise TimeoutError(f"Sora job {video_id} did not finish within 30 minutes.")

    content_url = (
        f"{endpoint}/openai/v1/videos/{video_id}/content"
        f"?api-version={api_version}"
    )
    status, body = request_bytes(content_url, headers=headers)
    video = require_success(status, body, "Sora download")
    if len(video) < 1024:
        raise RuntimeError("Sora returned an unexpectedly small video.")

    output = ROOT / config["output"]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(video)
    save_video_state(
        "succeeded",
        provider_job_id=video_id,
        output=config["output"],
        sha256=hashlib.sha256(video).hexdigest(),
        completed_at=utc_now(),
    )
    print(f"Video ready: {output} ({len(video)} bytes)")
    return output


def generate_video(config: dict[str, Any], force: bool) -> pathlib.Path:
    endpoint = os.environ.get("AZURE_FOUNDRY_ENDPOINT", "").strip().rstrip("/")
    if not endpoint:
        raise RuntimeError("Set AZURE_FOUNDRY_ENDPOINT before generating video.")

    output = ROOT / config["output"]
    if output.exists() and not force:
        print(f"Video already exists: {output}")
        return output

    state = load_state()
    if force:
        state = {}
    elif state.get("status") in {"submitting", "submission_unknown"}:
        raise RuntimeError(
            "A prior Sora submission is ambiguous. Inspect Azure, then rerun with "
            "--force-video only if a new paid render is intended."
        )

    if state.get("status") not in {"submitted", "succeeded"}:
        state = submit_sora(config, endpoint)

    return poll_and_download_sora(config, endpoint, state)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", action="store_true", help="Generate narration only.")
    parser.add_argument("--video", action="store_true", help="Generate Sora intro only.")
    parser.add_argument(
        "--force-video",
        action="store_true",
        help="Submit a new paid Sora render even when state or output exists.",
    )
    arguments = parser.parse_args()
    manifest = load_json(MANIFEST_PATH)
    run_audio = arguments.audio or not arguments.video
    run_video = arguments.video or not arguments.audio

    if run_audio:
        synthesize_audio(manifest["audio"])
    if run_video:
        generate_video(manifest["video"], arguments.force_video)


if __name__ == "__main__":
    main()
