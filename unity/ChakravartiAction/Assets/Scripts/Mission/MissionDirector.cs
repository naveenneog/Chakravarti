using UnityEngine;
using UnityEngine.UI;

namespace Chakravarti.Action
{
    public sealed class MissionDirector : MonoBehaviour
    {
        private const int RequiredObjectives = 2;

        private Text healthText;
        private Text objectiveText;
        private Text guardText;
        private Text promptText;
        private Text healingText;
        private MissionGate gate;
        private ThirdPersonHero hero;
        private ProceduralAudioDirector audioDirector;
        private ThirdPersonCamera cameraRig;
        private int collectedObjectives;
        private int registeredGuards;
        private int defeatedGuards;

        public void Initialize(
            Text health,
            Text objectives,
            Text guards,
            Text prompt,
            Text healing,
            MissionGate missionGate,
            ProceduralAudioDirector audio,
            ThirdPersonCamera cameraController
        )
        {
            healthText = health;
            objectiveText = objectives;
            guardText = guards;
            promptText = prompt;
            healingText = healing;
            gate = missionGate;
            audioDirector = audio;
            cameraRig = cameraController;
            UpdateHud();
        }

        public void SetHero(ThirdPersonHero value)
        {
            hero = value;
            hero.Health.Changed += OnHealthChanged;
            OnHealthChanged(hero.Health.Current, hero.Health.Maximum);
            SetHealingCharges(2);
        }

        public void RegisterGuard()
        {
            registeredGuards += 1;
            UpdateHud();
        }

        public void NotifyGuardDefeated()
        {
            defeatedGuards += 1;
            UpdateHud();
        }

        public void CollectObjective(ObjectivePickup pickup)
        {
            collectedObjectives = Mathf.Min(RequiredObjectives, collectedObjectives + 1);
            audioDirector?.Play(SoundCue.Objective);
            cameraRig?.AddShake(0.08f);
            Destroy(pickup.gameObject);
            UpdateHud();
        }

        public void TryOpenGate(Vector3 playerPosition)
        {
            if (gate == null || Vector3.Distance(playerPosition, gate.transform.position) > 2.6f)
            {
                promptText.text = "Reach the northern timber gate.";
                return;
            }

            if (collectedObjectives < RequiredObjectives)
            {
                promptText.text = "Secure both dispatches before opening the gate.";
                return;
            }

            if (gate.Open())
            {
                audioDirector?.Play(SoundCue.Gate);
                cameraRig?.AddShake(0.25f);
                promptText.text = "The gate is open. The coalition enters Pataliputra.";
            }
        }

        public void SetHealingCharges(int charges)
        {
            if (healingText != null)
            {
                healingText.text = $"Recovery {charges}";
            }
        }

        public void ResolveFailure()
        {
            if (promptText != null)
            {
                promptText.text = "Chandragupta falls back. Restart the mission.";
            }
        }

        private void OnHealthChanged(float current, float maximum)
        {
            if (healthText != null)
            {
                healthText.text = $"Health {Mathf.CeilToInt(current)} / {Mathf.CeilToInt(maximum)}";
            }
        }

        private void UpdateHud()
        {
            if (objectiveText != null)
            {
                objectiveText.text = $"Dispatches {collectedObjectives} / {RequiredObjectives}";
            }

            if (guardText != null)
            {
                guardText.text = $"Guards {defeatedGuards} / {registeredGuards}";
            }

            if (promptText != null && string.IsNullOrWhiteSpace(promptText.text))
            {
                promptText.text = "Secure two dispatches, then open the northern gate.";
            }
        }

        private void OnDestroy()
        {
            if (hero != null && hero.Health != null)
            {
                hero.Health.Changed -= OnHealthChanged;
            }
        }
    }
}
