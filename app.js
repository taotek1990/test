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

  function ageOn(birth, today) {
    let age = today.getFullYear() - birth.getUTCFullYear();
    const m = today.getMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getUTCDate())) age--;
    return age;
  }

  function yearsLabel(n) {
    if (n === 1) return '1 rok';
    const last = n % 10;
    const lastTwo = n % 100;
    return `${n} ${last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'lata' : 'lat'}`;
  }

  function showPeselResult() {
    const box = $('#pesel-result');
    const value = $('#pesel-check').value.replace(/\s/g, '');
    box.replaceChildren();
    box.className = '';
    if (!value) return;

    if (/^\d{0,10}$/.test(value)) {
      box.className = 'muted';
      box.textContent = `Wpisz 11 cyfr (${value.length}/11).`;
      return;
    }

    const result = G.parsePesel(value);
    const age = result.valid ? ageOn(result.birthDate, new Date()) : 0;
    if (!result.valid || age < 0) {
      box.className = 'error';
      box.textContent = `✗ ${result.valid ? 'Data urodzenia jest w przyszłości.' : result.error}`;
      return;
    }

    const d = result.birthDate;
    const date = [d.getUTCDate(), d.getUTCMonth() + 1].map((n) => String(n).padStart(2, '0')).join('.') + '.' + d.getUTCFullYear();
    const status = document.createElement('p');
    status.className = 'ok';
    status.textContent = '✓ Poprawny numer PESEL';
    const dl = document.createElement('dl');
    for (const [term, desc] of [
      ['Data urodzenia', date],
      ['Wiek', yearsLabel(age)],
      ['Płeć', result.sex === 'K' ? 'kobieta' : 'mężczyzna'],
    ]) {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = desc;
      dl.append(dt, dd);
    }
    box.append(status, dl);
  }

  $('#pesel-check').addEventListener('input', showPeselResult);

  selectType(current);
})();
