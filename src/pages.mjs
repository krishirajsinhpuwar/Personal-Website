const personalFiles = {
  experience: {
    title: 'Experience', tone: 'lime', tabPosition: 0, noun: 'roles',
    summary: 'Platform engineering, software testing, and teaching.',
    description: 'My work in platform engineering, software testing, computer networking education, and startups.',
  },
  education: {
    title: 'Education', tone: 'blue', tabPosition: 0.2, noun: 'programs',
    summary: 'Information Engineering and Computer Science.',
    description: 'Where I studied information engineering and computer science.',
  },
  projects: {
    title: 'Projects', tone: 'orange', tabPosition: 0.4, noun: 'projects',
    summary: 'Machine learning pipelines, web tools, and interactive software.',
    description: 'Software I’ve built, from machine learning workflows to web tools, games, and a browser extension.',
  },
  skills: {
    title: 'Skills', tone: 'cyan', tabPosition: 0.6, noun: 'categories',
    summary: 'Languages, tools, and technical domains I work in.',
    description: 'The areas, languages, and tools I’ve worked with across coursework and projects.',
  },
  certificates: {
    title: 'Certificates', tone: 'red', tabPosition: 0.8, noun: 'links',
    summary: 'Course credentials, workshops, and programs.',
    description: 'Course credentials and programs in AI, cloud computing, security, and data science.',
  },
  hackathons: {
    title: 'Hackathons', tone: 'yellow', tabPosition: 1, noun: 'events',
    summary: 'What my teams built under a deadline.',
    description: 'Projects and stories from hackathons in Heilbronn and St. Gallen.',
  },
};

const otherSections = {
  cv: { title: 'Curriculum Vitae', tone: 'lime', tabPosition: 0, description: 'My résumé in PDF format, with my experience, education, skills, and activities.' },
  contact: { title: 'Contact', description: 'Get in touch by email or find me on LinkedIn, GitHub, and Instagram.' },
};

export const sections = { ...personalFiles, ...otherSections };

export function isSectionPath(pathname) {
  const slug = /^\/([^/]+)\/?$/.exec(pathname)?.[1];
  return slug === 'profile' || Object.hasOwn(sections, slug);
}

const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function html(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
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

function pageDetails(profile, { slug, title, description }) {
  const path = slug ? `/${slug}/` : '/';
  return {
    path,
    pageTitle: slug ? `${title} | ${profile.name}` : profile.name,
    canonical: new URL(path, profile.siteUrl).href,
    description,
  };
}

export function renderSite(data) {
  const { profile, contact } = data;
  const home = homeView(data);
  const { pageTitle, canonical, description } = pageDetails(profile, home);
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: canonical,
    description,
    sameAs: contact.filter((entry) => entry.url.startsWith('https:')).map((entry) => entry.url),
  };
  const views = [home, ...Object.keys(sections).map((slug) => fileView(data, slug))];
  const panels = views.map((view) => {
    const details = pageDetails(profile, view);
    return `<div data-view="${details.path}" data-title="${html(details.pageTitle)}" data-canonical="${linkUrl(details.canonical)}" data-description="${html(details.description)}"${view.slug ? ' hidden' : ''}>${view.body}</div>`;
  }).join('\n    ');

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
  <meta property="og:url" content="${linkUrl(canonical)}">
  <meta property="og:title" content="${html(pageTitle)}">
  <meta property="og:description" content="${html(description)}">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <link rel="stylesheet" href="${data.assets['site.css']}">
  <script src="${data.assets['router.js']}" defer></script>
  <script type="application/ld+json">${JSON.stringify(person).replaceAll('<', '\\u003c')}</script>
</head>
<body>
  <main data-route="/">
    ${panels}
  </main>
</body>
</html>
`;
}

function homeView(data) {
  const { profile } = data;
  const name = html(profile.name);
  const surnameStart = name.lastIndexOf(' ');
  const displayName = surnameStart === -1 ? `<span>${name}</span>` : `<span>${name.slice(0, surnameStart)}</span> <span>${name.slice(surnameStart + 1)}</span>`;

  return {
    slug: '', description: profile.intro,
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
            <a class="button" id="contact" href="/contact/" data-legacy-bookmark>Get in touch</a>
          </div>
        </div>
      </section>
      <nav aria-label="Personal details">
        <ul class="folder-stack" role="list">
          ${Object.entries(personalFiles).map(([slug, section]) => `<li class="folder-layer" style="--tab-position:${section.tabPosition}">
            <a class="folder tone-${section.tone}" id="${slug}" href="/${slug}/" aria-labelledby="${slug}-title" aria-describedby="${slug}-summary ${slug}-count" data-legacy-bookmark>
              ${fileTab(slug, section.title)}
              <span class="folder-cover">
                <span class="folder-summary" id="${slug}-summary">${section.summary}</span>
                <span class="type-label folder-count" id="${slug}-count">${data[slug].length} ${section.noun}</span>
              </span>
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
        <a href="${linkUrl(entry.url)}">${html(entry.organization)}</a>
      </div>
    </li>`).join('\n    ')}
  </ol>`;
}

