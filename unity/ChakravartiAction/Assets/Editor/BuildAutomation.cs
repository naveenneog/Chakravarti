using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Chakravarti.Action.Editor
{
    public static class BuildAutomation
    {
        private static readonly string[] Scenes =
        {
            "Assets/Scenes/TimberGate.unity"
        };

        public static void BuildWindows()
        {
            ProjectBootstrap.Configure();
            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.Standalone,
                BuildTarget.StandaloneWindows64
            );
            string output = Path.GetFullPath(
                Path.Combine(Application.dataPath, "..", "Builds", "Windows", "ChakravartiAction.exe")
            );
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            BuildPlayerOptions options = new()
            {
                scenes = Scenes,
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };
            RequireSuccess(BuildPipeline.BuildPlayer(options), output);
        }

        public static void BuildAndroid()
        {
            ProjectBootstrap.Configure();
            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.Android,
                BuildTarget.Android
            );
            string output = Path.GetFullPath(
                Path.Combine(
                    Application.dataPath,
                    "..",
                    "Builds",
                    "Android",
                    $"ChakravartiAction-v{PlayerSettings.bundleVersion}.apk"
                )
            );
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            EditorUserBuildSettings.buildAppBundle = false;
            BuildPlayerOptions options = new()
            {
                scenes = Scenes,
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };
            RequireSuccess(BuildPipeline.BuildPlayer(options), output);
        }

        private static void RequireSuccess(BuildReport report, string output)
        {
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Unity build failed: {report.summary.result}, errors={report.summary.totalErrors}"
                );
            }

            Debug.Log($"Unity build ready: {output} ({report.summary.totalSize} bytes)");
        }
    }
}
