# Krishirajsinh Puwar’s portfolio

The public site is static HTML, CSS, and browser JavaScript. A local Node.js build generates one `index.html` and copies `public/` into `dist/`, including `.htaccess` and the error pages. InfinityFree internally rewrites section URLs such as `/cv` and `/projects` to `index.html`. The router reads the browser path and shows the matching section. Opening and closing a file in the site updates browser history without another request.

## Edit content

- Update your name, homepage introduction, location, site URL, or CV link in `content/profile.json`.
- Add or edit entries in the JSON file for each topic in `content/`. Entries appear in file order. Use `YYYY-MM` for dates and `null` for an ongoing experience or education entry.
- Put public PDFs in `public/docs/` and reference them in JSON with a path such as `/docs/certificate.pdf`. Keep the filenames of existing downloads to preserve shared links.
- After replacing the CV PDF, run `node scripts/render-cv.mjs` once to refresh its inline preview. This step needs Poppler (`pdfinfo`, `pdftocairo`, and `pdftotext`). Commit the generated `public/assets/cv/` files with the PDF. Regular builds still need only Node.js; they verify that the preview matches the PDF. The preview uses vector pages and accessible text so it works in browsers without an embedded PDF viewer, and Download CV serves the original PDF.
- Edit the section templates in `src/pages.mjs` or the shared stylesheet in `public/assets/site.css` for design changes.

## Build and preview

Use Node.js 20 or later on your computer. The scripts use Node’s standard library.

```sh
node scripts/build.mjs
node scripts/preview.mjs
```

Open <http://127.0.0.1:8000/>. Pass a port to `preview.mjs` if needed. Rebuild and refresh the browser after editing. The build replaces `dist/` after checking local links and upload file sizes. The preview server mirrors the section rewrites and serves `err/404.html` with a 404 status for unknown URLs.

When replacing a previous release on InfinityFree, back up `htdocs` and remove the old generated section directories before uploading the contents of `dist/`. An existing section directory takes precedence over the rewrite. The uploaded `err/` directory supplies the custom error documents.
