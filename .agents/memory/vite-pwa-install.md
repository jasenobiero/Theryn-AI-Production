---
name: Browser PWA installation
description: Requirements that make the AI Hub eligible for the browser address-bar install control.
---

The browser address-bar install control depends on a valid manifest, a served service worker, HTTPS, and installable raster icons; an in-app install banner does not create the browser control.

**Why:** SVG-only manifest icons and disabled development service workers can leave the browser without an install prompt even when the app has PWA configuration.

**How to apply:** Keep 192x192 and 512x512 PNG icons in the public assets, enable the PWA dev service worker when preview installation is needed, and test the published HTTPS URL in a fresh browser tab.