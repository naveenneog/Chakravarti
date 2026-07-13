using UnityEngine;

namespace Chakravarti.Action
{
    [RequireComponent(typeof(CharacterController), typeof(Health), typeof(MeleeCombat))]
    public sealed class EnemyGuard : MonoBehaviour
    {
        [SerializeField] private float noticeRange = 10f;
        [SerializeField] private float attackRange = 1.65f;
        [SerializeField] private float movementSpeed = 2.2f;
        [SerializeField] private float rotationSpeed = 10f;

        private Transform target;
        private ThirdPersonHero player;
        private CharacterController controller;
        private Health health;
        private MeleeCombat combat;
        private ClipAnimator clipAnimator;
        private MissionDirector mission;
        private ProceduralAudioDirector audioDirector;
        private float attackTimer;
        private bool dead;

        public void Initialize(
            Transform player,
            MissionDirector missionDirector,
            ProceduralAudioDirector audio
        )
        {
            target = player;
            this.player = player.GetComponent<ThirdPersonHero>();
            mission = missionDirector;
            audioDirector = audio;
            controller = GetComponent<CharacterController>();
            health = GetComponent<Health>();
            combat = GetComponent<MeleeCombat>();
            clipAnimator = GetComponent<ClipAnimator>();
            combat.Initialize(health, audioDirector);
            health.Damaged += OnDamaged;
            health.Died += OnDied;
            mission.RegisterGuard();
        }

        private void Update()
        {
            if (
                dead ||
                target == null ||
                !target.gameObject.activeInHierarchy ||
                player == null ||
                player.Health == null ||
                !player.Health.IsAlive
            )
            {
                return;
            }

            Vector3 difference = target.position - transform.position;
            difference.y = 0f;
            float distance = difference.magnitude;
            attackTimer = Mathf.Max(0f, attackTimer - Time.deltaTime);

            if (distance <= attackRange)
            {
                clipAnimator?.PlayLocomotion("Idle");
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    Quaternion.LookRotation(difference.normalized),
                    rotationSpeed * Time.deltaTime
                );
                if (attackTimer <= 0f)
                {
                    attackTimer = 0.95f;
                    clipAnimator?.PlayOneShot("Punch", 0.7f);
                    combat.TryAttack(transform.forward);
                }
                return;
            }

            if (distance <= noticeRange)
            {
                Vector3 move = difference.normalized;
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    Quaternion.LookRotation(move),
                    rotationSpeed * Time.deltaTime
                );
                controller.Move(move * movementSpeed * Time.deltaTime);
                controller.Move(Vector3.down * 4f * Time.deltaTime);
                clipAnimator?.PlayLocomotion("Run");
            }
            else
            {
                clipAnimator?.PlayLocomotion("Idle");
            }
        }

        private void OnDamaged()
        {
            clipAnimator?.PlayOneShot("RecieveHit", 0.58f);
        }

        private void OnDied()
        {
            dead = true;
            controller.enabled = false;
            clipAnimator?.PlayOneShot("Defeat", 1f);
            audioDirector?.Play(SoundCue.Defeat);
            mission.NotifyGuardDefeated();
            Destroy(gameObject, 1.5f);
        }

        private void OnDestroy()
        {
            if (health == null)
            {
                return;
            }

            health.Damaged -= OnDamaged;
            health.Died -= OnDied;
        }
    }
}
