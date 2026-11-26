const personalFiles = {
  experience: {
    title: 'Experience', tone: 'lime', tabPosition: 0,
    description: 'Krishirajsinh Puwar’s experience in platform engineering at Schwarz IT, software testing at Arkadia, and computer networking and IT security tutoring at TUM.',
  },
  education: {
    title: 'Education', tone: 'blue', tabPosition: 0.2,
    description: 'Krishirajsinh Puwar’s education in Information Engineering at the Technical University of Munich and computer science at 42 Heilbronn and Ahmedabad University.',
  },
  projects: {
    title: 'Projects', tone: 'orange', tabPosition: 0.4,
    description: 'Explore software and applied AI projects by Krishirajsinh Puwar, including machine learning and MLOps workflows, WebBoost, MediaSleuth360, and Fylio.',
  },
  skills: {
    title: 'Skills', tone: 'cyan', tabPosition: 0.6,
    description: 'Programming languages, software engineering tools, machine learning skills, and systems knowledge from Krishirajsinh Puwar’s coursework and projects.',
  },
  certificates: {
    title: 'Certificates', tone: 'red', tabPosition: 0.8,
    description: 'Browse Krishirajsinh Puwar’s course credentials and certificates in AI, cloud computing, security, and data science.',
  },
  hackathons: {
    title: 'Hackathons', tone: 'yellow', tabPosition: 1,
    description: 'See Krishirajsinh Puwar’s hackathon projects from JIVS, TECHOn, START Hack, and other events in Heilbronn and St. Gallen.',
  },
};

export const sections = {
  ...personalFiles,
  cv: { title: 'Curriculum Vitae', tone: 'lavender', tabPosition: 0, description: 'Read or download Krishirajsinh Puwar’s CV, covering his Information Engineering education, work experience, technical skills, and activities.' },
  contact: { title: 'Contact', description: 'Contact Krishirajsinh Puwar by email or find his profiles on LinkedIn, GitHub, and Instagram.' },
};

export const socialCardPath = '/assets/social-card.png';

const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const htmlEntities = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

function html(value) {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

function linkUrl(value) {
  if (!value.startsWith('/') && !/^https:\/\/|^mailto:/.test(value)) {
    throw new Error(`Expected an HTTPS, email, or site-relative link: ${value}`);
  }
  if (/^\/[/\\]|[\s\\]/.test(value)) {
    throw new Error(`Invalid link: ${value}`);
  }
  return html(value);
}

function dateLabel(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error(`Expected a date in YYYY-MM format: ${value}`);
  return `<time datetime="${value}">${monthYear.format(new Date(`${value}-01T00:00:00Z`))}</time>`;
}

function pageDetails(profile, { slug, title, description, body }) {
  const path = slug ? `/${slug}/` : '/';
  return {
    slug,
    path,
    pageTitle: slug ? `${title} | ${profile.name}` : `${profile.name} | ${profile.headline.replace(/\.$/, '')}`,
    canonical: new URL(path, profile.siteUrl).href,
    description,
    body,
  };
}

function personIdentity(profile, url) {
  return { '@type': 'Person', '@id': `${url}#person`, name: profile.name, url };
}

function profileSchema({ profile, contact }, url) {
  const siteId = `${url}#website`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': siteId, url, name: profile.name },
      {
        '@type': 'ProfilePage',
        '@id': `${url}#profile-page`,
        url,
        isPartOf: { '@id': siteId },
        mainEntity: {
          ...personIdentity(profile, url),
          description: profile.intro,
          sameAs: contact.filter((entry) => entry.url.startsWith('https:')).map((entry) => entry.url),
        },
      },
    ],
  };
}

function collectionSchema(data, { slug, canonical, pageTitle, description }, homeUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    url: canonical,
    name: pageTitle,
    description,
    isPartOf: { '@id': `${homeUrl}#website` },
    about: personIdentity(data.profile, homeUrl),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: data[slug].map((entry, index) => {
        const url = new URL(`#${entry.id}`, canonical).href;
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'CreativeWork',
            '@id': url,
            url,
            name: entry.title,
            description: entry.description,
            citation: cardLinks(entry).map((link) => ({
              '@type': 'CreativeWork',
              url: new URL(link.url, homeUrl).href,
            })),
          },
        };
      }),
    },
  };
}

function viewSchema(data, view, homeUrl) {
  if (!view.slug) return profileSchema(data, homeUrl);
  if (view.slug === 'projects' || view.slug === 'hackathons') {
    return collectionSchema(data, view, homeUrl);
  }
}

function renderPanel({ path, pageTitle, canonical, description, body }, hidden = false) {
  return `<div data-view="${path}" data-title="${html(pageTitle)}" data-canonical="${linkUrl(canonical)}" data-description="${html(description)}"${hidden ? ' hidden' : ''}>${body}</div>`;
}

