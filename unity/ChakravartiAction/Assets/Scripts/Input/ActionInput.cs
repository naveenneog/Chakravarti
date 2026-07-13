using UnityEngine;

namespace Chakravarti.Action
{
    public enum ControlAction
    {
        MoveUp,
        MoveDown,
        MoveLeft,
        MoveRight,
        Jump,
        Attack,
        Interact,
        Heal
    }

    public static class ActionInput
    {
        private static bool moveUp;
        private static bool moveDown;
        private static bool moveLeft;
        private static bool moveRight;
        private static bool jump;
        private static bool attack;
        private static bool interact;
        private static bool heal;

        public static Vector2 MobileMove => new(
            (moveRight ? 1f : 0f) - (moveLeft ? 1f : 0f),
            (moveUp ? 1f : 0f) - (moveDown ? 1f : 0f)
        );

        public static void SetHeld(ControlAction action, bool held)
        {
            switch (action)
            {
                case ControlAction.MoveUp:
                    moveUp = held;
                    break;
                case ControlAction.MoveDown:
                    moveDown = held;
                    break;
                case ControlAction.MoveLeft:
                    moveLeft = held;
                    break;
                case ControlAction.MoveRight:
                    moveRight = held;
                    break;
                default:
                    if (held)
                    {
                        Pulse(action);
                    }
                    break;
            }
        }

        public static void Pulse(ControlAction action)
        {
            switch (action)
            {
                case ControlAction.Jump:
                    jump = true;
                    break;
                case ControlAction.Attack:
                    attack = true;
                    break;
                case ControlAction.Interact:
                    interact = true;
                    break;
                case ControlAction.Heal:
                    heal = true;
                    break;
            }
        }

        public static bool ConsumeJump() => Consume(ref jump);
        public static bool ConsumeAttack() => Consume(ref attack);
        public static bool ConsumeInteract() => Consume(ref interact);
        public static bool ConsumeHeal() => Consume(ref heal);

        public static void Reset()
        {
            moveUp = false;
            moveDown = false;
            moveLeft = false;
            moveRight = false;
            jump = false;
            attack = false;
            interact = false;
            heal = false;
        }

        private static bool Consume(ref bool value)
        {
            bool current = value;
            value = false;
            return current;
        }
    }
}
