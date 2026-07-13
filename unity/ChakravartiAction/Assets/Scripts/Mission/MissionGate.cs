using System.Collections;
using UnityEngine;

namespace Chakravarti.Action
{
    public sealed class MissionGate : MonoBehaviour
    {
        private bool opened;

        public bool Open()
        {
            if (opened)
            {
                return false;
            }

            opened = true;
            StartCoroutine(OpenRoutine());
            return true;
        }

        private IEnumerator OpenRoutine()
        {
            Vector3 start = transform.position;
            Vector3 end = start + Vector3.up * 4.8f;
            float elapsed = 0f;
            while (elapsed < 1.4f)
            {
                elapsed += Time.deltaTime;
                float progress = Mathf.SmoothStep(0f, 1f, elapsed / 1.4f);
                transform.position = Vector3.Lerp(start, end, progress);
                yield return null;
            }
        }
    }
}
