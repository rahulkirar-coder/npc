(() => {
  const body = document.body;
  const STORAGE_KEY = 'a11y_state_v1';

  /* ---------------- STATE ---------------- */
  const state = {
    textScale: 0,     // 0..3
    textDeScale: 0,   // 0..3
    highContrast: false,
    grayscale: false,
    hideImages: false,
    highlightLinks: false
  };

  const SCALE_UP = [1, 1.05, 1.10, 1.15];
  const SCALE_DOWN = [1, 0.95, 0.9, 0.85];

  /* ---------------- STORAGE ---------------- */
  const save = () =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  const load = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) Object.assign(state, JSON.parse(saved));
  };

  /* ---------------- APPLY ---------------- */
  const applyZoom = () => {
    if (state.textScale > 0) {
      body.style.zoom = SCALE_UP[state.textScale];
    } else if (state.textDeScale > 0) {
      body.style.zoom = SCALE_DOWN[state.textDeScale];
    } else {
      body.style.zoom = '';
    }
  };

  const apply = () => {
    applyZoom();

    body.classList.toggle('theme-high-contrast', state.highContrast);
    body.classList.toggle('highlight-links', state.highlightLinks);

    body.style.filter = state.grayscale ? 'grayscale(1)' : '';

    document.querySelectorAll('img').forEach(img => {
      img.style.visibility = state.hideImages ? 'hidden' : '';
    });

    save();
  };

  /* ---------------- INDICATORS ---------------- */
  const updateIndicators = (item, level) => {
    const dots = item.querySelectorAll('.list-indicator li');
    dots.forEach((d, i) => d.classList.toggle('filled', i < level));
  };

  /* ---------------- ACTIONS ---------------- */
  const actions = {
    'text-scale': (item) => {
      state.textScale = (state.textScale + 1) % SCALE_UP.length;
      state.textDeScale = 0; // ✅ reset smaller
      updateIndicators(item, state.textScale);

      const other = document.querySelector('[data-id="text-descale"]');
      other?.querySelectorAll('.list-indicator li')
        .forEach(li => li.classList.remove('filled'));
    },

    'text-descale': (item) => {
      state.textDeScale = (state.textDeScale + 1) % SCALE_DOWN.length;
      state.textScale = 0; // ✅ reset bigger
      updateIndicators(item, state.textDeScale);

      const other = document.querySelector('[data-id="text-scale"]');
      other?.querySelectorAll('.list-indicator li')
        .forEach(li => li.classList.remove('filled'));
    },

    'theme-contrast': () => {
      state.highContrast = !state.highContrast;
    },

    'grayscale': () => {
      state.grayscale = !state.grayscale;
    },

    'hide-images': () => {
      state.hideImages = !state.hideImages;
    },

    'highlight-links': () => {
      state.highlightLinks = !state.highlightLinks;
    }
  };

  /* ---------------- BIND ---------------- */
  const bind = () => {
    document.querySelectorAll('[data-id]').forEach(item => {
      const id = item.dataset.id;
      const btn = item.querySelector('[role="button"]');
      if (!btn || !actions[id]) return;

      btn.setAttribute('tabindex', '0');

      const run = (e) => {
        e.preventDefault();
        actions[id](item);
        apply();
      };

      btn.addEventListener('click', run);
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') run(e);
      });
    });

    /* -------- RESET -------- */
    const reset = document.querySelector(
      '.accesspility-modal-content-item-header-reset'
    );

    reset?.addEventListener('click', e => {
      e.preventDefault();

      Object.keys(state).forEach(k =>
        typeof state[k] === 'boolean'
          ? state[k] = false
          : state[k] = 0
      );

      body.removeAttribute('style');
      body.classList.remove('theme-high-contrast', 'highlight-links');

      document
        .querySelectorAll('.list-indicator li')
        .forEach(li => li.classList.remove('filled'));

      localStorage.removeItem(STORAGE_KEY);
      apply();
    });

  };

  /* ---------------- INIT ---------------- */
  load();
  bind();
  apply();
})();
