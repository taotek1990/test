(function () {
  'use strict';

  const G = window.Generators;
  const $ = (sel) => document.querySelector(sel);

  function dateValue(id) {
    const v = $(id).value;
    return v ? Date.parse(v + 'T00:00:00Z') : undefined;
  }

  const TYPES = {
    pesel: () => G.pesel({ from: dateValue('#pesel-from'), to: dateValue('#pesel-to'), sex: $('#pesel-sex').value }),
    npwz: () => G.npwz(),
    regon9: () => G.regon9(),
    regon14: () => G.regon14(),
    nip: () => G.nip({ dashes: $('#nip-dashes').checked }),
    email: () => G.email({ domain: $('#email-domain').value }),
  };

  let current = 'pesel';
  const results = $('#results');

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const label = button.textContent;
    button.textContent = 'Skopiowano';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = label;
      button.disabled = false;
    }, 1200);
  }

  function generate() {
    const count = Math.min(Math.max(parseInt($('#count').value, 10) || 1, 1), 100);
    $('#count').value = count;
    results.replaceChildren();
    for (let i = 0; i < count; i++) {
      const value = TYPES[current]();
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = value;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy';
      btn.textContent = 'Kopiuj';
      btn.addEventListener('click', () => copyText(value, btn));
      li.append(code, btn);
      results.appendChild(li);
    }
  }

  function selectType(type) {
    current = type;
    document.querySelectorAll('[role="tab"]').forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.type === type));
    });
    document.querySelectorAll('[data-options]').forEach((el) => {
      el.hidden = el.dataset.options !== type;
    });
    $('#no-options').hidden = Boolean(document.querySelector(`[data-options="${type}"]`));
    generate();
  }

  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => selectType(tab.dataset.type));
  });
  $('#settings').addEventListener('submit', (e) => {
    e.preventDefault();
    generate();
  });
  $('#copy-all').addEventListener('click', (e) => {
    const all = [...results.querySelectorAll('code')].map((c) => c.textContent).join('\n');
    copyText(all, e.currentTarget);
  });

  selectType(current);
})();
