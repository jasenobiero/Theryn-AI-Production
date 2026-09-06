---
name: Expo web auth layout
description: Layout constraints learned while presenting the native auth experience through Expo web previews.
---

Expo web previews can expose timing and flex-layout differences that make animated, fixed-height auth sections overlap or clip. Use a natural scrollable column, avoid browser-only top spacers, and keep visibility independent of delayed animation state.

**Why:** The same mobile auth composition rendered reliably on native-oriented layouts but clipped the hero and hid lower content in the web preview when it depended on flexible or animated positioning.

**How to apply:** For future mobile auth changes, verify the Expo web preview at a phone viewport after Metro finishes bundling; favor safe-area insets, intrinsic section heights, and explicit spacing.