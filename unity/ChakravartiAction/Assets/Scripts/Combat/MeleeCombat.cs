using UnityEngine;

namespace Chakravarti.Action
{
    public sealed class MeleeCombat : MonoBehaviour
    {
        [SerializeField] private float range = 1.9f;
        [SerializeField] private float damage = 42f;
        [SerializeField] private float cooldown = 0.48f;

        private Health ownerHealth;
        private ProceduralAudioDirector audioDirector;
        private float nextAttackTime;

        public void Initialize(Health owner, ProceduralAudioDirector audio)
        {
            ownerHealth = owner;
            audioDirector = audio;
        }

        public void ConfigureDamage(float value)
        {
            damage = value;
        }

        public bool TryAttack(Vector3 forward)
        {
            if (
                ownerHealth == null ||
                !ownerHealth.IsAlive ||
                Time.time < nextAttackTime
            )
            {
                return false;
            }

            nextAttackTime = Time.time + cooldown;
            audioDirector?.Play(SoundCue.Sword);

            Vector3 center = transform.position + Vector3.up + forward.normalized * 0.9f;
            Collider[] hits = Physics.OverlapSphere(center, range);
            Health bestTarget = null;
            float bestDistance = float.MaxValue;

            foreach (Collider hit in hits)
            {
                Health candidate = hit.GetComponentInParent<Health>();
                if (
                    candidate == null ||
                    candidate == ownerHealth ||
                    candidate.Team == ownerHealth.Team ||
                    !candidate.IsAlive
                )
                {
                    continue;
                }

                Vector3 direction = candidate.transform.position - transform.position;
                if (Vector3.Dot(forward.normalized, direction.normalized) < 0.15f)
                {
                    continue;
                }

                float distance = direction.sqrMagnitude;
                if (distance < bestDistance)
                {
                    bestDistance = distance;
                    bestTarget = candidate;
                }
            }

            if (bestTarget != null)
            {
                bestTarget.TakeDamage(damage);
                audioDirector?.Play(SoundCue.Impact);
            }

            return true;
        }
    }
}
