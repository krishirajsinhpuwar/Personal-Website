(() => {
  const page = document.querySelector('main[data-route]');
  const views = new Map(Array.from(page.children, (view) => [view.dataset.view, view]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollPositions = new Map();
  const canonical = document.querySelector('link[rel="canonical"]');
  const description = document.querySelector('meta[name="description"]');
  const socialTitle = document.querySelector('meta[property="og:title"]');
  const socialDescription = document.querySelector('meta[property="og:description"]');
  const socialUrl = document.querySelector('meta[property="og:url"]');
  let transition;
  let navigation = 0;

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
    const style = getComputedStyle(sheet);
    return {
      body: visualClone(body), bodyBounds: body.getBoundingClientRect(),
      tab: visualClone(tab), tabBounds: tab.getBoundingClientRect(),
      tools: visualClone(tools), toolsBounds: tools.getBoundingClientRect(),
      scrollTop: body.querySelector('.sheet-content').scrollTop,
      color: style.getPropertyValue('--folder'), ink: style.getPropertyValue('--folder-ink') || 'var(--ink)',
    };
  }

  function freezeHome(view, stage) {
    const home = view.querySelector('.home');
    const clone = visualClone(home);
    clone.classList.add('file-motion-home');
    place(clone, home.getBoundingClientRect());
    clone.style.margin = '0';
    stage.append(clone);
    return clone;
  }

  function playNavigation(animations, stage, focus) {
    let settled = false;
    const active = {
      cancel(focusAfter = false) {
        if (settled) return;
        settled = true;
        animations.forEach((animation) => animation.cancel());
        stage?.remove();
        if (transition !== active) return;
        transition = undefined;
        page.inert = false;
        document.body.classList.remove('is-navigating');
        if (focusAfter) focus();
      },
    };
    transition = active;
    page.inert = true;
    document.body.classList.add('is-navigating');
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => active.cancel(true));
  }

  function animateFile(previousView, view, file, closing, commit, focus) {
    const stage = document.createElement('div');
    stage.className = 'navigation-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.inert = true;
    document.body.append(stage);

    try {
      // Freeze the stack before changing scroll position. Only transforms animate;
      // the paper keeps its final layout and the tab never stretches its text.
      let expanded = closing ? captureSheet(previousView) : null;
      let home = closing ? null : freezeHome(previousView, stage);
      commit();
      if (closing) home = freezeHome(view, stage);
      else expanded = captureSheet(view);

      stage.style.setProperty('--folder', expanded.color);
      stage.style.setProperty('--folder-ink', expanded.ink);
      const selected = home.querySelector(`[data-file="${file}"]`).closest('.folder-layer');
      const folder = selected.querySelector('.folder');
      const cover = folder.querySelector('.folder-cover');
      const closedBody = cover.getBoundingClientRect();
      const closedTab = folder.querySelector('.file-tab').getBoundingClientRect();
      const coverStyle = getComputedStyle(cover);
      const caption = visualClone(cover);
      caption.classList.add('file-motion-caption');
      place(caption, closedBody);
      caption.style.color = getComputedStyle(folder).color;
      caption.style.justifyContent = coverStyle.justifyContent;
      caption.style.flexWrap = coverStyle.flexWrap;
      if (getComputedStyle(cover.querySelector('.folder-summary')).position === 'absolute') {
        caption.querySelector('.folder-summary').classList.add('sr-only');
      }
      folder.style.opacity = '0';

      expanded.body.classList.add('file-motion-body');
      expanded.tab.classList.add('file-motion-tab');
      expanded.tools.classList.add('file-motion-tools');
      place(expanded.body, expanded.bodyBounds);
      place(expanded.tab, expanded.tabBounds);
      place(expanded.tools, expanded.toolsBounds);
      stage.append(expanded.body, caption, expanded.tab, expanded.tools);
      const paper = expanded.body.querySelector('.sheet-content');
      paper.scrollTop = expanded.scrollTop;

      const bodyTransform = `translate(${closedBody.left - expanded.bodyBounds.left}px, ${closedBody.top - expanded.bodyBounds.top}px) scale(${closedBody.width / expanded.bodyBounds.width}, ${closedBody.height / expanded.bodyBounds.height})`;
      const tabTransform = `translate(${closedTab.left - expanded.tabBounds.left}px, ${closedTab.top - expanded.tabBounds.top}px)`;
      const captionTransform = `translate(${expanded.bodyBounds.left - closedBody.left}px, ${expanded.bodyBounds.top - closedBody.top}px)`;
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
      animate(caption, closing ? [
        { transform: captionTransform, opacity: 0 },
        { transform: 'translate(0, 0)', opacity: 1 },
      ] : [
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: captionTransform, opacity: 0, offset: 0.3 },
        { transform: captionTransform, opacity: 0 },
      ], closing ? { duration: 200, delay: 420 } : {});

      home.querySelectorAll('.folder-layer').forEach((layer, index) => {
        if (layer === selected) return;
        const drop = window.innerHeight - Math.min(layer.getBoundingClientRect().top, window.innerHeight) + 120;
        const up = { transform: 'translateY(0)', opacity: 1 };
        const down = { transform: `translateY(${drop}px)`, opacity: 0 };
        animate(layer, closing ? [down, up] : [up, down], { duration: 420, delay: closing ? 120 + (5 - index) * 18 : index * 18 });
      });
      animate(home.querySelector('.intro'), closing ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: closing ? 180 : 0 });
      playNavigation(animations, stage, focus);
    } catch (error) {
      stage.remove();
      throw error;
    }
  }

  function show(path, { initial = false, restore = false } = {}) {
    const view = views.get(path);
    if (!view) return;

    const previous = page.dataset.route;
    if (path === previous) {
      if (path === '/' && location.hash === '#profile') document.getElementById('profile').scrollIntoView();
      return;
    }
    transition?.cancel();
    const visit = ++navigation;
    const previousView = views.get(previous);
    if (!initial) scrollPositions.set(previous, window.scrollY);

    const goingHome = path === '/';
    const hasHomePosition = scrollPositions.has('/');
    const file = (goingHome ? previous : path).slice(1, -1);
    const homeFolder = views.get('/').querySelector(`.folder[id="${file}"]`);
    const movingBetweenHomeAndFile = homeFolder && (previous === '/' || goingHome);
    const motion = !initial && !reduceMotion.matches && typeof view.animate === 'function';
    let committed = false;

    function commit() {
      if (visit !== navigation || committed) return;
      committed = true;
      previousView.hidden = true;
      view.hidden = false;
      page.dataset.route = path;
      page.dataset.navigated = '';
      document.title = view.dataset.title;
      canonical.href = socialUrl.content = view.dataset.canonical;
      description.content = socialDescription.content = view.dataset.description;
      socialTitle.content = view.dataset.title;
      const hashTarget = goingHome && location.hash === '#profile' ? document.getElementById('profile') : null;
      if (hashTarget) hashTarget.scrollIntoView();
      else window.scrollTo(0, goingHome || restore ? scrollPositions.get(path) ?? 0 : 0);
    }

    function focus() {
      if (visit !== navigation) return;
      const returningLink = goingHome && hasHomePosition ? document.getElementById(file) : null;
      (returningLink ?? view.querySelector('h1')).focus({ preventScroll: true });
    }

    if (motion && movingBetweenHomeAndFile) {
      try {
        animateFile(previousView, view, file, goingHome, commit, focus);
        return;
      } catch (error) {
        console.warn('File animation unavailable; showing the page directly.', error);
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
  window.addEventListener('resize', () => transition?.cancel(true));
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) transition?.cancel(true);
  });
  window.addEventListener('hashchange', () => {
    const path = locationRoute();
    if (path !== page.dataset.route) show(path, { restore: true });
  });
  show(locationRoute(), { initial: true });
})();
