# Chakravarti Unity Action Client

The release-facing single-player action game lives in
`unity/ChakravartiAction`. The React application remains the strategy,
historical-content, and rapid-prototyping client.

## Toolchain

- Unity `6000.5.3f1`
- Windows Standalone Build Support
- Android Build Support with embedded SDK, NDK, and OpenJDK
- MCP for Unity `v10.0.0`
- CC0 Quaternius animated FBX characters

## Configure the project

```powershell
$unity = 'C:\Program Files\Unity\Hub\Editor\6000.5.3f1\Editor\Unity.exe'
$project = "$PWD\unity\ChakravartiAction"

& $unity -batchmode -nographics -quit `
  -projectPath $project `
  -executeMethod Chakravarti.Action.Editor.ProjectBootstrap.Configure `
  -logFile -
```

The bootstrap imports the character animation clips as legacy `.anim` assets,
creates `Assets/Scenes/TimberGate.unity`, configures player settings, and adds
the scene to build settings.

## Build

```powershell
& $unity -batchmode -nographics -quit `
  -projectPath $project `
  -executeMethod Chakravarti.Action.Editor.BuildAutomation.BuildWindows `
  -logFile -

& $unity -batchmode -nographics -quit `
  -projectPath $project `
  -executeMethod Chakravarti.Action.Editor.BuildAutomation.BuildAndroid `
  -logFile -
```

Outputs:

- `unity/ChakravartiAction/Builds/Windows/ChakravartiAction.exe`
- `unity/ChakravartiAction/Builds/Android/ChakravartiAction-v0.5.0.apk`

## Controls

- WASD / arrows: move
- Space: jump
- Left mouse or `F`: sword attack
- `E`: open the gate
- `H`: use recovery
- On-screen controls provide the same actions on touch devices.

## Mobile-first presentation

- Landscape-left and landscape-right only; portrait rotation is disabled.
- HUD and controls are fitted to `Screen.safeArea` for notches and cutouts.
- The reference canvas is 1920×1080 and scales by both width and height.
- Movement stays under the left thumb; jump, strike, open, heal, and sound stay
  under the right thumb.
- Android targets ARM64, API 26+, 60 FPS, and prevents sleep during play.
- Desktop keyboard and mouse controls adapt the same command model second.

## Unity MCP

The project installs
`https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.0.0`.
GitHub Copilot CLI is configured in `~/.copilot/mcp-config.json` with the
`unityMCP` stdio server. Restart Copilot CLI after opening this Unity project to
load the Unity scene, asset, console, play-mode, screenshot, and build tools.
