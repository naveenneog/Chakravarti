"""Skin a generated T-pose mesh onto the CC0 Quaternius skeleton.

Image-to-3D models return an unrigged shell. The game hero has to animate, so
this binds the generated mesh to the existing 23-bone Quaternius rig using
envelope (distance-to-bone) weights, and emits a GLB that keeps the original
skeleton, inverse bind matrices and all sixteen animation clips intact.

The original glTF is used as a template and only the mesh primitive is
replaced, so the animation data is never re-derived and cannot drift.
"""

from __future__ import annotations

import argparse
import base64
import json
import pathlib
import struct
from typing import Any

import numpy as np
import trimesh

ROOT = pathlib.Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "public/models/cc0/quaternius-characters/BaseCharacter.gltf"

# IK helpers sit a metre in front of the knees and would otherwise capture the
# whole front of the dhoti. The unnamed root sits between the feet.
EXCLUDED_JOINTS = {"PoleTarget.L", "PoleTarget.R", "Bone"}

COMPONENT_FORMATS = {5126: "f", 5123: "H", 5125: "I", 5121: "B"}
COMPONENT_SIZES = {"f": 4, "H": 2, "I": 4, "B": 1}
TYPE_COUNTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load_template() -> tuple[dict[str, Any], bytearray]:
    gltf = json.loads(TEMPLATE.read_text(encoding="utf-8"))
    uri = gltf["buffers"][0]["uri"]
    if not uri.startswith("data:"):
        raise RuntimeError("Expected an embedded base64 buffer in the template.")
    return gltf, bytearray(base64.b64decode(uri.split(",", 1)[1]))


def read_accessor(gltf: dict[str, Any], blob: bytes, index: int) -> np.ndarray:
    accessor = gltf["accessors"][index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    count = accessor["count"]
    components = TYPE_COUNTS[accessor["type"]]
    fmt = COMPONENT_FORMATS[accessor["componentType"]]
    values = struct.unpack_from(f"<{fmt * (count * components)}", blob, offset)
    return np.array(values).reshape(count, components)


def joint_world_positions(gltf: dict[str, Any], blob: bytes) -> dict[str, np.ndarray]:
    skin = gltf["skins"][0]
    matrices = read_accessor(gltf, blob, skin["inverseBindMatrices"]).reshape(-1, 4, 4)
    positions: dict[str, np.ndarray] = {}
    for joint, matrix in zip(skin["joints"], matrices):
        name = gltf["nodes"][joint].get("name", f"joint{joint}")
        world = np.linalg.inv(matrix.reshape(4, 4).T)
        positions[name] = world[:3, 3]
    return positions


def bone_segments(
    gltf: dict[str, Any],
    positions: dict[str, np.ndarray],
) -> list[tuple[int, np.ndarray, np.ndarray]]:
    """Return (jointIndex, start, end) for each weightable bone."""
    skin = gltf["skins"][0]
    nodes = gltf["nodes"]
    name_of = {node: nodes[node].get("name", f"joint{node}") for node in skin["joints"]}
    slot_of = {node: slot for slot, node in enumerate(skin["joints"])}

    segments: list[tuple[int, np.ndarray, np.ndarray]] = []
    for node in skin["joints"]:
        name = name_of[node]
        if name in EXCLUDED_JOINTS:
            continue
        start = positions[name]
        children = [
            child
            for child in nodes[node].get("children", [])
            if child in slot_of and name_of[child] not in EXCLUDED_JOINTS
        ]
        if children:
            for child in children:
                segments.append((slot_of[node], start, positions[name_of[child]]))
        else:
            # Leaf bones (head, fists, feet) still need volume, so extend them
            # a little along the direction they were travelling.
            direction = np.array([0.0, 0.12, 0.0])
            segments.append((slot_of[node], start, start + direction))
    return segments


def point_segment_distance(
    points: np.ndarray,
    start: np.ndarray,
    end: np.ndarray,
) -> np.ndarray:
    axis = end - start
    length_squared = float(axis @ axis)
    if length_squared < 1e-12:
        return np.linalg.norm(points - start, axis=1)
    t = np.clip(((points - start) @ axis) / length_squared, 0.0, 1.0)
    closest = start + t[:, None] * axis
    return np.linalg.norm(points - closest, axis=1)


def align_to_skeleton(
    mesh: trimesh.Trimesh,
    positions: dict[str, np.ndarray],
) -> trimesh.Trimesh:
    """Scale and translate the generated mesh onto the skeleton's proportions."""
    foot_y = min(positions["Foot.L"][1], positions["Foot.R"][1])
    head_y = positions["Head"][1]
    # The Head joint sits at the base of the skull, so the mesh continues above
    # it. 0.833 is the ratio the CC0 guard meshes use, which keeps Chandragupta
    # the same height as the men he is fighting.
    skeleton_height = (head_y - foot_y) / 0.833

    bounds = mesh.bounds
    mesh_height = float(bounds[1][1] - bounds[0][1])
    mesh.apply_scale(skeleton_height / mesh_height)

    bounds = mesh.bounds
    centre_x = float((bounds[0][0] + bounds[1][0]) * 0.5)
    centre_z = float((bounds[0][2] + bounds[1][2]) * 0.5)
    mesh.apply_translation([-centre_x, foot_y - float(bounds[0][1]), -centre_z])
    return mesh


def envelope_weights(
    vertices: np.ndarray,
    segments: list[tuple[int, np.ndarray, np.ndarray]],
    *,
    influences: int = 4,
    falloff: float = 4.0,
) -> tuple[np.ndarray, np.ndarray]:
    distances = np.stack(
        [point_segment_distance(vertices, start, end) for _, start, end in segments],
        axis=1,
    )
    joint_slots = np.array([slot for slot, _, _ in segments], dtype=np.int32)

    # Several segments can share a joint (a bone with two children). Keep the
    # closest distance per joint so a joint is never double-counted.
    unique_slots = np.unique(joint_slots)
    per_joint = np.full((vertices.shape[0], unique_slots.shape[0]), np.inf)
    for column, slot in enumerate(unique_slots):
        per_joint[:, column] = distances[:, joint_slots == slot].min(axis=1)

    order = np.argsort(per_joint, axis=1)[:, :influences]
    rows = np.arange(vertices.shape[0])[:, None]
    nearest = per_joint[rows, order]

    strength = 1.0 / np.power(nearest + 1e-4, falloff)
    strength /= strength.sum(axis=1, keepdims=True)

    joints = unique_slots[order].astype(np.uint16)
    return joints, strength.astype(np.float32)


def append_view(
    gltf: dict[str, Any],
    blob: bytearray,
    payload: bytes,
    *,
    target: int | None = None,
) -> int:
    while len(blob) % 4:
        blob.append(0)
    offset = len(blob)
    blob.extend(payload)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(payload)}
    if target is not None:
        view["target"] = target
    gltf["bufferViews"].append(view)
    return len(gltf["bufferViews"]) - 1