export function renderPages(data) {
  const views = [
    homeView(data),
    ...Object.keys(sections).map((slug) => slug === 'contact' ? contactPage(data) : fileView(data, slug)),
  ].map((view) => pageDetails(data.profile, view));
  for (const view of views) {
    const schema = viewSchema(data, view, views[0].canonical);
    if (schema) view.schema = JSON.stringify(schema).replaceAll('<', '\\u003c');
  }

  return views.map((view) => ({
    path: view.path,
    canonical: view.canonical,
    markup: renderDocument(data, views, view),
  }));
}

export function renderSitemap(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ canonical }) => `  <url><loc>${html(canonical)}</loc></url>`).join('\n')}
</urlset>
`;
}

function renderDocument({ profile, assets }, views, active) {
  const { path, pageTitle, canonical, description, schema } = active;
  const socialCard = linkUrl(new URL(socialCardPath, profile.siteUrl).href);
  const socialCardAlt = html(`${profile.name} — ${profile.headline}`);
  const inactiveViews = views.filter((view) => view !== active);
  const inactivePanels = inactiveViews.map((view) => renderPanel(view, true)).join('\n      ');
  const inactiveSchemas = Object.fromEntries(inactiveViews.filter((view) => view.schema).map((view) => [view.path, view.schema]));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="${html(description)}">
  <title>${html(pageTitle)}</title>
  <link rel="canonical" href="${linkUrl(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${html(profile.name)}">
  <meta property="og:url" content="${linkUrl(canonical)}">
  <meta property="og:title" content="${html(pageTitle)}">
  <meta property="og:description" content="${html(description)}">
  <meta property="og:image" content="${socialCard}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${socialCardAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <link rel="stylesheet" href="${assets['site.css']}">
  <script src="${assets['router.js']}" defer></script>${schema ? `\n  <script type="application/ld+json" data-page-schema>${schema}</script>` : ''}
</head>
<body>
  <main data-route="${path}">
    ${renderPanel(active)}
    <template data-views>
      ${inactivePanels}
    </template>
    <script type="application/json" data-view-schemas>${JSON.stringify(inactiveSchemas)}</script>
  </main>
</body>
</html>
`;
}

function homeView({ profile }) {
  const name = html(profile.name);
  const surnameStart = name.lastIndexOf(' ');
  const displayName = surnameStart === -1 ? `<span>${name}</span>` : `<span>${name.slice(0, surnameStart)}</span> <span>${name.slice(surnameStart + 1)}</span>`;

  return {
    slug: '', description: profile.description ?? profile.intro,
    body: `
    <div class="wrap home">
      <section class="intro" aria-labelledby="name">
        <div class="intro-main">
          <h1 id="name" tabindex="-1">${displayName}</h1>
          <p class="tagline">${html(profile.headline)}</p>
        </div>
        <div class="intro-copy" id="profile" data-legacy-bookmark>
          <p>${html(profile.intro)}</p>
          <div class="actions intro-actions">
            <a class="button button-primary" id="cv" href="/cv/" data-legacy-bookmark>View CV</a>
            <a class="button button-primary" id="contact" href="/contact/" data-legacy-bookmark>Get in touch</a>
          </div>
        </div>
      </section>
      <nav aria-label="Personal details">
        <ul class="folder-stack" role="list">
          ${Object.entries(personalFiles).map(([slug, section]) => `<li class="folder-layer tone-${section.tone}" style="--tab-position:${section.tabPosition}">
            <a class="folder" id="${slug}" href="/${slug}/" aria-labelledby="${slug}-title" data-legacy-bookmark>
              ${folderTab(slug, section.title)}
              <span class="folder-cover"></span>
            </a>
          </li>`).join('\n          ')}
        </ul>
      </nav>
    </div>`,
  };
}

function timeline(entries) {
  return `<ol class="timeline" role="list">
    ${entries.map((entry) => `<li class="timeline-entry">
      <p class="type-label timeline-date">${dateLabel(entry.start)} <span aria-hidden="true">–</span><span class="sr-only"> to </span> ${entry.end === null ? 'Present' : dateLabel(entry.end)}</p>
      <div>
        <h2>${html(entry.title)}</h2>
        <a href="${linkUrl(entry.url)}">${html(entry.organization)}</a>${entry.description ? `
        <p class="timeline-description">${html(entry.description)}</p>` : ''}${entry.highlights?.length ? `
        <ul class="timeline-highlights">
          ${entry.highlights.map((highlight) => `<li>${html(highlight)}</li>`).join('\n          ')}
        </ul>` : ''}
      </div>
    </li>`).join('\n    ')}
  </ol>`;
}

function cardLinks(entry) {
  return [{ url: entry.url, label: entry.linkLabel }, ...(entry.sources ?? [])];
}

