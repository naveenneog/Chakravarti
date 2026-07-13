using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Chakravarti.Action.Editor
{
    public static class ProjectBootstrap
    {
        public const string GameVersion = "0.5.0";
        private const string ScenePath = "Assets/Scenes/TimberGate.unity";
        private static readonly string[] CharacterAssets =
        {
            "Assets/Resources/Characters/Kimono_Male.fbx",
            "Assets/Resources/Characters/Ninja_Sand.fbx"
        };

        [MenuItem("Chakravarti/Configure Action Project")]
        public static void Configure()
        {
            EditorPrefs.SetBool("MCPForUnity.UseHttpTransport", false);
            Directory.CreateDirectory("Assets/Scenes");
            if (AssetDatabase.IsValidFolder("Assets/Resources/Animations/BaseCharacter"))
            {
                AssetDatabase.DeleteAsset("Assets/Resources/Animations/BaseCharacter");
            }
            foreach (string path in CharacterAssets)
            {
                ConfigureCharacterImporter(path);
                string characterName = Path.GetFileNameWithoutExtension(path);
                CreateAnimationLibrary(path, characterName);
            }

            Scene scene = EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene,
                NewSceneMode.Single
            );
            new GameObject("Chakravarti Action Bootstrap").AddComponent<WorldBootstrap>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };

            PlayerSettings.companyName = "NaveenNeoG";
            PlayerSettings.productName = "Chakravarti Action";
            PlayerSettings.bundleVersion = GameVersion;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.SetApplicationIdentifier(
                BuildTargetGroup.Standalone,
                "com.naveenneog.chakravarti.action"
            );
            PlayerSettings.SetApplicationIdentifier(
                BuildTargetGroup.Android,
                "com.naveenneog.chakravarti.action"
            );
            PlayerSettings.Android.bundleVersionCode = 500;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.renderOutsideSafeArea = false;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            AssetDatabase.SaveAssets();
            Debug.Log($"Chakravarti Unity project configured. Scene: {ScenePath}");
        }

        private static void ConfigureCharacterImporter(string path)
        {
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport);
            if (AssetImporter.GetAtPath(path) is not ModelImporter importer)
            {
                throw new InvalidDataException($"Model importer unavailable for {path}");
            }

            importer.animationType = ModelImporterAnimationType.Legacy;
            importer.importAnimation = true;
            importer.importBlendShapes = true;
            importer.importCameras = false;
            importer.importLights = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            importer.globalScale = 1f;
            importer.SaveAndReimport();
        }

        private static void CreateAnimationLibrary(string modelPath, string characterName)
        {
            string legacyFolder = $"Assets/Resources/Animations/{characterName}";
            if (AssetDatabase.IsValidFolder(legacyFolder))
            {
                AssetDatabase.DeleteAsset(legacyFolder);
            }

            string folder = "Assets/Resources/AnimationLibraries";
            Directory.CreateDirectory(folder);
            string libraryPath = $"{folder}/{characterName}.asset";
            AssetDatabase.DeleteAsset(libraryPath);
            AnimationClip[] clips = AssetDatabase
                .LoadAllAssetsAtPath(modelPath)
                .OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__"))
                .ToArray();
            if (clips.Length == 0)
            {
                throw new InvalidDataException($"No animation clips found in {modelPath}");
            }

            CharacterAnimationLibrary library = ScriptableObject.CreateInstance<CharacterAnimationLibrary>();
            library.clips = clips;
            AssetDatabase.CreateAsset(library, libraryPath);
            AssetDatabase.SaveAssets();
            Debug.Log(
                $"Created animation library with {clips.Length} clips for {characterName}: "
                + string.Join(", ", clips.Select(clip => clip.name))
            );
        }
    }
}
