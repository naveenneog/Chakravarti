using UnityEngine;

namespace Chakravarti.Action
{
    [CreateAssetMenu(menuName = "Chakravarti/Character Animation Library")]
    public sealed class CharacterAnimationLibrary : ScriptableObject
    {
        public AnimationClip[] clips;
    }
}
