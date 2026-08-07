"""Generate the Chandragupta hero assets: gpt-image-2 concepts, then 3D meshes.

Two stages, each independently re-runnable:

1. Concept art via Azure ``gpt-image-2`` (AAD auth, same resource as the Sora
   and speech pipelines). Paid, so it is idempotent by default -- an existing
   PNG is reused unless ``--force`` is given.
2. Image-to-3D via the Hugging Face TRELLIS Space when ``HF_TOKEN`` is set,
   falling back to the local TripoSR ONNX graph, which needs no token.

Historical framing lives in ``nanda-asset-manifest.json``. No contemporary
likeness of Chandragupta Maurya survives, so the hero is explicitly a gameplay
reconstruction assembled from Mauryan-era material culture, not a portrait.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import urllib.error
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST_PATH = pathlib.Path(__file__).with_name("nanda-asset-manifest.json")
COGNITIVE_RESOURCE = "https://cognitiveservices.azure.com"
DEFAULT_ENDPOINT = "https://ai-contosohub530569751908.cognitiveservices.azure.com"
IMAGE_DEPLOYMENT = "gpt-image-2"
HUNYUAN_SPACE = "tencent/Hunyuan3D-2"

# Megasthenes, as summarised by Arrian (Indica 16), describes the Indian
# foot-soldier carrying a broad sword rather than a slender blade. That single
# surviving description is the whole evidential basis for the shape below.
SWORD_PROMPT = (
    "A single ancient Indian broad-bladed iron sword, isolated on a pure white "
    "background. Straight double-edged blade, wide and heavy, tapering to a "
    "rounded point. Simple iron crossguard, a plain wrapped leather grip, and a "
    "small disc pommel. Weathered dark iron with subtle forge texture, no "
    "engraving, no gemstones, no gold. Shown flat side-on, vertical, complete "
    "from pommel to point, centred in frame with even neutral studio lighting "
    "and no cast shadow. Photographic archaeological catalogue style. No text, "
    "no watermark, no hands, no background objects."
)

HERO_PROMPT = (
    "Full-body character reference of a lean, athletic young North Indian "
    "warrior-king of the late fourth century BCE, standing in a neutral "
    "straight-legged A-pose facing the viewer, both arms slightly away from the "
    "body. He wears a white cotton dhoti wrapped to mid-calf with fine vertical "
    "pleats, a saffron-ochre sash knotted at the waist, and a folded cloth "
    "turban. Bare chest and shoulders with a simple beaded necklace and plain "
    "gold armlets. Dark hair, short trimmed beard, warm brown skin. A broad "
    "iron sword is sheathed at his left hip. Muted natural linen and earth "
    "colours, no plate armour, no European medieval elements, no crown, no "
    "chainmail. Pure white background, even neutral studio lighting, no cast "
    "shadow, full figure from head to feet centred in frame. Realistic "
    "museum-reconstruction illustration. No text, no watermark."
)

HERO_TPOSE_PROMPT = (
    "Orthographic front-view character model sheet of an ancient Indian "
    "warrior-king of the late fourth century BCE, drawn for 3D reference. The "
    "figure stands upright and perfectly symmetrical, facing forward, with both "
    "arms held straight out to each side at shoulder height so the body forms a "
    "capital letter T. Legs straight and vertical, feet shoulder-width apart. He "
    "wears a folded cream cloth turban, a cream cotton upper cloth draped across "
    "the chest and over the left shoulder, a white cotton dhoti wrapped to "
    "mid-calf with fine vertical pleats, and a saffron-ochre sash knotted at the "
    "waist. Plain gold armlets and a simple beaded necklace. Dark hair, short "
    "trimmed beard, warm brown skin, barefoot. Nothing is held in the hands and "
    "no weapon is worn. Muted natural linen and earth colours. Pure white "
    "background, flat even frontal lighting, no cast shadow, the complete figure "
    "from the top of the turban to the soles of the feet centred in frame. "
    "Realistic museum-reconstruction illustration. No text, no watermark."
)

HERO_BACK_PROMPT = (
    "Orthographic rear-view character model sheet of an ancient Indian "
    "warrior-king of the late fourth century BCE, drawn for 3D reference, seen "
    "from directly behind. The figure stands upright and symmetrical with both "
    "arms held straight out to each side at shoulder height so the body forms a "
    "capital letter T. Legs straight and vertical, feet shoulder-width apart. "
    "Visible from behind: the back of a folded cream cloth turban, dark hair at "
    "the nape of the neck, warm brown skin across the upper back and shoulders, "
    "a cream cotton upper cloth draped over the left shoulder and hanging down "
    "the back, a saffron-ochre sash knotted at the waist, and a white cotton "
    "dhoti wrapped to mid-calf with fine vertical pleats. Plain gold armlets. "
    "Barefoot, soles not visible. The face is not visible. Nothing is held in "
    "the hands and no weapon is worn. Muted natural linen and earth colours. "
    "Pure white background, flat even lighting, no cast shadow, the complete "
    "figure from the top of the turban to the heels centred in frame. Realistic "
    "museum-reconstruction illustration. No text, no watermark."
)

ASSETS: dict[str, dict[str, Any]] = {
    "mauryan-sword": {
        "id": "mauryan-sword",
        "prompt": SWORD_PROMPT,
        "size": "1024x1024",
        "concept": "public/media/nanda/asset-concepts/mauryan-sword.png",
        "output": "public/models/nanda/mauryan-sword.glb",
        "seed": 512207,
        "historicalNote": (
            "An original broad-bladed iron sword built from the single surviving "
            "description of Indian infantry equipment in Megasthenes as summarised "
            "by Arrian (Indica 16). It does not reproduce an excavated object and "
            "makes no claim to an exact Mauryan typology. Gameplay reconstruction."
        ),
    },
    "chandragupta-hero": {
        "id": "chandragupta-hero",
        "prompt": HERO_PROMPT,
        "size": "1024x1536",
        "concept": "public/media/nanda/asset-concepts/chandragupta-hero.png",
        "output": "public/models/nanda/chandragupta-hero.glb",
        "seed": 320301,
        "historicalNote": (
            "No contemporary likeness or physical description of Chandragupta "
            "Maurya survives. This figure is a gameplay reconstruction assembled "
            "from broad Mauryan-era material culture -- draped cotton dhoti, "
            "waist sash, folded turban and simple ornament -- and is never "
            "presented as a portrait or as evidence of his appearance."
        ),
    },
    "chandragupta-hero-tpose": {
        "id": "chandragupta-hero-tpose",
        "prompt": HERO_TPOSE_PROMPT,
        "size": "1024x1536",
        "concept": "public/media/nanda/asset-concepts/chandragupta-hero-tpose.png",
        "output": "public/models/nanda/chandragupta-hero-tpose.glb",
        "seed": 320302,
        "historicalNote": (
            "The same gameplay reconstruction as chandragupta-hero, generated in a "
            "neutral T-pose so it can be skinned to the CC0 Quaternius skeleton and "
            "inherit its animation set. Not a portrait and not evidence of "
            "Chandragupta Maurya's appearance."
        ),
    },
    "chandragupta-hero-back": {
        "id": "chandragupta-hero-back",
        "prompt": HERO_BACK_PROMPT,
        "size": "1024x1536",
        "concept": "public/media/nanda/asset-concepts/chandragupta-hero-back.png",
        "output": "public/models/nanda/chandragupta-hero-back.glb",
        "seed": 320303,
        "historicalNote": (
            "Rear view of the same gameplay reconstruction, used only to colour "
            "the back of the rigged mesh. The third-person camera sits behind the "
            "player, so this is the surface the player actually sees."
        ),
    },
}


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


def generate_concept(asset: dict[str, Any], destination: pathlib.Path) -> None:
    endpoint = (
        os.environ.get("AZURE_FOUNDRY_ENDPOINT", "").strip().rstrip("/")
        or DEFAULT_ENDPOINT
    )
    payload = json.dumps(
        {
            "model": IMAGE_DEPLOYMENT,
            "prompt": asset["prompt"],
            "n": 1,
            "size": asset["size"],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{endpoint}/openai/v1/images/generations?api-version=preview",
        data=payload,
        headers={
            "Authorization": f"Bearer {aad_token()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"gpt-image-2 returned HTTP {error.code}: {detail}") from error

    encoded = body["data"][0].get("b64_json")
    if not encoded:
        raise RuntimeError("gpt-image-2 returned no inline image payload.")
    image = base64.b64decode(encoded)
    if len(image) < 4096:
        raise RuntimeError("gpt-image-2 returned an unexpectedly small image.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(image)


def generate_glb_hunyuan(
    concept: pathlib.Path,
    output: pathlib.Path,
    *,
    seed: int,
    steps: int = 50,
    octree_resolution: int = 380,
    target_faces: int = 4000,
) -> None:
    """Build a mesh with the Tencent Hunyuan3D-2 Space, then fit it for mobile.

    Far better shape fidelity than the TripoSR fallback, which melts thin
    objects like a sword blade into a slab. The Space is reachable anonymously;
    HF_TOKEN is used when present for a better queue position.

    The Space's ``/generation_all`` texture pass is currently broken server-side,
    so this takes the untextured shape and the game supplies the material. For a
    forged-iron blade that is the better result anyway.
    """
    import trimesh
    from gradio_client import Client, handle_file

    token = os.environ.get("HF_TOKEN", "").strip() or None
    client = Client(HUNYUAN_SPACE, token=token)
    result = client.predict(
        caption="",
        image=handle_file(str(concept)),
        mv_image_front=None,
        mv_image_back=None,
        mv_image_left=None,
        mv_image_right=None,
        steps=steps,
        guidance_scale=5.0,
        seed=seed,
        octree_resolution=octree_resolution,
        check_box_rembg=True,
        num_chunks=8000,
        randomize_seed=False,
        api_name="/shape_generation",
    )

    from generate_3d_assets import flatten_paths

    candidates = [
        path
        for path in flatten_paths(result)
        if path.suffix.lower() in {".glb", ".obj"} and path.exists()
    ]
    if not candidates:
        raise RuntimeError(f"Hunyuan3D returned no readable mesh: {result!r}")

    mesh = trimesh.load(max(candidates, key=lambda p: p.stat().st_size), force="mesh")

    # Marching-cubes output carries many degenerate slivers. Drop them before
    # decimating, or the simplifier has nothing it can legally collapse.
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.remove_unreferenced_vertices()
    mesh.merge_vertices()

    if len(mesh.faces) > target_faces:
        import fast_simplification
        import numpy as np

        vertices, faces = fast_simplification.simplify(
            np.asarray(mesh.vertices, dtype=np.float32),
            np.asarray(mesh.faces, dtype=np.int32),
            target_count=target_faces,
        )
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=True)

    # Normalise to an origin-centred, unit-height asset so the game can scale it
    # predictably onto a bone. Do this last: decimation is scale-sensitive.
    mesh.apply_translation(-mesh.bounding_box.centroid)
    mesh.apply_scale(1.0 / max(mesh.extents))

    output.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(output, file_type="glb")
    if output.stat().st_size < 2048:
        raise RuntimeError("Hunyuan3D returned an unexpectedly small mesh.")
    print(f"Hunyuan3D mesh: {len(mesh.faces)} faces, extents {mesh.extents.round(3)}")


def update_manifest(asset: dict[str, Any], output: pathlib.Path, backend: str) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    generated = manifest["generatedAssets"]
    payload = output.read_bytes()
    entry = {
        "id": asset["id"],
        "concept": asset["concept"],
        "output": asset["output"],
        "conceptGenerator": IMAGE_DEPLOYMENT,
        "generator": "microsoft/TRELLIS or dcharlot65-aurasense/triposr-onnx-web",
        "preferredSpace": "https://huggingface.co/spaces/trellis-community/TRELLIS",
        "seed": asset["seed"],
        "license": "Project-original generated asset",
        "historicalNote": asset["historicalNote"],
        "backendUsed": backend,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }
    for index, existing in enumerate(generated):
        if existing["id"] == asset["id"]:
            generated[index] = entry
            break
    else:
        generated.append(entry)

    remaining = [
        target
        for target in manifest.get("futureTargets", [])
        if target["id"] not in {"chandragupta-hero-mesh"}
        or asset["id"] != "chandragupta-hero"
    ]
    manifest["futureTargets"] = remaining
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--asset",
        choices=(*ASSETS, "all"),
        default="all",
        help="Which hero asset to build.",
    )
    parser.add_argument(
        "--concept-only",
        action="store_true",
        help="Generate the gpt-image-2 concept without building a mesh.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild the mesh even when it already exists. Concepts are not "
        "regenerated: gpt-image-2 calls are paid, so use --force-concept.",
    )
    parser.add_argument(
        "--force-concept",
        action="store_true",
        help="Regenerate the gpt-image-2 concept art. This costs money.",
    )
    parser.add_argument(
        "--backend",
        choices=("auto", "hunyuan", "space", "onnx"),
        default="auto",
        help="Image-to-3D backend. 'auto' prefers Hunyuan3D-2, then TRELLIS, then local ONNX.",
    )
    parser.add_argument(
        "--resolution",
        type=int,
        default=128,
        help="ONNX density-grid resolution. Higher is slower but cleaner.",
    )
    parser.add_argument(
        "--octree",
        type=int,
        default=380,
        help="Hunyuan3D octree resolution. Higher keeps thin blades sharp.",
    )
    parser.add_argument(
        "--faces",
        type=int,
        default=4000,
        help="Face budget after decimation. Props want ~4k, characters ~10k.",
    )
    arguments = parser.parse_args()

    selected = list(ASSETS) if arguments.asset == "all" else [arguments.asset]
    for name in selected:
        asset = ASSETS[name]
        concept = ROOT / asset["concept"]
        output = ROOT / asset["output"]

        if concept.exists() and not arguments.force_concept:
            print(f"Concept already exists: {concept}")
        else:
            generate_concept(asset, concept)
            print(f"Concept ready: {concept} ({concept.stat().st_size} bytes)")

        if arguments.concept_only:
            continue
        if output.exists() and not arguments.force:
            print(f"Mesh already exists: {output}")
            continue

        # Reuse the proven converters rather than duplicating them.
        from generate_3d_assets import generate_glb_onnx, generate_glb_space

        backend = arguments.backend
        if backend == "auto":
            backend = "hunyuan"
        if backend == "hunyuan":
            try:
                generate_glb_hunyuan(
                    concept,
                    output,
                    seed=int(asset["seed"]),
                    octree_resolution=arguments.octree,
                    target_faces=arguments.faces,
                )
            except Exception as error:
                if arguments.backend != "auto":
                    raise
                print(f"Hunyuan3D-2 failed ({error}); trying TRELLIS.")
                backend = "space"
        if backend == "space":
            try:
                generate_glb_space(concept, output, seed=int(asset["seed"]))
            except Exception:
                if arguments.backend != "auto":
                    raise
                print("TRELLIS failed; falling back to the local ONNX backend.")
                backend = "onnx"
        if backend == "onnx":
            generate_glb_onnx(concept, output, resolution=arguments.resolution)

        update_manifest(asset, output, backend)
        print(f"Mesh ready: {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
