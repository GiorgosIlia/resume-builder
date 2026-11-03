# Fieldcraft Resumes

A private, single-page resume builder. Pick a field, answer a few questions, download a PDF in the template recruiters in that field prefer. Everything runs in the visitor's browser; nothing is uploaded or tracked.

## Files (all three are needed, side by side)
- `index.html` – the page, with fonts built in
- `app.js` – the builder
- `pdf.js` – the PDF maker, loaded only when someone clicks Download

## Publish on GitHub Pages
1. Create a **public** repository, e.g. `resume`.
2. **Add file → Upload files**, drag in `index.html`, `app.js`, `pdf.js` (and this README), then **Commit changes**. They must sit at the top level of the repo, not inside a folder.
3. **Settings → Pages**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`, **Save**.
4. Tick **Enforce HTTPS**. The site appears at `https://<username>.github.io/<repo>/` within a few minutes.

## Credits
Fonts: SIL Open Font License 1.1 (Bricolage Grotesque, Instrument Sans, EB Garamond, IBM Plex Sans, IBM Plex Mono, Source Sans 3, Cormorant Garamond, Libre Franklin, DM Serif Display, Karla, Work Sans).
PDF export: html2pdf.js (MIT), bundling jsPDF (MIT) and html2canvas (MIT).
