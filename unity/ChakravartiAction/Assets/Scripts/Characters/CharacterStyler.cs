using UnityEngine;

namespace Chakravarti.Action
{
    public static class CharacterStyler
    {
        public static void StyleHero(GameObject model, Material skin, Material cloth, Material gold, Material dark)
        {
            Recolor(model, skin, cloth, gold, dark);
        }

        public static void StyleGuard(
            GameObject model,
            Material skin,
            Material cloth,
            Material gold,
            Material dark
        )
        {
            Recolor(model, skin, cloth, gold, dark);
        }

        private static void Recolor(
            GameObject model,
            Material skin,
            Material cloth,
            Material gold,
            Material dark
        )
        {
            foreach (Renderer renderer in model.GetComponentsInChildren<Renderer>(true))
            {
                Material[] materials = renderer.materials;
                for (int index = 0; index < materials.Length; index++)
                {
                    string name = materials[index].name.ToLowerInvariant();
                    materials[index] =
                        name.Contains("skin") || name.Contains("face")
                            ? skin
                            : name.Contains("details") || name.Contains("band")
                                ? gold
                                : name.Contains("grey") || name.Contains("hair")
                                    ? dark
                                    : cloth;
                }

                renderer.materials = materials;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
                renderer.receiveShadows = true;
            }
        }

    }
}
