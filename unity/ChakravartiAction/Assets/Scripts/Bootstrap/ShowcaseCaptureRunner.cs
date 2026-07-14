using System;
using System.Collections;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Chakravarti.Action
{
    public sealed class ShowcaseCaptureRunner : MonoBehaviour
    {
        private const int FrameRate = 30;
        private const int TotalFrames = 600;

        private IEnumerator Start()
        {
            string argument = System.Environment
                .GetCommandLineArgs()
                .FirstOrDefault(value => value.StartsWith("-showcaseFrames="));
            if (string.IsNullOrWhiteSpace(argument))
            {
                yield break;
            }

            string requested = argument.Substring("-showcaseFrames=".Length)
                .Trim()
                .Trim('"');
            if (!TryResolveSafeCapturePath(requested, out string output))
            {
                Debug.LogError(
                    $"ShowcaseCaptureRunner: refusing unsafe capture path '{requested}'. "
                        + "Pass a subfolder whose name contains 'capture', 'showcase', or 'frame'."
                );
                yield break;
            }

            if (Directory.Exists(output))
            {
                Directory.Delete(output, true);
            }
            Directory.CreateDirectory(output);

            Time.captureFramerate = FrameRate;
            Application.targetFrameRate = FrameRate;
            for (int index = 0; index < 45; index += 1)
            {
                yield return null;
            }

            for (int frame = 0; frame < TotalFrames; frame += 1)
            {
                ApplySequence(frame);
                yield return new WaitForEndOfFrame();
                Texture2D screenshot = ScreenCapture.CaptureScreenshotAsTexture(1);
                byte[] jpeg = screenshot.EncodeToJPG(88);
                Destroy(screenshot);
                File.WriteAllBytes(
                    Path.Combine(output, $"frame_{frame:0000}.jpg"),
                    jpeg
                );
            }

            ActionInput.Reset();
            File.WriteAllText(Path.Combine(output, "complete.txt"), "600");
            Application.Quit(0);
        }

        private static void ApplySequence(int frame)
        {
            ActionInput.SetHeld(ControlAction.MoveUp, false);
            ActionInput.SetHeld(ControlAction.MoveDown, false);
            ActionInput.SetHeld(ControlAction.MoveLeft, false);
            ActionInput.SetHeld(ControlAction.MoveRight, false);

            if (In(frame, 0, 60) || In(frame, 95, 140) || In(frame, 245, 315) || In(frame, 360, 445) || In(frame, 505, 600))
            {
                ActionInput.SetHeld(ControlAction.MoveUp, true);
            }
            if (In(frame, 140, 205) || In(frame, 315, 360))
            {
                ActionInput.SetHeld(ControlAction.MoveUp, true);
                ActionInput.SetHeld(ControlAction.MoveLeft, true);
            }
            if (In(frame, 205, 245) || In(frame, 445, 505))
            {
                ActionInput.SetHeld(ControlAction.MoveRight, true);
            }

            if (frame is 52 or 72 or 158 or 180 or 268 or 290 or 388 or 410)
            {
                ActionInput.Pulse(ControlAction.Attack);
            }
            if (frame is 110 or 337)
            {
                ActionInput.Pulse(ControlAction.Jump);
            }
            if (frame == 230)
            {
                ActionInput.Pulse(ControlAction.Heal);
            }
            if (frame == 520)
            {
                ActionInput.Pulse(ControlAction.Interact);
            }
        }

        private static bool In(int value, int start, int end)
        {
            return value >= start && value < end;
        }

        private static bool TryResolveSafeCapturePath(string requested, out string resolved)
        {
            resolved = null;
            if (string.IsNullOrWhiteSpace(requested))
            {
                return false;
            }

            string full;
            try
            {
                full = Path.GetFullPath(requested);
            }
            catch
            {
                return false;
            }

            string root = Path.GetPathRoot(full);
            if (string.IsNullOrEmpty(root))
            {
                return false;
            }

            char[] trim = { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar };
            if (string.Equals(full.TrimEnd(trim), root.TrimEnd(trim), StringComparison.OrdinalIgnoreCase))
            {
                // Never operate on a drive or volume root.
                return false;
            }

            string leaf = new DirectoryInfo(full).Name.ToLowerInvariant();
            if (!leaf.Contains("capture") && !leaf.Contains("showcase") && !leaf.Contains("frame"))
            {
                return false;
            }

            resolved = full;
            return true;
        }
    }
}
