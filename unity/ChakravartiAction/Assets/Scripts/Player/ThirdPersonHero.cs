using UnityEngine;

namespace Chakravarti.Action
{
    [RequireComponent(typeof(CharacterController), typeof(Health), typeof(MeleeCombat))]
    public sealed class ThirdPersonHero : MonoBehaviour
    {
        [SerializeField] private float movementSpeed = 5.4f;
        [SerializeField] private float rotationSpeed = 14f;
        [SerializeField] private float jumpHeight = 1.8f;
        [SerializeField] private float gravity = -22f;
        [SerializeField] private int healingCharges = 2;

        private CharacterController controller;
        private Health health;
        private MeleeCombat combat;
        private ClipAnimator clipAnimator;
        private Transform cameraTransform;
        private MissionDirector mission;
        private ProceduralAudioDirector audioDirector;
        private float verticalVelocity;
        private float footstepTimer;
        private float jumpBufferUntil;
        private float coyoteUntil;
        private bool dead;

        public Health Health => health;

        public void Initialize(
            Transform cameraTarget,
            MissionDirector missionDirector,
            ProceduralAudioDirector audio
        )
        {
            cameraTransform = cameraTarget;
            mission = missionDirector;
            audioDirector = audio;
            controller = GetComponent<CharacterController>();
            health = GetComponent<Health>();
            combat = GetComponent<MeleeCombat>();
            clipAnimator = GetComponent<ClipAnimator>();
            combat.Initialize(health, audioDirector);
            health.Damaged += OnDamaged;
            health.Died += OnDied;
        }

        private void Update()
        {
            if (dead || controller == null || cameraTransform == null)
            {
                return;
            }

            Vector2 keyboard = new(
                Input.GetAxisRaw("Horizontal"),
                Input.GetAxisRaw("Vertical")
            );
            Vector2 input = Vector2.ClampMagnitude(keyboard + ActionInput.MobileMove, 1f);
            Vector3 cameraForward = Vector3.ProjectOnPlane(
                cameraTransform.forward,
                Vector3.up
            ).normalized;
            Vector3 cameraRight = Vector3.ProjectOnPlane(
                cameraTransform.right,
                Vector3.up
            ).normalized;
            Vector3 move = cameraForward * input.y + cameraRight * input.x;

            if (move.sqrMagnitude > 0.01f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(move, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    targetRotation,
                    rotationSpeed * Time.deltaTime
                );
                controller.Move(move.normalized * movementSpeed * Time.deltaTime);
                clipAnimator?.PlayLocomotion("Run");
                footstepTimer -= Time.deltaTime;
                if (controller.isGrounded && footstepTimer <= 0f)
                {
                    audioDirector?.Play(SoundCue.Step);
                    footstepTimer = 0.31f;
                }
            }
            else
            {
                clipAnimator?.PlayLocomotion("Idle");
                footstepTimer = 0f;
            }

            if (controller.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }
            if (controller.isGrounded)
            {
                coyoteUntil = Time.time + 0.15f;
            }

            bool jumpPressed = Input.GetKeyDown(KeyCode.Space) || ActionInput.ConsumeJump();
            if (jumpPressed)
            {
                jumpBufferUntil = Time.time + 0.24f;
            }

            if (Time.time <= coyoteUntil && Time.time <= jumpBufferUntil)
            {
                jumpBufferUntil = 0f;
                coyoteUntil = 0f;
                verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
                clipAnimator?.PlayOneShot("Jump", 0.72f);
                audioDirector?.Play(SoundCue.Jump);
            }

            verticalVelocity += gravity * Time.deltaTime;
            controller.Move(Vector3.up * verticalVelocity * Time.deltaTime);

            if (
                (!Application.isMobilePlatform && Input.GetMouseButtonDown(0)) ||
                Input.GetKeyDown(KeyCode.F) ||
                ActionInput.ConsumeAttack()
            )
            {
                if (combat.TryAttack(transform.forward))
                {
                    clipAnimator?.PlayOneShot("SwordSlash", 0.72f);
                }
                else
                {
                    audioDirector?.Play(SoundCue.Denied);
                }
            }

            if (Input.GetKeyDown(KeyCode.E) || ActionInput.ConsumeInteract())
            {
                mission?.TryOpenGate(transform.position);
            }

            if (Input.GetKeyDown(KeyCode.H) || ActionInput.ConsumeHeal())
            {
                if (healingCharges > 0 && health.Heal(42f))
                {
                    healingCharges -= 1;
                    audioDirector?.Play(SoundCue.Heal);
                    mission?.SetHealingCharges(healingCharges);
                }
                else
                {
                    audioDirector?.Play(SoundCue.Denied);
                }
            }
        }

        private void OnDamaged()
        {
            clipAnimator?.PlayOneShot("RecieveHit", 0.62f);
            audioDirector?.Play(SoundCue.Hurt);
        }

        private void OnDied()
        {
            dead = true;
            clipAnimator?.PlayOneShot("Defeat", 1f);
            audioDirector?.Play(SoundCue.Defeat);
            mission?.ResolveFailure();
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
