using System.Collections.Generic;
using UnityEngine;

namespace Chakravarti.Action
{
    public sealed class ClipAnimator : MonoBehaviour
    {
        private readonly Dictionary<string, AnimationClip> clips = new();
        private Animation animationComponent;
        private string locomotionClip = "Idle";
        private float oneShotUntil;

        public void Initialize(GameObject model, string resourcePath)
        {
            animationComponent = model.GetComponent<Animation>();
            if (animationComponent == null)
            {
                animationComponent = model.AddComponent<Animation>();
            }

            CharacterAnimationLibrary library = Resources.Load<CharacterAnimationLibrary>(
                resourcePath
            );
            if (library == null || library.clips == null)
            {
                Debug.LogError($"Animation library not found: {resourcePath}");
                return;
            }

            foreach (AnimationClip clip in library.clips)
            {
                if (clip == null || string.IsNullOrWhiteSpace(clip.name))
                {
                    continue;
                }
                string clipName = clip.name.Contains('|')
                    ? clip.name[(clip.name.LastIndexOf('|') + 1)..]
                    : clip.name;
                clip.wrapMode = IsLooping(clipName) ? WrapMode.Loop : WrapMode.Once;
                animationComponent.AddClip(clip, clipName);
                clips[clipName] = clip;
            }

            PlayLocomotion("Idle");
        }

        public void PlayLocomotion(string clipName)
        {
            locomotionClip = clips.ContainsKey(clipName) ? clipName : "Idle";
            if (Time.time < oneShotUntil || animationComponent == null)
            {
                return;
            }

            if (!animationComponent.IsPlaying(locomotionClip))
            {
                animationComponent.CrossFade(locomotionClip, 0.12f);
            }
        }

        public void PlayOneShot(string clipName, float durationScale = 0.8f)
        {
            if (
                animationComponent == null ||
                !clips.TryGetValue(clipName, out AnimationClip clip)
            )
            {
                return;
            }

            oneShotUntil = Time.time + Mathf.Max(0.15f, clip.length * durationScale);
            animationComponent.CrossFade(clipName, 0.08f);
        }

        private void Update()
        {
            if (
                animationComponent != null &&
                Time.time >= oneShotUntil &&
                !animationComponent.IsPlaying(locomotionClip)
            )
            {
                animationComponent.CrossFade(locomotionClip, 0.1f);
            }
        }

        private static bool IsLooping(string clipName)
        {
            return clipName is "Idle" or "Walk" or "Run" or "Walk_Carry" or "Run_Carry";
        }
    }
}
