using UnityEngine;

namespace Chakravarti.Action
{
    [RequireComponent(typeof(Collider))]
    public sealed class ObjectivePickup : MonoBehaviour
    {
        private MissionDirector mission;
        private Vector3 origin;

        public void Initialize(MissionDirector missionDirector)
        {
            mission = missionDirector;
            origin = transform.position;
        }

        private void Update()
        {
            transform.Rotate(0f, 70f * Time.deltaTime, 0f, Space.World);
            transform.position = origin + Vector3.up * (Mathf.Sin(Time.time * 2.4f) * 0.12f);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.GetComponentInParent<ThirdPersonHero>() != null)
            {
                mission?.CollectObjective(this);
            }
        }
    }
}
