"""Generate original low-poly GLBs through the Hugging Face TRELLIS Space.

The source image is drawn locally so the generated mesh does not derive from a
third-party game asset or a museum photograph. Open-source assets used directly
by the game are tracked separately in nanda-asset-manifest.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import sys
from typing import Any

from gradio_client import Client, handle_file
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST_PATH = pathlib.Path(__file__).with_name("nanda-asset-manifest.json")
TRELLIS_SPACE = "trellis-community/TRELLIS"
TRIPOSR_ONNX_REPO = "dcharlot65-aurasense/triposr-onnx-web"


def draw_storage_jar(path: pathlib.Path) -> None:
    size = 1024
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale), (255, 255, 255, 0))
    draw = ImageDraw.Draw(canvas)

    def box(values: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        return tuple(value * scale for value in values)  # type: ignore[return-value]

    shadow = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(box((210, 820, 820, 940)), fill=(34, 28, 24, 82))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28 * scale))
    canvas.alpha_composite(shadow)

    body = box((250, 235, 790, 885))
    draw.ellipse(body, fill=(176, 91, 51, 255), outline=(91, 49, 34, 255), width=8 * scale)
    draw.rectangle(box((360, 175, 680, 360)), fill=(176, 91, 51, 255))
    draw.ellipse(
        box((360, 125, 680, 255)),
        fill=(196, 117, 70, 255),
        outline=(91, 49, 34, 255),
        width=8 * scale,
    )
    draw.ellipse(
        box((405, 155, 635, 225)),
        fill=(56, 44, 39, 255),
        outline=(91, 49, 34, 255),
        width=7 * scale,
    )
    draw.rounded_rectangle(
        box((274, 475, 766, 620)),
        radius=34 * scale,
        fill=(63, 55, 51, 255),
        outline=(41, 35, 32, 255),
        width=7 * scale,
    )
    draw.arc(
        box((315, 270, 705, 780)),
        start=98,
        end=262,
        fill=(235, 163, 105, 170),
        width=24 * scale,
    )
    draw.arc(
        box((420, 285, 770, 805)),
        start=285,
        end=70,
        fill=(92, 46, 34, 150),
        width=18 * scale,
    )
    draw.ellipse(
        box((360, 805, 680, 910)),
        fill=(119, 61, 42, 255),
        outline=(91, 49, 34, 255),
        width=7 * scale,
    )

    canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path)


def flatten_paths(value: Any) -> list[pathlib.Path]:
    if isinstance(value, str):
        return [pathlib.Path(value)]
    if isinstance(value, dict):
        paths: list[pathlib.Path] = []
        for item in value.values():
            paths.extend(flatten_paths(item))
        return paths
    if isinstance(value, (list, tuple)):
        paths = []
        for item in value:
            paths.extend(flatten_paths(item))
        return paths
    return []


def generate_glb_space(
    concept: pathlib.Path,
    output: pathlib.Path,
    *,
    seed: int,
) -> None:
    token = os.environ.get("HF_TOKEN", "").strip() or None
    client = Client(TRELLIS_SPACE, token=token)
    client.predict(api_name="/start_session")
    preprocessed = client.predict(
        image=handle_file(str(concept)),
        api_name="/preprocess_image",
    )
    result = client.predict(
        image=preprocessed,
        multiimages=[],
        seed=seed,
        ss_guidance_strength=7.5,
        ss_sampling_steps=12,
        slat_guidance_strength=3.0,
        slat_sampling_steps=12,
        multiimage_algo="stochastic",
        mesh_simplify=0.98,
        texture_size=512,
        api_name="/generate_and_extract_glb",
    )
    candidates = [
        path
        for path in flatten_paths(result)
        if path.suffix.lower() == ".glb" and path.exists()
    ]
    if not candidates:
        raise RuntimeError(f"TRELLIS returned no readable GLB path: {result!r}")

    source = candidates[-1]
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, output)
    if output.stat().st_size < 1024:
        raise RuntimeError("TRELLIS returned an unexpectedly small GLB.")


def generate_glb_onnx(
    concept: pathlib.Path,
    output: pathlib.Path,
    *,
    resolution: int = 96,
    target_faces: int = 6000,
) -> None:
    try:
        import mcubes
        import numpy as np
        import onnxruntime as ort
        import trimesh
        from huggingface_hub import hf_hub_download
    except ImportError as error:
        raise RuntimeError(
            "Install tooling/requirements-assets.txt before using the ONNX backend."
        ) from error

    model_files = {
        name: pathlib.Path(hf_hub_download(TRIPOSR_ONNX_REPO, name))
        for name in (
            "encoder_fp16.onnx",
            "backbone_fp16.onnx",
            "decoder_fp16.onnx",
        )
    }
    session_options = ort.SessionOptions()
    session_options.intra_op_num_threads = max(1, (os.cpu_count() or 4) - 1)
    providers = ["CPUExecutionProvider"]
    encoder = ort.InferenceSession(
        str(model_files["encoder_fp16.onnx"]),
        sess_options=session_options,
        providers=providers,
    )
    backbone = ort.InferenceSession(
        str(model_files["backbone_fp16.onnx"]),
        sess_options=session_options,
        providers=providers,
    )
    decoder = ort.InferenceSession(
        str(model_files["decoder_fp16.onnx"]),
        sess_options=session_options,
        providers=providers,
    )

    image = Image.open(concept).convert("RGBA").resize((512, 512))
    background = Image.new("RGBA", image.size, (128, 128, 128, 255))
    background.alpha_composite(image)
    array = np.asarray(background.convert("RGB"), dtype=np.float32) / 255.0
    array = array.transpose(2, 0, 1)[None, ...]

    tokens = encoder.run(None, {"image": array})[0]
    if tokens.shape[1] == 768:
        tokens = tokens.transpose(0, 2, 1)
    scene_codes = backbone.run(None, {"image_tokens": tokens})[0]
    triplane = scene_codes[0].astype(np.float32)

    radius = 0.87
    coordinates = np.linspace(-radius, radius, resolution, dtype=np.float32)
    xx, yy, zz = np.meshgrid(
        coordinates,
        coordinates,
        coordinates,
        indexing="ij",
    )
    points = np.stack([xx, yy, zz], axis=-1).reshape(-1, 3)
    densities = np.empty(points.shape[0], dtype=np.float32)
    chunk_size = 131_072
    for start in range(0, points.shape[0], chunk_size):
        chunk = points[start : start + chunk_size]
        density, _ = decoder.run(
            None,
            {"triplane": triplane, "points": chunk},
        )
        densities[start : start + chunk.shape[0]] = density.reshape(-1)
        print(
            f"Decoded {min(start + chunk.shape[0], points.shape[0]):,}"
            f"/{points.shape[0]:,} field samples",
            flush=True,
        )

    density_grid = densities.reshape(resolution, resolution, resolution)
    vertices, triangles = mcubes.marching_cubes(density_grid, 25.0)
    if len(vertices) == 0 or len(triangles) == 0:
        raise RuntimeError("TripoSR produced no mesh at the expected density level.")

    vertices_radius = (
        (vertices / (resolution - 1)) * 2.0 - 1.0
    ) * radius
    _, colors = decoder.run(
        None,
        {
            "triplane": triplane,
            "points": vertices_radius.astype(np.float32),
        },
    )
    colors = np.clip(colors.reshape(-1, 3), 0, 1)
    alpha = np.full((colors.shape[0], 1), 1.0, dtype=np.float32)
    vertex_colors = np.concatenate([colors, alpha], axis=1) * 255

    mesh = trimesh.Trimesh(
        vertices=vertices_radius,
        faces=triangles,
        vertex_colors=vertex_colors.astype(np.uint8),
        process=True,
    )
    if len(mesh.faces) > target_faces:
        mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
    mesh.apply_transform(
        trimesh.transformations.rotation_matrix(-1.57079632679, [1, 0, 0])
    )
    mesh.apply_translation(-mesh.centroid)
    scale = 1.8 / max(mesh.extents)
    mesh.apply_scale(scale)

    output.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(output, file_type="glb")
    if output.stat().st_size < 1024:
        raise RuntimeError("TripoSR returned an unexpectedly small GLB.")


def update_manifest(
    asset_id: str,
    output: pathlib.Path,
    backend: str,
) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    asset = next(
        item for item in manifest["generatedAssets"] if item["id"] == asset_id
    )
    payload = output.read_bytes()
    asset["backendUsed"] = backend
    asset["bytes"] = len(payload)
    asset["sha256"] = hashlib.sha256(payload).hexdigest()
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--concept-only",
        action="store_true",
        help="Draw the original concept image without calling Hugging Face.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace an existing generated GLB.",
    )
    parser.add_argument(
        "--backend",
        choices=("auto", "space", "onnx"),
        default="auto",
        help="Use authenticated TRELLIS Space generation or local Hugging Face ONNX.",
    )
    parser.add_argument(
        "--resolution",
        type=int,
        default=96,
        help="ONNX density-grid resolution. 96 is suitable for mobile props.",
    )
    arguments = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    asset = manifest["generatedAssets"][0]
    concept = ROOT / asset["concept"]
    output = ROOT / asset["output"]

    draw_storage_jar(concept)
    print(f"Concept ready: {concept}")
    if arguments.concept_only:
        return
    if output.exists() and not arguments.force:
        print(f"GLB already exists: {output}")
        return

    backend = arguments.backend
    if backend == "auto":
        backend = "space" if os.environ.get("HF_TOKEN", "").strip() else "onnx"

    if backend == "space":
        try:
            generate_glb_space(concept, output, seed=int(asset["seed"]))
        except Exception:
            if arguments.backend != "auto":
                raise
            print(
                "Authenticated TRELLIS generation failed; using the local ONNX fallback.",
                file=sys.stderr,
            )
            backend = "onnx"

    if backend == "onnx":
        generate_glb_onnx(
            concept,
            output,
            resolution=arguments.resolution,
        )

    update_manifest(asset["id"], output, backend)
    print(f"GLB ready: {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
