(() => {
  'use strict';

  // === DOM refs ===
  const $ = id => document.getElementById(id);
  const patternInput = $('pattern');
  const flagsInput = $('flags');
  const testString = $('testString');
  const highlighted = $('highlighted');
  const matchCount = $('matchCount');
  const matchTable = $('matchTable').querySelector('tbody');
  const errorBar = $('error');
  const replaceBar = $('replaceBar');
  const replaceInput = $('replaceInput');
  const cheatsheet = $('cheatsheet');
  const overlay = $('overlay');
  const toast = $('toast');

  // === Common Patterns ===
  const patterns = [
    { name: 'Email Address', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'g' },
    { name: 'URL', pattern: 'https?://[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+', flags: 'gi' },
    { name: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', flags: 'g' },
    { name: 'Phone (International)', pattern: '\\+?\\d{1,4}[-.\\s]?\\(?\\d{1,3}\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}', flags: 'g' },
    { name: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b', flags: 'g' },
    { name: 'IPv6 Address', pattern: '([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}', flags: 'g' },
    { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\\d|3[01])', flags: 'g' },
    { name: 'Date (MM/DD/YYYY)', pattern: '(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\\d|3[01])/\\d{4}', flags: 'g' },
    { name: 'Time (HH:MM:SS)', pattern: '(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?', flags: 'g' },
    { name: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi' },
    { name: 'HTML Tag', pattern: '<\\/?[a-zA-Z][a-zA-Z0-9]*(?:\\s[^>]*)?\\/?>',  flags: 'g' },
    { name: 'Credit Card', pattern: '\\b(?:\\d[ -]*?){13,19}\\b', flags: 'g' },
    { name: 'SSN (US)', pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', flags: 'g' },
    { name: 'Slug', pattern: '[a-z0-9]+(?:-[a-z0-9]+)*', flags: 'g' },
    { name: 'Username', pattern: '[a-zA-Z0-9_]{3,20}', flags: 'g' },
    { name: 'Strong Password', pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}', flags: '' },
  ];

  // === Cheat Sheet Data ===
  const cheatData = [
    { title: 'Character Classes', items: [
      ['.', 'Any character (except newline)'],
      ['\\d', 'Digit [0-9]'],
      ['\\D', 'Non-digit'],
      ['\\w', 'Word char [a-zA-Z0-9_]'],
      ['\\W', 'Non-word char'],
      ['\\s', 'Whitespace'],
      ['\\S', 'Non-whitespace'],
      ['[abc]', 'Any of a, b, or c'],
      ['[^abc]', 'Not a, b, or c'],
      ['[a-z]', 'Range a to z'],
    ]},
    { title: 'Anchors', items: [
      ['^', 'Start of string/line'],
      ['$', 'End of string/line'],
      ['\\b', 'Word boundary'],
      ['\\B', 'Non-word boundary'],
    ]},
    { title: 'Quantifiers', items: [
      ['*', '0 or more'],
      ['+', '1 or more'],
      ['?', '0 or 1'],
      ['{n}', 'Exactly n'],
      ['{n,}', 'n or more'],
      ['{n,m}', 'Between n and m'],
      ['*?', 'Lazy 0 or more'],
      ['+?', 'Lazy 1 or more'],
    ]},
    { title: 'Groups & Lookaround', items: [
      ['(abc)', 'Capture group'],
      ['(?:abc)', 'Non-capture group'],
      ['(?<name>abc)', 'Named capture group'],
      ['\\1', 'Back-reference'],
      ['(?=abc)', 'Lookahead'],
      ['(?!abc)', 'Negative lookahead'],
      ['(?<=abc)', 'Lookbehind'],
      ['(?<!abc)', 'Negative lookbehind'],
    ]},
    { title: 'Flags', items: [
      ['g', 'Global — find all matches'],
      ['i', 'Case-insensitive'],
      ['m', 'Multiline (^ $ per line)'],
      ['s', 'Dotall (. matches newline)'],
      ['u', 'Unicode'],
      ['y', 'Sticky (from lastIndex)'],
    ]},
  ];

  // === Initialize ===
  function init() {
    renderLibrary();
    renderCheatSheet();
    loadFromURL();
    bindEvents();
    run();
  }

  // === Event Binding ===
  function bindEvents() {
    patternInput.addEventListener('input', run);
    flagsInput.addEventListener('input', () => { syncFlagChips(); run(); });
    testString.addEventListener('input', run);
    replaceInput.addEventListener('input', run);

    // Flag chip toggles
    document.querySelectorAll('.flag-chip input').forEach(cb => {
      cb.addEventListener('change', () => { syncFlagsFromChips(); run(); });
    });

    // Mode toggle
    document.querySelectorAll('input[name="mode"]').forEach(r => {
      r.addEventListener('change', () => {
        replaceBar.classList.toggle('hidden', r.value !== 'replace' || !r.checked);
        run();
      });
    });

    // Theme
    $('themeBtn').addEventListener('click', toggleTheme);

    // Share
    $('shareBtn').addEventListener('click', shareURL);

    // Cheat sheet
    $('cheatsheetToggle').addEventListener('click', () => toggleCheatsheet(true));
    $('cheatsheetClose').addEventListener('click', () => toggleCheatsheet(false));
    overlay.addEventListener('click', () => toggleCheatsheet(false));

    // Keyboard shortcut
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') toggleCheatsheet(false);
    });
  }

  // === Core Regex Engine ===
  function run() {
    const text = testString.innerText || '';
    const pat = patternInput.value;
    const flags = flagsInput.value;
    const mode = document.querySelector('input[name="mode"]:checked').value;

    errorBar.classList.add('hidden');
    matchTable.innerHTML = '';

    if (!pat) {
      highlighted.textContent = text;
      matchCount.textContent = '';
      return;
    }

    let regex;
    try {
      regex = new RegExp(pat, flags);
    } catch (e) {
      errorBar.textContent = e.message;
      errorBar.classList.remove('hidden');
      highlighted.textContent = text;
      matchCount.textContent = '';
      return;
    }

    if (mode === 'replace') {
      const replaced = text.replace(regex, replaceInput.value);
      highlighted.textContent = replaced;
      matchCount.textContent = 'Replace preview';
      return;
    }

    // Match mode
    const matches = [];
    let m;
    const isGlobal = flags.includes('g');

    if (isGlobal) {
      while ((m = regex.exec(text)) !== null) {
        matches.push({ match: m[0], index: m.index, groups: [...m].slice(1), namedGroups: m.groups || {} });
        if (m[0].length === 0) regex.lastIndex++;
      }
    } else {
      m = regex.exec(text);
      if (m) {
        matches.push({ match: m[0], index: m.index, groups: [...m].slice(1), namedGroups: m.groups || {} });
      }
    }

    matchCount.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;

    // Highlight
    highlightMatches(text, matches);

    // Table
    matches.forEach((m, i) => {
      const tr = document.createElement('tr');
      const groupsStr = m.groups.length ? m.groups.map((g, j) => {
        const name = Object.entries(m.namedGroups).find(([,v]) => v === g);
        const label = name ? name[0] : (j + 1);
        return `<span class="group-label">${label}:</span> ${escapeHTML(g ?? 'undefined')}`;
      }).join('<br>') : '—';

      tr.innerHTML = `<td>${i + 1}</td><td>${escapeHTML(m.match)}</td><td>${m.index}</td><td>${groupsStr}</td>`;
      matchTable.appendChild(tr);
    });
  }

  function highlightMatches(text, matches) {
    if (!matches.length) {
      highlighted.textContent = text;
      return;
    }

    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach(m => {
      if (m.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
      }
      const span = document.createElement('span');
      span.className = 'match';
      span.textContent = m.match;
      frag.appendChild(span);
      lastIndex = m.index + m.match.length;
    });

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    highlighted.innerHTML = '';
    highlighted.appendChild(frag);
  }

  // === Flag Sync ===
  function syncFlagChips() {
    const flags = flagsInput.value;
    document.querySelectorAll('.flag-chip input').forEach(cb => {
      cb.checked = flags.includes(cb.dataset.flag);
    });
  }

  function syncFlagsFromChips() {
    let flags = '';
    document.querySelectorAll('.flag-chip input:checked').forEach(cb => {
      flags += cb.dataset.flag;
    });
    flagsInput.value = flags;
  }

  // === Theme ===
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    $('themeBtn').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('regexlab-theme', isDark ? 'light' : 'dark');
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('regexlab-theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    $('themeBtn').textContent = savedTheme === 'dark' ? '🌙' : '☀️';
  }

  // === Share ===
  function shareURL() {
    const params = new URLSearchParams();
    params.set('p', patternInput.value);
    params.set('f', flagsInput.value);
    params.set('t', testString.innerText || '');
    const mode = document.querySelector('input[name="mode"]:checked').value;
    if (mode === 'replace') {
      params.set('m', 'replace');
      params.set('r', replaceInput.value);
    }
    const url = `${location.origin}${location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => showToast('URL copied to clipboard!'));
  }

  function loadFromURL() {
    const params = new URLSearchParams(location.search);
    if (params.has('p')) patternInput.value = params.get('p');
    if (params.has('f')) {
      flagsInput.value = params.get('f');
      syncFlagChips();
    }
    if (params.has('t')) testString.textContent = params.get('t');
    if (params.get('m') === 'replace') {
      document.querySelector('input[name="mode"][value="replace"]').checked = true;
      replaceBar.classList.remove('hidden');
      if (params.has('r')) replaceInput.value = params.get('r');
    }
  }

  // === Library ===
  function renderLibrary() {
    const grid = $('libraryGrid');
    patterns.forEach(p => {
      const card = document.createElement('div');
      card.className = 'library-card';
      card.innerHTML = `<div class="lib-name">${p.name}</div><div class="lib-pattern">${escapeHTML(p.pattern)}</div>`;
      card.addEventListener('click', () => {
        patternInput.value = p.pattern;
        flagsInput.value = p.flags;
        syncFlagChips();
        run();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Loaded: ${p.name}`);
      });
      grid.appendChild(card);
    });
  }

  // === Cheat Sheet ===
  function renderCheatSheet() {
    const body = $('cheatsheetBody');
    cheatData.forEach(section => {
      const div = document.createElement('div');
      div.className = 'cheat-section';
      div.innerHTML = `<h3>${section.title}</h3>` +
        section.items.map(([token, desc]) =>
          `<div class="cheat-row"><span class="cheat-token">${escapeHTML(token)}</span><span class="cheat-desc">${desc}</span></div>`
        ).join('');
      body.appendChild(div);
    });
  }

  function toggleCheatsheet(open) {
    if (open === undefined) open = !cheatsheet.classList.contains('open');
    cheatsheet.classList.toggle('hidden', false);
    requestAnimationFrame(() => {
      cheatsheet.classList.toggle('open', open);
      overlay.classList.toggle('hidden', !open);
    });
    if (!open) setTimeout(() => cheatsheet.classList.toggle('hidden', true), 300);
  }

  // === Utilities ===
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
  }

  // === Go ===
  init();
})();