function cards(entries, metadata, action) {
  return `<ul class="card-grid" role="list">
    ${entries.map((entry) => `<li class="detail-card">
      <p class="type-label">${metadata(entry)}</p>
      <h2>${html(entry.title)}</h2>
      <p>${html(entry.description)}</p>
      <a class="text-link" href="${linkUrl(entry.url)}">${html(action(entry))}<span class="sr-only"> for ${html(entry.title)}</span></a>
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
  return `<div class="cv-pages">
    ${preview.pages.map((page, index) => `<div class="cv-page" role="group" aria-label="CV page ${index + 1} of ${preview.pages.length}">
      <img src="${linkUrl(page.image)}?v=${preview.sha256.slice(0, 12)}" width="${Math.round(page.width)}" height="${Math.round(page.height)}" alt="" loading="lazy">
      <p class="sr-only">${html(page.text)}</p>
    </div>`).join('\n    ')}
  </div>`;
}

function contactPage({ profile, contact }) {
  const names = profile.name.split(' ');
  const surname = names.pop();
  return {
    slug: 'contact', ...otherSections.contact,
    body: `<div class="wrap contact-wrap">
      <div class="sheet-tools"><a class="file-close" href="/"><span class="file-close-label">Close card</span><span class="file-close-mark" aria-hidden="true">×</span></a></div>
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

function fileView(data, slug) {
  if (slug === 'contact') return contactPage(data);
  const section = sections[slug];
  const { title, tone, tabPosition, description } = section;
  const renderers = {
    projects: (entries) => cards(entries, (entry) => html(entry.category), (entry) => entry.linkLabel),
    hackathons: (entries) => cards(entries, (entry) => dateLabel(entry.date), () => 'Read the LinkedIn post'),
    experience: timeline, education: timeline, skills, certificates,
    cv: () => cvPage(data.cvPreview),
  };

  return {
    slug, title, description,
    body: `
    <div class="wrap section-wrap">
      <div class="sheet-tools">
        ${slug === 'cv' ? `<a class="file-download" href="${linkUrl(data.profile.cv)}" download>Download CV</a>` : ''}
        <a class="file-close" href="/"><span class="file-close-label">Close file</span><span class="file-close-mark" aria-hidden="true">×</span></a>
      </div>
      <article class="sheet tone-${tone}" style="--tab-position:${tabPosition}">
        ${fileTab(slug, title, true)}
        <div class="sheet-body">
          <div class="sheet-content${slug === 'cv' ? ' cv-content' : ''}" role="region" aria-label="${html(title)} content" tabindex="0">
            ${renderers[slug](slug === 'cv' ? data.profile : data[slug])}
          </div>
        </div>
      </article>
    </div>`,
  };
}

function fileTab(slug, title, open = false) {
  const tag = open ? 'h1' : 'span';
  return `<${tag} class="file-tab ${open ? 'sheet-tab' : 'folder-tab'}" data-file="${slug}"${open ? ' tabindex="-1"' : ''}><span class="file-title"${open ? '' : ` id="${slug}-title"`}>${html(title)}</span></${tag}>`;
}