def add_accessor(
    gltf: dict[str, Any],
    view: int,
    *,
    component_type: int,
    count: int,
    kind: str,
    minimum: list[float] | None = None,
    maximum: list[float] | None = None,
    normalized: bool = False,
) -> int:
    accessor: dict[str, Any] = {
        "bufferView": view,
        "componentType": component_type,
        "count": count,
        "type": kind,
    }
    if minimum is not None:
        accessor["min"] = minimum
        accessor["max"] = maximum
    if normalized:
        accessor["normalized"] = True
    gltf["accessors"].append(accessor)
    return len(gltf["accessors"]) - 1


def write_glb(gltf: dict[str, Any], blob: bytearray, destination: pathlib.Path) -> None:
    gltf["buffers"] = [{"byteLength": len(blob)}]
    json_chunk = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * ((4 - len(json_chunk) % 4) % 4)
    binary_chunk = bytes(blob)
    binary_chunk += b"\x00" * ((4 - len(binary_chunk) % 4) % 4)

    total = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        handle.write(struct.pack("<III", 0x46546C67, 2, total))
        handle.write(struct.pack("<II", len(json_chunk), 0x4E4F534A))
        handle.write(json_chunk)
        handle.write(struct.pack("<II", len(binary_chunk), 0x004E4942))
        handle.write(binary_chunk)


def sample_vertex_colors(
    vertices: np.ndarray,
    concept: pathlib.Path,
    concept_back: pathlib.Path | None = None,
) -> np.ndarray:
    """Project the concept art onto the mesh as per-vertex colour.

    The mesh was generated from an orthographic front view, so a planar
    projection lines up with the garments: turban at the top, skin across the
    chest, the ochre sash at the waist, the white dhoti below it.

    When a matching rear view is supplied, back-facing vertices sample that
    instead of mirroring the front. This matters more than it sounds: the
    third-person camera sits *behind* the player, so the back of the figure is
    the surface on screen for the entire mission, and mirroring the front puts
    a face on the back of the skull and hides the dark hair at the nape.
    """
    from PIL import Image

    def load(path: pathlib.Path):
        image = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0
        figure = image.mean(axis=2) < 0.93
        rows = np.where(figure.any(axis=1))[0]
        columns = np.where(figure.any(axis=0))[0]
        return image, figure, int(rows[0]), int(rows[-1]), int(columns[0]), int(columns[-1])

    views = {False: load(concept)}
    views[True] = load(concept_back) if concept_back else views[False]

    lo = vertices.min(axis=0)
    hi = vertices.max(axis=0)
    span_x = max(float(hi[0] - lo[0]), 1e-6)
    span_y = max(float(hi[1] - lo[1]), 1e-6)

    base_u = (vertices[:, 0] - lo[0]) / span_x
    v = 1.0 - (vertices[:, 1] - lo[1]) / span_y
    behind = vertices[:, 2] < 0
    colors = np.zeros((vertices.shape[0], 3), dtype=np.float32)

    for is_back, (pixels, figure, top, bottom, left, right) in views.items():
        mask = behind if is_back else ~behind
        if not mask.any():
            continue
        # Seen from behind the figure is mirrored left-to-right.
        u = 1.0 - base_u[mask] if is_back else base_u[mask]
        height, width, _ = pixels.shape
        columns_index = np.clip(
            (left + u * (right - left)).astype(np.int32), 0, width - 1
        )
        rows_index = np.clip(
            (top + v[mask] * (bottom - top)).astype(np.int32), 0, height - 1
        )
        sampled = pixels[rows_index, columns_index]

        # Anything that landed on background gets pulled to that view's median
        # body tone rather than glowing white.
        background = sampled.mean(axis=1) > 0.93
        if background.any():
            sampled[background] = np.median(pixels[figure], axis=0)
        colors[mask] = sampled

    # The concept art is lit for a bright studio; the mission is lit for a
    # courtyard at dawn. Deepen and saturate slightly so the figure reads as
    # cloth and skin rather than washing out to near-white on screen.
    colors = np.power(colors, 1.12)
    grey = colors.mean(axis=1, keepdims=True)
    colors = grey + (colors - grey) * 1.22

    return np.clip(colors, 0.0, 1.0).astype(np.float32)


