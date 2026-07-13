using UnityEngine;

namespace Chakravarti.Action
{
    public enum CombatTeam
    {
        Player,
        Guard
    }

    public sealed class Health : MonoBehaviour
    {
        [SerializeField] private CombatTeam team;
        [SerializeField] private float maximum = 130f;

        public event global::System.Action<float, float> Changed;
        public event global::System.Action Damaged;
        public event global::System.Action Died;

        public CombatTeam Team => team;
        public float Current { get; private set; }
        public float Maximum => maximum;
        public bool IsAlive => Current > 0f;

        public void Configure(CombatTeam value, float maxHealth)
        {
            team = value;
            maximum = maxHealth;
            Current = maximum;
            Changed?.Invoke(Current, maximum);
        }

        public void TakeDamage(float amount)
        {
            if (!IsAlive || amount <= 0f)
            {
                return;
            }

            Current = Mathf.Max(0f, Current - amount);
            Damaged?.Invoke();
            Changed?.Invoke(Current, maximum);
            if (Current <= 0f)
            {
                Died?.Invoke();
            }
        }

        public bool Heal(float amount)
        {
            if (!IsAlive || Current >= maximum || amount <= 0f)
            {
                return false;
            }

            Current = Mathf.Min(maximum, Current + amount);
            Changed?.Invoke(Current, maximum);
            return true;
        }
    }
}
