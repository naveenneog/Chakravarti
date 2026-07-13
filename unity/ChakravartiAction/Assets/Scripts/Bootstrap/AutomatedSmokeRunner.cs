using System.Collections;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Chakravarti.Action
{
    public sealed class AutomatedSmokeRunner : MonoBehaviour
    {
        private IEnumerator Start()
        {
            if (!System.Environment.GetCommandLineArgs().Contains("-smokeTest"))
            {
                yield break;
            }

            string output = System.Environment
                .GetCommandLineArgs()
                .FirstOrDefault(argument => argument.StartsWith("-smokeOutput="))
                ?.Substring("-smokeOutput=".Length);
            if (string.IsNullOrWhiteSpace(output))
            {
                output = Path.Combine(Application.persistentDataPath, "unity-smoke.png");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            yield return new WaitForSeconds(2f);
            ActionInput.SetHeld(ControlAction.MoveUp, true);
            yield return new WaitForSeconds(1.1f);
            ActionInput.SetHeld(ControlAction.MoveUp, false);
            ActionInput.Pulse(ControlAction.Attack);
            yield return new WaitForSeconds(1.2f);
            ScreenCapture.CaptureScreenshot(output, 1);
            yield return new WaitForSeconds(1f);
            Application.Quit(0);
        }
    }
}
