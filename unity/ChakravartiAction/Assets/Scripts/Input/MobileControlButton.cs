using UnityEngine;
using UnityEngine.EventSystems;

namespace Chakravarti.Action
{
    public sealed class MobileControlButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
    {
        [SerializeField] private ControlAction action;

        public void Configure(ControlAction value)
        {
            action = value;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            ActionInput.SetHeld(action, true);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            ActionInput.SetHeld(action, false);
        }

        private void OnDisable()
        {
            ActionInput.SetHeld(action, false);
        }
    }
}
