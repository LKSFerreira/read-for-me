---
name: og-generator
alias: gerador_og_share
description: Creates and generates high-fidelity Open Graph social sharing images (og-share.png) at 1200x630 pixels preserving text gradients, alpha channels, and 3D device mockups via HTML/CSS and html-to-image.
tags: [og-share, design, marketing, banner, export, html-to-image, screenshot, opengraph]
triggers: ["gerar og-share", "criar banner de compartilhamento", "gerador og-share", "exportar og-share", "gerar imagem de compartilhamento", "gerar og-share.png"]
---

# Purpose

Use this skill whenever creating or updating the social sharing Open Graph banner (`images/og-share.png`), or when branding, slogans, mockups, or color palettes change and require generating crisp, high-resolution sharing preview images.

## Language Boundary (Mandatory)

Instructions in this file are in English solely for internal agent control. All user interaction, explanations, status reports, and image copy in Portuguese domains MUST remain strictly in Brazilian Portuguese (`pt-BR`).

# Prerequisites

- Project logo in `images/` (preferably `.webp` or `.svg`).
- Screenshots or device mockups for the visual half of the banner.
- Local web server access (e.g. Live Server / static file server) to avoid browser `file://` CORS restrictions during font and image rendering.

# Execution Workflow

## 1. Instantiate Generation Template
- Copy `.agents/skills/og-generator/resources/og-template.html` (or project equivalent) to the workspace root as `og-template.html`.

## 2. Customize HTML/CSS Typography and Visual Assets
- **Branding & Slogan:** Customize `.logo-area` and `.brand-name` elements.
- **Gradient Text Styling:** For gradient text (e.g., messaging highlights), enforce cross-browser CSS properties:
  ```css
  background: linear-gradient(...);
  -webkit-background-clip: text;
  background-clip: text; /* Mandatory for lint and compatibility */
  -webkit-text-fill-color: transparent;
  ```
- **3D Device Mockup Positioning:** Adjust CSS transforms (`perspective(...) rotateY(...) rotateX(...)`) and coordinates (`bottom`, `left`, `right`) to ensure no visual collisions with critical text.

## 3. High-Fidelity Browser Export (Recommended)
1. Serve `og-template.html` on a local HTTP port (e.g. `http://localhost:5500/og-template.html`).
2. Trigger the interactive **Exportar Imagem (1200x630)** button.
3. The browser downloads `og-share.png` at 2x resolution (2400x1260 for crisp retina displays).
4. Move the exported image into `images/og-share.png`.

## 4. Autonomous Agent Capture via Browser Subagent
When running autonomously without interactive user download:
1. Open the local server URL (`http://localhost:5500/og-template.html`).
2. Set the browser viewport precisely to `1200x630`.
3. Wait 3 seconds to ensure complete Google Fonts loading and asset rendering.
4. Capture a viewport screenshot of the `#banner` element.
5. Save the resulting image as `images/og-share.png`.

# Rules and Constraints

- **Exact Dimensions:** The final banner must adhere to the standard `1.91:1` aspect ratio (1200x630 pixels) for optimal indexing across Facebook, LinkedIn, WhatsApp, Twitter/X, and Telegram.
- **Library Selection:** **NEVER use `html2canvas`** for complex CSS with gradients and 3D transforms (`html2canvas` lacks `background-clip: text` support and renders opaque black/blue boxes). Always use **`html-to-image`** via CDN.
- **Blob Handling:** In frontend JavaScript export scripts, always use `htmlToImage.toBlob()` combined with `URL.createObjectURL(blob)`. **NEVER use `canvas.toDataURL()`** for large high-res canvases, as Chrome corrupts or blocks massive base64 download URLs.
- **Font CORS:** Ensure `crossorigin="anonymous"` and preconnect links exist for remote Google Fonts stylesheets to avoid browser security exceptions during `cssRules` inspection.