function cards(entries, metadata) {
  return `<ul class="card-grid" role="list">
    ${entries.map((entry) => `<li class="detail-card" id="${html(entry.id)}">
      <p class="type-label">${metadata(entry)}</p>
      <h2>${html(entry.title)}</h2>
      <p>${html(entry.description)}</p>${entry.technologies?.length || entry.concepts?.length ? `
      <dl class="card-details">${entry.technologies?.length ? `
        <dt>Tools &amp; libraries</dt>
        <dd>${html(entry.technologies.join(', '))}</dd>` : ''}${entry.concepts?.length ? `
        <dt>Concepts learned</dt>
        <dd>${html(entry.concepts.join(' · '))}</dd>` : ''}
      </dl>` : ''}
      <div class="card-links">
        ${cardLinks(entry).map(({ url, label }) => `<a href="${linkUrl(url)}">${html(label)}<span class="sr-only"> for ${html(entry.title)}</span></a>`).join('\n        ')}
      </div>
    </li>`).join('\n    ')}
  </ul>`;
}

function skills(groups) {
  return `<div class="skill-groups">
    ${groups.map((group) => `<section class="skill-group">
      <h2>${html(group.title)}</h2>
      <ul class="tag-list" role="list">${group.items.map((item) => `<li>${html(item)}</li>`).join('')}</ul>
    </section>`).join('\n    ')}
  </div>`;
}

function certificates(entries) {
  return `<ul class="document-list" role="list">
    ${entries.map((entry) => `<li>
      <a href="${linkUrl(entry.url)}"><span>${html(entry.title)}</span><span class="type-label document-type">${html(entry.source)}</span></a>
    </li>`).join('\n    ')}
  </ul>`;
}

function cvPage(preview) {
  const version = preview.sha256.slice(0, 12);
  return `<div class="cv-pages">
    ${preview.pages.map((page, index) => `<div class="cv-page" role="group" aria-label="CV page ${index + 1} of ${preview.pages.length}">
      <img src="${linkUrl(page.image)}?v=${version}" width="${Math.round(page.width)}" height="${Math.round(page.height)}" alt="" loading="lazy">
      <p class="sr-only">${html(page.text)}</p>
    </div>`).join('\n    ')}
  </div>`;
}

function contactPage({ profile, contact }) {
  const names = profile.name.split(' ');
  const surname = names.pop();
  return {
    slug: 'contact', ...sections.contact,
    body: `<div class="wrap contact-wrap">
      <div class="sheet-tools">${closeLink('Close card')}</div>
      <article class="business-card" aria-label="Business card">
        <div class="business-card-layout">
          <div class="business-card-identity">
            <h1 tabindex="-1"><span>${html(names.join(' '))}</span><span>${html(surname)}</span></h1>
            <p class="business-card-role">${html(profile.headline)}</p>
          </div>
          <address class="business-card-contacts">
            ${contact.map((entry) => `<a href="${linkUrl(entry.url)}"><span class="type-label">${html(entry.label)}</span><span class="contact-handle">${html(entry.display)}</span></a>`).join('\n            ')}
          </address>
        </div>
      </article>
    </div>`,
  };
}

const fileContents = {
  projects: (entries) => cards(entries, (entry) => html(entry.category)),
  hackathons: (entries) => cards(entries, (entry) => dateLabel(entry.date)),
  experience: timeline,
  education: timeline,
  skills,
  certificates,
  cv: cvPage,
};

function fileView(data, slug) {
  const { title, tone, tabPosition, description } = sections[slug];
  const isCV = slug === 'cv';
  const content = fileContents[slug](isCV ? data.cvPreview : data[slug]);

  return {
    slug, title, description,
    body: `
    <div class="wrap section-wrap">
      <div class="sheet-tools">
        ${isCV ? `<a class="file-download" href="${linkUrl(data.profile.cv)}" download>Download CV</a>` : ''}
        ${closeLink('Close file')}
      </div>
      <article class="sheet tone-${tone}${isCV ? ' cv-sheet' : ''}" style="--tab-position:${tabPosition}">
        ${sheetTab(title)}
        <div class="sheet-body">
          <div class="sheet-content${isCV ? ' cv-content' : ''}" role="region" aria-label="${html(title)} content" tabindex="0">
            ${content}
          </div>
        </div>
      </article>
    </div>`,
  };
}

function folderTab(slug, title) {
  return `<span class="file-tab folder-tab" data-file="${slug}"><span class="file-title" id="${slug}-title">${html(title)}</span></span>`;
}

function sheetTab(title) {
  const label = html(title);
  return `<h1 tabindex="-1" aria-label="${label}"><a class="file-tab sheet-tab" href="/" aria-label="${label}, close file"><span class="file-title">${label}</span></a></h1>`;
}

function closeLink(label) {
  return `<a class="file-close" href="/"><span class="file-close-label">${label}</span><span class="file-close-mark" aria-hidden="true">×</span></a>`;
}
