---
applyTo: "unity/**/*.cs"
---

# Chakravarti Unity conventions

- Target Unity 6 and keep editor automation batch-mode compatible.
- Mobile landscape is primary; desktop input adapts the same commands second.
- Fit all HUD and touch controls inside `Screen.safeArea`.
- Keep movement under the left thumb and action controls under the right thumb.
- Avoid per-frame allocations, repeated `GetComponent`, and expensive mobile
  shadows or post-processing without a device-tier guard.
- Use deterministic mission state and return results through serializable data
  contracts rather than embedding campaign logic in animation or scene objects.
- Every player action needs animation, sound, and visible feedback.
- Keep CC0/source provenance beside imported character and environment assets.
- Build Windows and Android only through `BuildAutomation`.
