# Enchanted Dream Museum V5 — Shareable Gallery

A mobile-friendly 3D fantasy museum. Three.js loads from jsDelivr, so an internet connection is required.

## Make your girlfriend see the same photos from the link

Your uploaded photos are currently stored in your browser. To publish them for everyone who opens your website:

1. Open the museum website on the same browser/device where you uploaded the photos.
2. Open **Customize** and tap **Save changes**.
3. Tap **Export share gallery**. Your browser downloads `museum-data.json`, which contains the museum name, captions, frame styles, and the six compressed photos.
4. Open the GitHub repository used to publish the museum.
5. Upload `museum-data.json` into the **same root folder** as `index.html`, `app.js`, and `style.css` (not inside another folder), then commit the change.
6. Wait for GitHub Pages to finish publishing, then open the website link in a private/incognito tab or another device. The shared gallery should load automatically.

When `museum-data.json` exists, it takes priority over each visitor's local gallery. This makes the same photos visible to anyone who opens the link. If you change the photos later, export the file again and replace the existing `museum-data.json`.

## Privacy

Anyone who can access the published site can view the photos embedded in `museum-data.json`. Only publish pictures you and the people shown are comfortable sharing. Do not include sensitive/private photos.

## Controls

- Phone: drag to look around; use the left joystick to move and right joystick to turn.
- Desktop: W/A/S/D or arrow keys to move; drag to look around.
- Tap a picture frame to read its caption.
- Use Customize to change the gallery.
- The QR code shares the website URL; it does not itself upload pictures.

## Hosting

Extract the ZIP and host its contents using GitHub Pages or another static HTTPS host. Keep `index.html`, `style.css`, and `app.js` together in the published root.
