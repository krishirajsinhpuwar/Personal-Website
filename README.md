# Krishirajsinh Puwar’s portfolio

This static portfolio is built locally with Node.js and hosted on InfinityFree. The build generates `dist/index.html` and the HTML files in `dist/err/`, then includes the static files from `public/`. On the host, `.htaccess` routes section URLs such as `/cv` and `/projects` to `index.html` and configures the error pages in `err/`. The browser router shows the matching section and updates the URL when a visitor opens or closes a file.

## Build and preview

Use Node.js 20 or later. The build and preview scripts use only the Node.js standard library.

```sh
node scripts/build.mjs
node scripts/preview.mjs
```

Open <http://127.0.0.1:8000/>. To use another port, run `node scripts/preview.mjs 8080`. Rebuild and refresh the browser after editing. The build checks local links and hosting file-size limits before replacing `dist/`. The preview server handles section URLs and serves `err/404.html` with a 404 status for unknown URLs.

## Edit content

- Edit `content/profile.json` for the homepage introduction, location, site URL, or CV link.
- Update the topic JSON files in `content/` to change individual sections. Entries appear in file order. Use `YYYY-MM` for dates and `null` for the end date of an ongoing experience or education entry.
- Put downloadable PDFs in `public/docs/` and reference them with paths such as `/docs/certificate.pdf`. Keep existing filenames to preserve shared links.
- After replacing the CV PDF, run `node scripts/render-cv.mjs` and commit the generated files in `public/assets/cv/` with the PDF. Rendering requires Poppler (`pdfinfo`, `pdftocairo`, and `pdftotext`). The regular build verifies that the preview matches the PDF. The inline preview uses vector pages and accessible text, and the download serves the original PDF.
- Edit `src/pages.mjs` for page templates, `src/error-pages.mjs` for the shared error-page template, or `public/assets/site.css` for site styling.

## Deploy to InfinityFree

Install Bash and `lftp` locally. Copy the values from the hosting account’s **FTP Details** into a `.env` file in the repository root. This file is ignored by Git. [InfinityFree FTP guide](https://forum.infinityfree.com/t/how-to-upload-files-with-ftp/49306)

```sh
FTP_HOST=ftpupload.net
FTP_PORT=21
FTP_USER=your_ftp_username
FTP_PASS='your_ftp_password'
```

Use shell assignment syntax in `.env`, with no spaces around `=`. Quote passwords that contain shell special characters.

```sh
./send-with-ftp.sh
```

The script builds the site and uploads the contents of `dist/` directly into the existing `/htdocs` over FTP with TLS. It includes `.htaccess`, replaces matching files, and preserves remote-only files. If a transfer fails, fix the reported error and run the script again to upload the full build.

If you are upgrading from a release that generated separate section directories such as `htdocs/cv/` or `htdocs/projects/`, back up `htdocs` and remove those old generated directories. Apache serves existing directories before applying the section rewrites. After deployment, check the homepage and open a section URL such as `/cv` directly.
