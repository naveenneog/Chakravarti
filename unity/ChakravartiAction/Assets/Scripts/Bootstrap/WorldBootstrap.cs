using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Chakravarti.Action
{
    public sealed class WorldBootstrap : MonoBehaviour
    {
        private readonly Color crimson = new(0.52f, 0.055f, 0.16f);
        private readonly Color rose = new(0.9f, 0.28f, 0.4f);
        private readonly Color gold = new(0.95f, 0.61f, 0.12f);
        private readonly Color timber = new(0.22f, 0.13f, 0.08f);
        private readonly Color earth = new(0.18f, 0.14f, 0.11f);
        private readonly Color stone = new(0.42f, 0.38f, 0.32f);
        private readonly Color foliage = new(0.06f, 0.28f, 0.12f);
        private readonly Color skin = new(0.55f, 0.27f, 0.12f);

        private Material crimsonMaterial;
        private Material roseMaterial;
        private Material goldMaterial;
        private Material timberMaterial;
        private Material earthMaterial;
        private Material stoneMaterial;
        private Material foliageMaterial;
        private Material skinMaterial;
        private Material darkMaterial;

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Screen.orientation = ScreenOrientation.AutoRotation;
            Screen.autorotateToPortrait = false;
            Screen.autorotateToPortraitUpsideDown = false;
            Screen.autorotateToLandscapeLeft = true;
            Screen.autorotateToLandscapeRight = true;
            gameObject.AddComponent<AutomatedSmokeRunner>();
            gameObject.AddComponent<ShowcaseCaptureRunner>();
            BuildMaterials();
            ConfigureRendering();

            ProceduralAudioDirector audioDirector = new GameObject("Audio Director")
                .AddComponent<ProceduralAudioDirector>();
            audioDirector.Initialize();

            ThirdPersonCamera cameraRig = BuildCamera();
            MissionDirector mission = new GameObject("Mission Director")
                .AddComponent<MissionDirector>();
            MissionGate gate = BuildEnvironment();
            HudReferences hud = BuildHud(audioDirector);

            ThirdPersonHero hero = BuildHero(mission, audioDirector);
            cameraRig.Initialize(hero.transform);
            mission.Initialize(
                hud.Health,
                hud.Objectives,
                hud.Guards,
                hud.Prompt,
                hud.Healing,
                gate,
                audioDirector,
                cameraRig
            );
            mission.SetHero(hero);

            BuildGuard(new Vector3(0f, 0f, 6f), hero.transform, mission, audioDirector);
            BuildGuard(new Vector3(5.4f, 0f, 3f), hero.transform, mission, audioDirector);
            BuildGuard(new Vector3(-4f, 0f, -3f), hero.transform, mission, audioDirector);
            BuildGuard(new Vector3(4.8f, 0f, -7f), hero.transform, mission, audioDirector);
            BuildObjective(new Vector3(-7.4f, 2.8f, 3.3f), mission);
            BuildObjective(new Vector3(6.2f, 0.55f, -5f), mission);
        }

        private void ConfigureRendering()
        {
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.045f, 0.035f, 0.04f);
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.012f;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.26f, 0.17f, 0.2f);
            RenderSettings.ambientEquatorColor = new Color(0.12f, 0.085f, 0.07f);
            RenderSettings.ambientGroundColor = new Color(0.035f, 0.025f, 0.02f);
            QualitySettings.shadowDistance = Application.isMobilePlatform ? 24f : 45f;
            QualitySettings.shadows = Application.isMobilePlatform
                ? ShadowQuality.HardOnly
                : ShadowQuality.All;
            QualitySettings.shadowResolution = Application.isMobilePlatform
                ? ShadowResolution.Medium
                : ShadowResolution.High;
        }

        private void BuildMaterials()
        {
            crimsonMaterial = CreateMaterial("Mauryan Crimson", crimson, 0.1f, 0.75f);
            roseMaterial = CreateMaterial("Rose Textile", rose, 0f, 0.86f);
            goldMaterial = CreateMaterial("Burnished Gold", gold, 0.58f, 0.3f);
            timberMaterial = CreateMaterial("Dark Timber", timber, 0f, 0.92f);
            earthMaterial = CreateMaterial("Packed Earth", earth, 0f, 0.98f);
            stoneMaterial = CreateMaterial("Weathered Stone", stone, 0f, 0.88f);
            foliageMaterial = CreateMaterial("Gangetic Foliage", foliage, 0f, 0.9f);
            skinMaterial = CreateMaterial("Skin", skin, 0f, 0.72f);
            darkMaterial = CreateMaterial("Iron and Hair", new Color(0.035f, 0.025f, 0.025f), 0.48f, 0.3f);
        }

        private ThirdPersonCamera BuildCamera()
        {
            Camera camera = new GameObject("Main Camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.fieldOfView = 58f;
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 120f;
            camera.backgroundColor = new Color(0.025f, 0.018f, 0.025f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.gameObject.AddComponent<AudioListener>();
            return camera.gameObject.AddComponent<ThirdPersonCamera>();
        }

        private MissionGate BuildEnvironment()
        {
            CreateBox("Ground", new Vector3(0f, -0.12f, 0f), new Vector3(24f, 0.24f, 34f), earthMaterial);
            CreateBox("River", new Vector3(0f, -0.04f, 16.2f), new Vector3(24f, 0.12f, 2f), stoneMaterial);

            for (int index = -10; index <= 10; index++)
            {
                if (index is >= -9 and <= -6)
                {
                    continue;
                }

                CreateBox(
                    $"Inner Palisade {index}",
                    new Vector3(index, 1.55f, 0f),
                    new Vector3(0.78f, 3.1f, 0.72f),
                    timberMaterial
                );
            }

            CreateBox("Inner Rampart", new Vector3(0f, 0.16f, 0f), new Vector3(22f, 0.32f, 1.2f), stoneMaterial);
            CreateBox("West Roof South", new Vector3(-7.5f, 2.25f, 4.5f), new Vector3(3f, 0.35f, 6.8f), timberMaterial);
            CreateBox("West Roof North", new Vector3(-7.5f, 2.25f, -4.5f), new Vector3(3f, 0.35f, 6.8f), timberMaterial);
            GameObject ramp = CreateBox(
                "Roof Ramp",
                new Vector3(-4.8f, 1.1f, 6f),
                new Vector3(3.55f, 0.35f, 3.5f),
                timberMaterial
            );
            ramp.transform.eulerAngles = new Vector3(0f, 0f, -41f);

            CreateHouse(new Vector3(-4.2f, 0.8f, 8.5f), crimsonMaterial);
            CreateHouse(new Vector3(4.3f, 0.8f, 8.7f), stoneMaterial);
            CreateHouse(new Vector3(5.2f, 0.8f, -2.8f), timberMaterial);
            CreateHouse(new Vector3(-2.8f, 0.8f, -7.5f), roseMaterial);
            CreateTree(new Vector3(-8.6f, 0f, 11.8f));
            CreateTree(new Vector3(8.5f, 0f, 10.8f));
            CreateTree(new Vector3(8.2f, 0f, -9.6f));

            for (int index = -10; index <= 10; index += 2)
            {
                CreateBox(
                    $"North Wall {index}",
                    new Vector3(index, 2f, -15.4f),
                    new Vector3(1.45f, 4f, 0.9f),
                    timberMaterial
                );
            }

            CreateBox("North Wall Left", new Vector3(-3.5f, 2f, -13.4f), new Vector3(5.6f, 4f, 1f), timberMaterial);
            CreateBox("North Wall Right", new Vector3(3.5f, 2f, -13.4f), new Vector3(5.6f, 4f, 1f), timberMaterial);
            GameObject gateObject = CreateBox(
                "Northern Timber Gate",
                new Vector3(0f, 1.9f, -13.4f),
                new Vector3(2.2f, 3.8f, 0.9f),
                crimsonMaterial
            );
            MissionGate gate = gateObject.AddComponent<MissionGate>();

            BuildTorch(new Vector3(-8.5f, 1.2f, 0.9f));
            BuildTorch(new Vector3(8.5f, 1.2f, 0.9f));
            BuildTorch(new Vector3(-4.4f, 1.2f, -10.5f));
            BuildTorch(new Vector3(4.4f, 1.2f, -10.5f));

            Light sun = new GameObject("Dawn Key Light").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.76f, 0.56f);
            sun.intensity = 1.75f;
            sun.shadows = Application.isMobilePlatform
                ? LightShadows.Hard
                : LightShadows.Soft;
            sun.shadowStrength = 0.82f;
            sun.transform.rotation = Quaternion.Euler(46f, -32f, 0f);

            Light fill = new GameObject("Cool Fill Light").AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.color = new Color(0.35f, 0.42f, 0.62f);
            fill.intensity = 0.65f;
            fill.transform.rotation = Quaternion.Euler(35f, 148f, 0f);
            return gate;
        }

        private ThirdPersonHero BuildHero(
            MissionDirector mission,
            ProceduralAudioDirector audioDirector
        )
        {
            GameObject root = new("Chandragupta");
            root.transform.SetPositionAndRotation(new Vector3(0f, 1.05f, 13.2f), Quaternion.Euler(0f, 180f, 0f));
            CharacterController controller = root.AddComponent<CharacterController>();
            controller.height = 2.1f;
            controller.radius = 0.38f;
            controller.center = new Vector3(0f, 1.02f, 0f);
            controller.stepOffset = 0.38f;
            Health health = root.AddComponent<Health>();
            health.Configure(CombatTeam.Player, 130f);
            MeleeCombat combat = root.AddComponent<MeleeCombat>();
            combat.ConfigureDamage(42f);
            ClipAnimator clips = root.AddComponent<ClipAnimator>();
            ThirdPersonHero hero = root.AddComponent<ThirdPersonHero>();

            GameObject modelPrefab = Resources.Load<GameObject>("Characters/Kimono_Male");
            GameObject model = Instantiate(modelPrefab, root.transform);
            model.name = "Chandragupta Model";
            model.transform.localPosition = new Vector3(0f, -1.03f, 0f);
            model.transform.localRotation = Quaternion.identity;
            model.transform.localScale = Vector3.one * 0.66f;
            CharacterStyler.StyleHero(
                model,
                skinMaterial,
                crimsonMaterial,
                goldMaterial,
                darkMaterial
            );
            clips.Initialize(model, "AnimationLibraries/Kimono_Male");
            hero.Initialize(Camera.main.transform, mission, audioDirector);
            return hero;
        }

        private void BuildGuard(
            Vector3 position,
            Transform player,
            MissionDirector mission,
            ProceduralAudioDirector audioDirector
        )
        {
            GameObject root = new("Nanda Guard");
            root.transform.position = position;
            CharacterController controller = root.AddComponent<CharacterController>();
            controller.height = 2.05f;
            controller.radius = 0.38f;
            controller.center = new Vector3(0f, 1f, 0f);
            Health health = root.AddComponent<Health>();
            health.Configure(CombatTeam.Guard, 68f);
            MeleeCombat combat = root.AddComponent<MeleeCombat>();
            combat.ConfigureDamage(9f);
            ClipAnimator clips = root.AddComponent<ClipAnimator>();
            EnemyGuard guard = root.AddComponent<EnemyGuard>();

            GameObject modelPrefab = Resources.Load<GameObject>("Characters/Ninja_Sand");
            GameObject model = Instantiate(modelPrefab, root.transform);
            model.name = "Nanda Guard Model";
            model.transform.localPosition = Vector3.zero;
            model.transform.localRotation = Quaternion.identity;
            model.transform.localScale = Vector3.one * 0.65f;
            CharacterStyler.StyleGuard(
                model,
                skinMaterial,
                roseMaterial,
                goldMaterial,
                darkMaterial
            );
            clips.Initialize(model, "AnimationLibraries/Ninja_Sand");
            guard.Initialize(player, mission, audioDirector);
        }

        private void BuildObjective(Vector3 position, MissionDirector mission)
        {
            GameObject pickup = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pickup.name = "Dispatch Seal";
            pickup.transform.position = position;
            pickup.transform.localScale = new Vector3(0.48f, 0.1f, 0.48f);
            pickup.GetComponent<Renderer>().material = goldMaterial;
            Collider collider = pickup.GetComponent<Collider>();
            collider.isTrigger = true;
            ObjectivePickup objective = pickup.AddComponent<ObjectivePickup>();
            objective.Initialize(mission);

            Light glow = pickup.AddComponent<Light>();
            glow.type = LightType.Point;
            glow.color = gold;
            glow.intensity = 2.4f;
            glow.range = 4f;
        }

        private HudReferences BuildHud(ProceduralAudioDirector audioDirector)
        {
            GameObject eventSystem = new("Event System");
            eventSystem.AddComponent<EventSystem>();
            eventSystem.AddComponent<StandaloneInputModule>();

            Canvas canvas = new GameObject("Action HUD").AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvas.gameObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 1f;
            canvas.gameObject.AddComponent<GraphicRaycaster>();

            GameObject safeAreaObject = new("Safe Area");
            safeAreaObject.transform.SetParent(canvas.transform, false);
            RectTransform safeArea = safeAreaObject.AddComponent<RectTransform>();
            safeArea.anchorMin = Vector2.zero;
            safeArea.anchorMax = Vector2.one;
            safeArea.offsetMin = Vector2.zero;
            safeArea.offsetMax = Vector2.zero;
            safeAreaObject.AddComponent<SafeAreaFitter>();
            Transform uiRoot = safeAreaObject.transform;

            Font font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null)
            {
                font = Font.CreateDynamicFontFromOSFont("Arial", 28);
            }
            Text title = CreateText(uiRoot, "Title", "THE TIMBER GATE", font, 50, TextAnchor.UpperLeft);
            SetRect(title.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(36f, -34f), new Vector2(760f, 80f));
            Text prompt = CreateText(uiRoot, "Prompt", "Secure two dispatches, then open the northern gate.", font, 25, TextAnchor.UpperLeft);
            SetRect(prompt.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(38f, -118f), new Vector2(780f, 55f));
            Text health = CreateText(uiRoot, "Health", "Health 130 / 130", font, 25, TextAnchor.MiddleCenter);
            Text objectives = CreateText(uiRoot, "Objectives", "Dispatches 0 / 2", font, 25, TextAnchor.MiddleCenter);
            Text guards = CreateText(uiRoot, "Guards", "Guards 0 / 4", font, 25, TextAnchor.MiddleCenter);
            Text healing = CreateText(uiRoot, "Healing", "Recovery 2", font, 25, TextAnchor.MiddleCenter);
            PlaceHudChip(health.rectTransform, 36f);
            PlaceHudChip(objectives.rectTransform, 266f);
            PlaceHudChip(guards.rectTransform, 496f);
            PlaceHudChip(healing.rectTransform, 726f);

            CreateMoveButton(uiRoot, "Up", "▲", new Vector2(190f, 300f), ControlAction.MoveUp, font);
            CreateMoveButton(uiRoot, "Left", "◀", new Vector2(20f, 140f), ControlAction.MoveLeft, font);
            CreateMoveButton(uiRoot, "Down", "▼", new Vector2(190f, 140f), ControlAction.MoveDown, font);
            CreateMoveButton(uiRoot, "Right", "▶", new Vector2(360f, 140f), ControlAction.MoveRight, font);
            CreateMoveButton(uiRoot, "Jump", "JUMP", new Vector2(-360f, 300f), ControlAction.Jump, font, true);
            CreateMoveButton(uiRoot, "Strike", "STRIKE", new Vector2(-180f, 300f), ControlAction.Attack, font, true, rose);
            CreateMoveButton(uiRoot, "Open", "OPEN", new Vector2(-360f, 140f), ControlAction.Interact, font, true);
            CreateMoveButton(uiRoot, "Heal", "HEAL", new Vector2(-180f, 140f), ControlAction.Heal, font, true);
            Button mute = CreateUtilityButton(uiRoot, "Sound", "SOUND", new Vector2(-24f, -24f), font);
            mute.onClick.AddListener(audioDirector.ToggleMuted);

            return new HudReferences
            {
                Health = health,
                Objectives = objectives,
                Guards = guards,
                Prompt = prompt,
                Healing = healing
            };
        }

        private Button CreateMoveButton(
            Transform parent,
            string objectName,
            string label,
            Vector2 offset,
            ControlAction action,
            Font font,
            bool anchorRight = false,
            Color? color = null
        )
        {
            GameObject buttonObject = new(objectName);
            buttonObject.transform.SetParent(parent, false);
            Image image = buttonObject.AddComponent<Image>();
            image.color = color ?? new Color(0.06f, 0.055f, 0.065f, 0.88f);
            Button button = buttonObject.AddComponent<Button>();
            MobileControlButton control = buttonObject.AddComponent<MobileControlButton>();
            control.Configure(action);
            RectTransform rect = buttonObject.GetComponent<RectTransform>();
            Vector2 anchor = anchorRight ? Vector2.right : Vector2.zero;
            SetRect(rect, anchor, anchor, offset, new Vector2(160f, 140f));

            Text text = CreateText(buttonObject.transform, "Label", label, font, 24, TextAnchor.MiddleCenter);
            SetRect(text.rectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            text.color = Color.white;
            return button;
        }

        private Button CreateUtilityButton(
            Transform parent,
            string objectName,
            string label,
            Vector2 offset,
            Font font
        )
        {
            GameObject buttonObject = new(objectName);
            buttonObject.transform.SetParent(parent, false);
            Image image = buttonObject.AddComponent<Image>();
            image.color = new Color(0.06f, 0.055f, 0.065f, 0.88f);
            Button button = buttonObject.AddComponent<Button>();
            RectTransform rect = buttonObject.GetComponent<RectTransform>();
            SetRect(rect, Vector2.one, Vector2.one, offset, new Vector2(160f, 82f));
            Text text = CreateText(buttonObject.transform, "Label", label, font, 22, TextAnchor.MiddleCenter);
            SetRect(text.rectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            return button;
        }

        private static void PlaceHudChip(RectTransform rect, float x)
        {
            SetRect(rect, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(x, -188f), new Vector2(210f, 58f));
        }

        private static Text CreateText(
            Transform parent,
            string objectName,
            string value,
            Font font,
            int fontSize,
            TextAnchor alignment
        )
        {
            GameObject textObject = new(objectName);
            textObject.transform.SetParent(parent, false);
            Text text = textObject.AddComponent<Text>();
            text.font = font;
            text.fontSize = fontSize;
            text.fontStyle = FontStyle.Bold;
            text.alignment = alignment;
            text.color = Color.white;
            text.text = value;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }

        private static void SetRect(
            RectTransform rect,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 position,
            Vector2 size
        )
        {
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = anchorMin;
            rect.anchoredPosition = position;
            if (anchorMin == anchorMax)
            {
                rect.sizeDelta = size;
            }
            else
            {
                rect.offsetMin = Vector2.zero;
                rect.offsetMax = Vector2.zero;
            }
        }

        private void CreateHouse(Vector3 position, Material roofMaterial)
        {
            CreateBox("Timber House", position, new Vector3(3.4f, 1.6f, 2.7f), timberMaterial);
            GameObject roof = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            roof.name = "Low Roof";
            roof.transform.position = position + Vector3.up * 1.35f;
            roof.transform.localScale = new Vector3(2.15f, 0.6f, 2.15f);
            roof.transform.eulerAngles = new Vector3(0f, 45f, 0f);
            roof.GetComponent<Renderer>().material = roofMaterial;
        }

        private void CreateTree(Vector3 position)
        {
            CreateBox("Tree Trunk", position + Vector3.up * 1.4f, new Vector3(0.45f, 2.8f, 0.45f), timberMaterial);
            GameObject crown = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            crown.name = "Broadleaf Crown";
            crown.transform.position = position + Vector3.up * 3.5f;
            crown.transform.localScale = new Vector3(2.4f, 2f, 2.4f);
            crown.GetComponent<Renderer>().material = foliageMaterial;
        }

        private void BuildTorch(Vector3 position)
        {
            CreateBox("Torch", position, new Vector3(0.12f, 1.5f, 0.12f), timberMaterial);
            Light light = new GameObject("Torch Light").AddComponent<Light>();
            light.transform.position = position + Vector3.up * 0.9f;
            light.type = LightType.Point;
            light.color = gold;
            light.intensity = 3.2f;
            light.range = 8f;
            light.shadows = Application.isMobilePlatform
                ? LightShadows.None
                : LightShadows.Soft;
        }

        private GameObject CreateBox(
            string objectName,
            Vector3 position,
            Vector3 scale,
            Material material
        )
        {
            GameObject item = GameObject.CreatePrimitive(PrimitiveType.Cube);
            item.name = objectName;
            item.transform.position = position;
            item.transform.localScale = scale;
            Renderer renderer = item.GetComponent<Renderer>();
            renderer.material = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            renderer.receiveShadows = true;
            return item;
        }

        private static Material CreateMaterial(
            string materialName,
            Color color,
            float metallic,
            float smoothness
        )
        {
            Material material = new(Shader.Find("Standard"))
            {
                name = materialName,
                color = color
            };
            material.SetFloat("_Metallic", metallic);
            material.SetFloat("_Glossiness", 1f - smoothness);
            return material;
        }

        private sealed class HudReferences
        {
            public Text Health;
            public Text Objectives;
            public Text Guards;
            public Text Prompt;
            public Text Healing;
        }
    }
}
