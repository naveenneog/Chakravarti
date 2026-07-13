using MCPForUnity.Editor.Services;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Chakravarti.Action.Editor
{
    [InitializeOnLoad]
    public static class UnityMcpAutoConnect
    {
        private static double nextAttempt;
        private static bool connecting;

        static UnityMcpAutoConnect()
        {
            EditorPrefs.SetBool("MCPForUnity.UseHttpTransport", false);
            EditorApplication.delayCall += OpenStartupScene;
            EditorApplication.update += EnsureConnected;
        }

        private static void OpenStartupScene()
        {
            Scene active = SceneManager.GetActiveScene();
            if (
                string.IsNullOrEmpty(active.path) &&
                AssetDatabase.LoadAssetAtPath<SceneAsset>(
                    "Assets/Scenes/TimberGate.unity"
                ) != null
            )
            {
                EditorSceneManager.OpenScene(
                    "Assets/Scenes/TimberGate.unity",
                    OpenSceneMode.Single
                );
            }
        }

        private static async void EnsureConnected()
        {
            if (
                connecting ||
                EditorApplication.timeSinceStartup < nextAttempt
            )
            {
                return;
            }

            connecting = true;
            nextAttempt = EditorApplication.timeSinceStartup + 3d;
            try
            {
                bool connected = await MCPServiceLocator.Bridge.StartAsync();
                if (connected)
                {
                    Debug.Log("Chakravarti Unity MCP session connected.");
                    EditorApplication.update -= EnsureConnected;
                }
            }
            finally
            {
                connecting = false;
            }
        }
    }
}
