# Ultimate Revision

A local-first study app for the Salesforce interview prep infographics and PDFs.

## Study features

- Browse all images and PDFs by topic.
- Use Recall mode to answer a flashcard prompt before revealing the material.
- Use Sprint mode for high-impact interview topics.
- Use Plan mode for a guided 60-minute interview sequence with a per-block timer.
- Use Cheat mode to scan all titles and flashcard prompts by topic.
- Open `Show checklist` on any flashcard to compare your answer against the key points.
- Use `Full sheet` to keep the whole infographic visible without scrolling, then switch to `Fit width` or zoom when you want to read details.
- Press `Q` for another prompt, arrow keys for previous/next material, `R` for reviewed, `S` for starred, and `W` for need revision.

## Open the app

Open `index.html` in a browser, or run the local server from this folder:

```powershell
.\start-app.ps1
```

Then visit `http://localhost:4173`.

## Mobile app / PWA use

This app now includes PWA support for Android and iPhone.

For a phone install, host the complete `sfdc-study-app` folder on a web host such as GitHub Pages, Netlify, Vercel, or your own HTTPS website. Students can then:

1. Open the hosted link in Chrome on Android or Safari on iPhone.
2. Use the browser menu and choose `Add to Home Screen`.
3. Open `Ultimate Revision` from the phone home screen.

The app shell is cached for offline use. Study images and PDFs are cached in the background and as students open them, so offline readiness improves after the first online study session.

Before hosting a new content pack, run:

```powershell
.\scripts\refresh-manifest.ps1
```

This updates `data.js` for static mobile hosting.

## Add more material later

1. Add images or PDFs anywhere inside `content/SFDC Interview PREP`.
2. Put new topics in their own folder, for example `content/SFDC Interview PREP/OmniStudio`.
3. Refresh the browser. The local server rebuilds the catalog automatically when the app starts and whenever the browser requests `data.js`.

Manual fallback:

```powershell
.\scripts\refresh-manifest.ps1
```

Supported files: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.pdf`.
