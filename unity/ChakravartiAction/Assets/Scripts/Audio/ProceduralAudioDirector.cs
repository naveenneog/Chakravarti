using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Chakravarti.Action
{
    public enum SoundCue
    {
        Step,
        Jump,
        Sword,
        Impact,
        Hurt,
        Objective,
        Heal,
        Gate,
        Defeat,
        Denied
    }

    public sealed class ProceduralAudioDirector : MonoBehaviour
    {
        private readonly Dictionary<SoundCue, AudioClip> clips = new();
        private AudioSource effectsSource;
        private AudioSource ambienceSource;
        private AudioSource musicSource;
        private AudioClip[] scoreNotes;
        private AudioClip drumClip;
        private int scoreStep;
        private bool muted;

        public void Initialize()
        {
            effectsSource = CreateSource("Effects", 0.72f, false);
            ambienceSource = CreateSource("Ambience", 0.22f, true);
            musicSource = CreateSource("Adaptive Score", 0.28f, false);

            clips[SoundCue.Step] = CreateNoise("Step", 0.08f, 0.16f, 0.18f);
            clips[SoundCue.Jump] = CreateSweep("Jump", 180f, 360f, 0.18f, 0.18f);
            clips[SoundCue.Sword] = CreateNoise("Sword", 0.14f, 0.7f, 0.28f);
            clips[SoundCue.Impact] = CreateSweep("Impact", 130f, 55f, 0.2f, 0.36f);
            clips[SoundCue.Hurt] = CreateSweep("Hurt", 220f, 72f, 0.24f, 0.32f);
            clips[SoundCue.Objective] = CreateChord("Objective", new[] { 440f, 660f, 880f }, 0.6f);
            clips[SoundCue.Heal] = CreateSweep("Heal", 220f, 720f, 0.48f, 0.22f);
            clips[SoundCue.Gate] = CreateChord("Gate", new[] { 74f, 148f, 220f }, 1.2f);
            clips[SoundCue.Defeat] = CreateSweep("Defeat", 120f, 42f, 0.55f, 0.32f);
            clips[SoundCue.Denied] = CreateSweep("Denied", 170f, 130f, 0.1f, 0.08f);

            ambienceSource.clip = CreateAmbience();
            ambienceSource.Play();
            scoreNotes = new[]
            {
                CreateTone("Sa", 196f, 0.42f, 0.14f),
                CreateTone("Ga", 233.08f, 0.42f, 0.13f),
                CreateTone("Ma", 261.63f, 0.42f, 0.12f),
                CreateTone("Pa", 293.66f, 0.42f, 0.13f),
                CreateTone("Ni", 349.23f, 0.42f, 0.11f)
            };
            drumClip = CreateSweep("Drum", 96f, 46f, 0.24f, 0.28f);
            StartCoroutine(ScoreLoop());
        }

        public void Play(SoundCue cue)
        {
            if (!muted && effectsSource != null && clips.TryGetValue(cue, out AudioClip clip))
            {
                effectsSource.PlayOneShot(clip);
            }
        }

        public void ToggleMuted()
        {
            muted = !muted;
            AudioListener.volume = muted ? 0f : 1f;
        }

        private AudioSource CreateSource(string sourceName, float volume, bool loop)
        {
            GameObject sourceObject = new(sourceName);
            sourceObject.transform.SetParent(transform, false);
            AudioSource source = sourceObject.AddComponent<AudioSource>();
            source.playOnAwake = false;
            source.loop = loop;
            source.volume = volume;
            source.spatialBlend = 0f;
            return source;
        }

        private IEnumerator ScoreLoop()
        {
            int[] pattern = { 0, 2, 3, 1, 4, 3, 2, 1 };
            while (true)
            {
                if (!muted && musicSource != null)
                {
                    musicSource.PlayOneShot(scoreNotes[pattern[scoreStep % pattern.Length]]);
                    if (scoreStep % 2 == 0)
                    {
                        musicSource.PlayOneShot(drumClip, 0.7f);
                    }
                }

                scoreStep += 1;
                yield return new WaitForSeconds(0.56f);
            }
        }

        private static AudioClip CreateTone(
            string clipName,
            float frequency,
            float duration,
            float amplitude
        )
        {
            const int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];
            for (int index = 0; index < samples; index++)
            {
                float time = (float)index / sampleRate;
                float envelope = Mathf.Sin(Mathf.PI * index / samples);
                data[index] =
                    Mathf.Sin(2f * Mathf.PI * frequency * time) * amplitude * envelope;
            }

            AudioClip clip = AudioClip.Create(clipName, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static AudioClip CreateSweep(
            string clipName,
            float startFrequency,
            float endFrequency,
            float duration,
            float amplitude
        )
        {
            const int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];
            float phase = 0f;
            for (int index = 0; index < samples; index++)
            {
                float progress = (float)index / samples;
                float frequency = Mathf.Lerp(startFrequency, endFrequency, progress);
                phase += 2f * Mathf.PI * frequency / sampleRate;
                float envelope = Mathf.Sin(Mathf.PI * progress);
                data[index] = Mathf.Sin(phase) * amplitude * envelope;
            }

            AudioClip clip = AudioClip.Create(clipName, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static AudioClip CreateNoise(
            string clipName,
            float duration,
            float amplitude,
            float smoothing
        )
        {
            const int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];
            float previous = 0f;
            for (int index = 0; index < samples; index++)
            {
                float random = Random.Range(-1f, 1f);
                previous = Mathf.Lerp(random, previous, smoothing);
                float envelope = 1f - (float)index / samples;
                data[index] = previous * amplitude * envelope;
            }

            AudioClip clip = AudioClip.Create(clipName, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static AudioClip CreateChord(
            string clipName,
            float[] frequencies,
            float duration
        )
        {
            const int sampleRate = 44100;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];
            for (int index = 0; index < samples; index++)
            {
                float time = (float)index / sampleRate;
                float envelope = Mathf.Sin(Mathf.PI * index / samples);
                float value = 0f;
                foreach (float frequency in frequencies)
                {
                    value += Mathf.Sin(2f * Mathf.PI * frequency * time);
                }

                data[index] = value / frequencies.Length * 0.18f * envelope;
            }

            AudioClip clip = AudioClip.Create(clipName, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static AudioClip CreateAmbience()
        {
            const int sampleRate = 44100;
            const float duration = 4f;
            int samples = Mathf.CeilToInt(sampleRate * duration);
            float[] data = new float[samples];
            float previous = 0f;
            for (int index = 0; index < samples; index++)
            {
                float time = (float)index / sampleRate;
                previous = Mathf.Lerp(Random.Range(-1f, 1f), previous, 0.985f);
                float drone = Mathf.Sin(2f * Mathf.PI * 73.42f * time) * 0.12f;
                data[index] = previous * 0.08f + drone;
            }

            AudioClip clip = AudioClip.Create("River and Wind", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
