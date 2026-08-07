# Chandragupta hero assets

Generated for the web client and copied here so the Unity prototype can use the
same character. Produced by `tooling/generate_hero_assets.py` (Azure
`gpt-image-2` concept art) and `tooling/rig_hero_mesh.py` (skinning), then
converted to 3D with the Tencent **Hunyuan3D-2** Space on Hugging Face.

| File | What it is | Import |
| --- | --- | --- |
| `Chandragupta.obj` | Static A-pose hero, 12k tris | Works out of the box — Unity imports OBJ natively |
| `Chandragupta_Rigged.glb` | Same figure skinned to the 23-bone Quaternius rig, with all 16 animation clips and baked vertex colours | Needs a glTF importer |
| `MauryanSword.glb` | Broad iron sword, 4k tris | Needs a glTF importer |
| `Chandragupta_Concept.png` | The gpt-image-2 reference the mesh was built from | Texture/reference |

## Using the rigged version

Unity has no built-in glTF importer. To get the animated character rather than
the static OBJ, add **glTFast** through Package Manager:

    Window > Package Manager > + > Add package by name...
    com.unity.cloud.gltfast

Then drop `Chandragupta_Rigged.glb` into a scene. The skeleton bone names match
the Quaternius rig (`Hips`, `Torso`, `Head`, `Fist.R`, …), so the sword parents
onto `Fist.R` exactly as it does in the web client.

The web build's numbers, if you need to match them: sword scale `1.35`, local
position `(0, 0.47, 0)`, rotated `PI` about X so the pommel sits in the fist.

## Historical note

No contemporary likeness or physical description of Chandragupta Maurya
survives. This figure is a **gameplay reconstruction** assembled from broad
Mauryan-era material culture — draped cotton dhoti, waist sash, folded turban,
simple ornament — and is never presented as a portrait or as evidence of his
appearance. The sword follows the one surviving description of Indian infantry
equipment, in Megasthenes as summarised by Arrian (*Indica* 16), which reports a
broad blade rather than a slender one. See `project-docs/HISTORICAL_METHOD.md`
and `tooling/nanda-asset-manifest.json`.
