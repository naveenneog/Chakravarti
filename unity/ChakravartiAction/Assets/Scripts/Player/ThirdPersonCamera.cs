using UnityEngine;

namespace Chakravarti.Action
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField] private Vector3 offset = new(0f, 2.85f, -4.35f);
        [SerializeField] private float followSharpness = 8f;
        [SerializeField] private float lookHeight = 1.25f;

        private Transform target;
        private float shake;

        public void Initialize(Transform followTarget)
        {
            target = followTarget;
            transform.position = target.TransformPoint(offset);
        }

        public void AddShake(float amount)
        {
            shake = Mathf.Max(shake, amount);
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            Vector3 desired = target.TransformPoint(offset);
            if (Physics.Linecast(target.position + Vector3.up, desired, out RaycastHit hit))
            {
                desired = hit.point + hit.normal * 0.25f;
            }

            shake = Mathf.MoveTowards(shake, 0f, Time.deltaTime * 1.8f);
            desired += Random.insideUnitSphere * shake;
            transform.position = Vector3.Lerp(
                transform.position,
                desired,
                1f - Mathf.Exp(-followSharpness * Time.deltaTime)
            );
            transform.LookAt(target.position + Vector3.up * lookHeight);
        }
    }
}
