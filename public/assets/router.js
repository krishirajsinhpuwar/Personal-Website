(() => {
  const page = document.querySelector('main[data-route]');
  const availableViews = page.querySelector('template[data-views]').content.children;
  const views = new Map([page.firstElementChild, ...availableViews].map((view) => [view.dataset.view, view]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 47rem)');
  const scrollPositions = new Map();
  const canonical = document.querySelector('link[rel="canonical"]');
  const description = document.querySelector('meta[name="description"]');
  const socialTitle = document.querySelector('meta[property="og:title"]');
  const socialDescription = document.querySelector('meta[property="og:description"]');
  const socialUrl = document.querySelector('meta[property="og:url"]');
  const pageSchema = document.querySelector('script[data-page-schema]') ?? document.createElement('script');
  const viewSchemas = JSON.parse(page.querySelector('script[data-view-schemas]').textContent);
  viewSchemas[page.dataset.route] = pageSchema.textContent;
  pageSchema.type = 'application/ld+json';
  pageSchema.setAttribute('data-page-schema', '');
  let cancelTransition;

  history.scrollRestoration = 'manual';

  function routeFrom(path) {
    return path.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  }

  function visualClone(element) {
    const clone = element.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    return clone;
  }

  function place(element, bounds) {
    Object.assign(element.style, {
      left: `${bounds.left}px`, top: `${bounds.top}px`,
      width: `${bounds.width}px`, height: `${bounds.height}px`,
    });
  }

  function captureSheet(view) {
    const sheet = view.querySelector('.sheet');
    const body = sheet.querySelector('.sheet-body');
    const tab = sheet.querySelector('.file-tab');
    const tools = view.querySelector('.sheet-tools');
    return {
      body: visualClone(body), bodyBounds: body.getBoundingClientRect(),
      tab: visualClone(tab), tabBounds: tab.getBoundingClientRect(),
      tools: visualClone(tools), toolsBounds: tools.getBoundingClientRect(),
      scrollTop: body.querySelector('.sheet-content').scrollTop,
    };
  }

  function createNavigationStage() {
    const stage = document.createElement('div');
    stage.className = 'navigation-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.inert = true;
    document.body.append(stage);
    return stage;
  }

  function freezeLayout(layout, stage) {
    const clone = visualClone(layout);
    clone.classList.add('navigation-layout');
    place(clone, layout.getBoundingClientRect());
    stage.append(clone);
    return clone;
  }

  function playNavigation(animations, stage, focus) {
    function cancel(focusAfter = false) {
      if (cancelTransition !== cancel) return;
      cancelTransition = undefined;
      animations.forEach((animation) => animation.cancel());
      stage?.remove();
      page.inert = false;
      document.body.classList.remove('is-navigating');
      if (focusAfter) focus();
    }

    cancelTransition = cancel;
    page.inert = true;
    document.body.classList.add('is-navigating');
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => cancel(true));
  }

  function animateFile(previousView, view, file, closing, commit, stage) {
    // Freeze the stack before changing scroll position. Only transforms animate;
    // the paper keeps its final layout and the tab never stretches its text.
    let expanded = closing ? captureSheet(previousView) : null;
    let home = closing ? null : freezeLayout(previousView.firstElementChild, stage);
    commit();
    if (closing) home = freezeLayout(view.firstElementChild, stage);
    else expanded = captureSheet(view);

    const selected = home.querySelector(`[data-file="${file}"]`).closest('.folder-layer');
    const folder = selected.querySelector('.folder');
    const closedBody = folder.querySelector('.folder-cover').getBoundingClientRect();
    const closedTab = folder.querySelector('.file-tab').getBoundingClientRect();
    folder.querySelectorAll('.folder-cover, .folder-tab').forEach((element) => {
      element.style.visibility = 'hidden';
    });

    expanded.body.classList.add('file-motion-body');
    expanded.tab.classList.add('file-motion-tab');
    expanded.tools.classList.add('file-motion-tools');
    place(expanded.body, expanded.bodyBounds);
    place(expanded.tab, expanded.tabBounds);
    place(expanded.tools, expanded.toolsBounds);
    // Keep the moving file in its stack position, above the folders behind it.
    selected.append(expanded.body, expanded.tab);
    stage.append(expanded.tools);
    const paper = expanded.body.querySelector('.sheet-content');
    paper.scrollTop = expanded.scrollTop;

    const bodyTransform = `translate(${closedBody.left - expanded.bodyBounds.left}px, ${closedBody.top - expanded.bodyBounds.top}px) scale(${closedBody.width / expanded.bodyBounds.width}, ${closedBody.height / expanded.bodyBounds.height})`;
    const tabTransform = `translate(${closedTab.left - expanded.tabBounds.left}px, ${closedTab.top - expanded.tabBounds.top}px)`;
    const duration = closing ? 640 : 720;
    const easing = 'cubic-bezier(0.22, 0.8, 0.24, 1)';
    const animations = [];
    const animate = (element, frames, options = {}) => {
      animations.push(element.animate(frames, { duration, easing, fill: 'both', ...options }));
    };

    animate(expanded.body, closing ? [{ transform: 'none' }, { transform: bodyTransform }] : [{ transform: bodyTransform }, { transform: 'none' }]);
    animate(expanded.tab, closing ? [{ transform: 'none' }, { transform: tabTransform }] : [{ transform: tabTransform }, { transform: 'none' }]);
    animate(paper, closing ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: closing ? 230 : 360, delay: closing ? 0 : 220 });
    animate(expanded.tools, closing ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: closing ? 0 : 420 });
    const layers = Array.from(home.querySelectorAll('.folder-layer'));
    const selectedIndex = layers.indexOf(selected);
    layers.forEach((layer, index) => {
      if (layer === selected) return;
      const drop = window.innerHeight - Math.min(layer.getBoundingClientRect().top, window.innerHeight) + 120;
      const up = { transform: 'translateY(0)', opacity: 1 };
      const down = { transform: `translateY(${drop}px)`, opacity: 0 };
      const stagger = (layers.length - 1 - index) * 18;
      const inFront = index > selectedIndex;
      animate(layer, closing ? [down, up] : [up, down], {
        duration: closing && inFront ? 320 : 420,
        delay: closing ? (inFront ? 250 : 120) + stagger : index * 18,
      });
    });
    animate(home.querySelector('.intro'), closing ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: closing ? 180 : 0 });
    return animations;
  }

  function animateButtonView(previousView, view, button, closing, commit, stage) {
    const scrollArea = '.sheet-content, .business-card-layout';
    const outgoing = freezeLayout(previousView.firstElementChild, stage);
    const outgoingScroll = closing ? previousView.querySelector(scrollArea).scrollTop : 0;
    const openingBounds = closing ? null : button.getBoundingClientRect();
    commit();
    const incoming = freezeLayout(view.firstElementChild, stage);
    const detail = closing ? outgoing : incoming;
    const home = closing ? incoming : outgoing;
    stage.append(detail);
    detail.querySelector(scrollArea).scrollTop = closing ? outgoingScroll : view.querySelector(scrollArea).scrollTop;

    const panel = detail.querySelector('article');
    const controls = detail.querySelector('.sheet-tools');
    const origin = openingBounds ?? button.getBoundingClientRect();
    const zoomFromButton = !mobileLayout.matches && origin.bottom > 0 && origin.top < window.innerHeight;
    let collapsed = 'translateY(1.25rem) scale(0.97)';

    if (zoomFromButton) {
      const bounds = panel.getBoundingClientRect();
      const scale = Math.min(origin.width / bounds.width, origin.height / bounds.height);
      const x = origin.left + origin.width / 2 - (bounds.left + bounds.width / 2);
      const y = origin.top + origin.height / 2 - (bounds.top + bounds.height / 2);
      collapsed = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    const duration = zoomFromButton ? 440 : 280;
    const easing = closing ? 'cubic-bezier(0.55, 0.05, 0.8, 0.45)' : 'cubic-bezier(0.2, 0.72, 0.25, 1)';
    const animate = (element, frames, options = {}) =>
      element.animate(closing ? frames.reverse() : frames, { duration, easing, fill: 'both', ...options });

    return [
      animate(home, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' }),
      animate(panel, [
        { transform: collapsed, opacity: 0 },
        { opacity: 1, offset: 0.45 },
        { transform: 'none', opacity: 1 },
      ]),
      animate(controls, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: closing ? 0 : duration - 180 }),
    ];
  }

  function show(path, { initial = false, restore = false } = {}) {
    const view = views.get(path);
    if (!view) return;

    const previous = page.dataset.route;
    if (path === previous) {
      if (path === '/' && location.hash === '#profile') document.getElementById('profile').scrollIntoView();
      if (path !== '/' && initial) view.querySelector('h1').focus({ preventScroll: true });
      return;
    }
    cancelTransition?.();
    const previousView = views.get(previous);
    if (!initial) scrollPositions.set(previous, window.scrollY);

    const goingHome = path === '/';
    const hasHomePosition = scrollPositions.has('/');
    const file = (goingHome ? previous : path).slice(1, -1);
    const homeLink = views.get('/').querySelector(`a[id="${file}"]`);
    const movingBetweenHomeAndSection = homeLink && (previous === '/' || goingHome);
    const motion = !initial && !reduceMotion.matches && typeof view.animate === 'function';
    let committed = false;

    function commit() {
      if (committed) return;
      committed = true;
      previousView.hidden = true;
      if (!view.isConnected) page.append(view);
      view.hidden = false;
      page.dataset.route = path;
      document.title = view.dataset.title;
      canonical.href = socialUrl.content = view.dataset.canonical;
      description.content = socialDescription.content = view.dataset.description;
      socialTitle.content = view.dataset.title;
      if (viewSchemas[path]) {
        pageSchema.textContent = viewSchemas[path];
        if (!pageSchema.isConnected) document.head.append(pageSchema);
      } else {
        pageSchema.remove();
      }
      const hashTarget = goingHome && location.hash === '#profile' ? document.getElementById('profile') : null;
      if (hashTarget) hashTarget.scrollIntoView();
      else window.scrollTo(0, goingHome || restore ? scrollPositions.get(path) ?? 0 : 0);
    }

    function focus() {
      const returningLink = goingHome && hasHomePosition ? homeLink : null;
      (returningLink ?? view.querySelector('h1')).focus({ preventScroll: true });
    }

    if (motion && movingBetweenHomeAndSection) {
      let stage;
      try {
        stage = createNavigationStage();
        const animations = homeLink.classList.contains('folder')
          ? animateFile(previousView, view, file, goingHome, commit, stage)
          : animateButtonView(previousView, view, homeLink, goingHome, commit, stage);
        playNavigation(animations, stage, focus);
        return;
      } catch (error) {
        stage?.remove();
        console.warn('Navigation animation unavailable; using the default transition.', error);
      }
    }

    commit();
    if (motion) {
      const animation = view.firstElementChild.animate([
        { opacity: 0, transform: 'translateY(1.25rem)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 320, easing: 'cubic-bezier(0.2, 0.72, 0.25, 1)' });
      playNavigation([animation], null, focus);
    } else focus();
  }

  function locationRoute() {
    const path = routeFrom(location.pathname);
    if (path === '/profile/') {
      history.replaceState(history.state, '', `/${location.search}#profile`);
      return '/';
    }
    if (path !== '/' || !location.hash) return path;

    let slug;
    try {
      slug = decodeURIComponent(location.hash.slice(1)).trim().toLowerCase();
    } catch {
      return path;
    }
    const target = document.getElementById(slug);
    if (!target?.hasAttribute('data-legacy-bookmark')) return path;

    const destination = target.getAttribute('href') ?? `#${slug}`;
    if (destination !== location.hash) history.replaceState(history.state, '', destination);
    return destination.startsWith('#') ? path : destination;
  }

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

    const url = new URL(link.href);
    const path = routeFrom(url.pathname);
    if (url.origin !== location.origin || url.hash || !views.has(path)) return;

    event.preventDefault();
    if (routeFrom(location.pathname) !== path || location.hash) history.pushState(null, '', link.href);
    show(path);
  });

  const restoreLocation = () => show(locationRoute(), { restore: true });
  window.addEventListener('popstate', restoreLocation);
  window.addEventListener('resize', () => cancelTransition?.(true));
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) cancelTransition?.(true);
  });
  window.addEventListener('hashchange', () => {
    const path = locationRoute();
    if (path !== page.dataset.route) show(path, { restore: true });
  });
  show(locationRoute(), { initial: true });
})();