def rig(
    source: pathlib.Path,
    destination: pathlib.Path,
    concept: pathlib.Path,
    concept_back: pathlib.Path | None = None,
) -> None:
    gltf, blob = load_template()
    positions = joint_world_positions(gltf, bytes(blob))
    segments = bone_segments(gltf, positions)

    mesh = trimesh.load(source, force="mesh")
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.remove_unreferenced_vertices()
    align_to_skeleton(mesh, positions)

    vertices = np.asarray(mesh.vertices, dtype=np.float32)
    normals = np.asarray(mesh.vertex_normals, dtype=np.float32)
    indices = np.asarray(mesh.faces, dtype=np.uint32).reshape(-1)
    joints, weights = envelope_weights(vertices, segments)
    colors = sample_vertex_colors(vertices, concept, concept_back)

    position_view = append_view(gltf, blob, vertices.tobytes(), target=34962)
    normal_view = append_view(gltf, blob, normals.tobytes(), target=34962)
    joint_view = append_view(gltf, blob, joints.tobytes(), target=34962)
    weight_view = append_view(gltf, blob, weights.tobytes(), target=34962)
    color_view = append_view(gltf, blob, colors.tobytes(), target=34962)
    index_view = append_view(gltf, blob, indices.tobytes(), target=34963)

    count = int(vertices.shape[0])
    position_accessor = add_accessor(
        gltf,
        position_view,
        component_type=5126,
        count=count,
        kind="VEC3",
        minimum=vertices.min(axis=0).tolist(),
        maximum=vertices.max(axis=0).tolist(),
    )
    normal_accessor = add_accessor(
        gltf, normal_view, component_type=5126, count=count, kind="VEC3"
    )
    joint_accessor = add_accessor(
        gltf, joint_view, component_type=5123, count=count, kind="VEC4"
    )
    weight_accessor = add_accessor(
        gltf, weight_view, component_type=5126, count=count, kind="VEC4"
    )
    color_accessor = add_accessor(
        gltf, color_view, component_type=5126, count=count, kind="VEC3"
    )
    index_accessor = add_accessor(
        gltf, index_view, component_type=5125, count=int(indices.shape[0]), kind="SCALAR"
    )

    gltf["materials"] = [
        {
            "name": "Chandragupta",
            "pbrMetallicRoughness": {
                "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.82,
            },
        }
    ]
    gltf["meshes"][0]["primitives"] = [
        {
            "attributes": {
                "POSITION": position_accessor,
                "NORMAL": normal_accessor,
                "JOINTS_0": joint_accessor,
                "WEIGHTS_0": weight_accessor,
                "COLOR_0": color_accessor,
            },
            "indices": index_accessor,
            "material": 0,
            "mode": 4,
        }
    ]

    write_glb(gltf, blob, destination)
    print(
        f"Rigged {destination.name}: {count} verts, {indices.shape[0] // 3} faces, "
        f"{len(gltf['animations'])} clips, {len(gltf['skins'][0]['joints'])} joints"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        default="public/models/nanda/chandragupta-hero-tpose.glb",
        help="Unrigged T-pose mesh to bind.",
    )
    parser.add_argument(
        "--output",
        default="public/models/nanda/chandragupta-rigged.glb",
        help="Destination rigged GLB.",
    )
    parser.add_argument(
        "--concept",
        default="public/media/nanda/asset-concepts/chandragupta-hero-tpose.png",
        help="Front-view concept art projected onto the mesh as vertex colour.",
    )
    parser.add_argument(
        "--concept-back",
        default="public/media/nanda/asset-concepts/chandragupta-hero-back.png",
        help="Matching rear view, used to colour the back of the mesh.",
    )
    arguments = parser.parse_args()
    back = ROOT / arguments.concept_back
    rig(
        ROOT / arguments.source,
        ROOT / arguments.output,
        ROOT / arguments.concept,
        back if back.exists() else None,
    )


if __name__ == "__main__":
    main()
