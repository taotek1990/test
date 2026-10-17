// Generatory losowych identyfikatorów z poprawnymi sumami kontrolnymi.
(function (root) {
  'use strict';

  const DAY_MS = 86400000;

  // Losowa liczba całkowita z przedziału [min, max] bez obciążenia modulo.
  function randInt(min, max) {
    const range = max - min + 1;
    const limit = Math.floor(0x100000000 / range) * range;
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return min + (x % range);
  }

  function pick(list) {
    return list[randInt(0, list.length - 1)];
  }

  function randDigits(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += randInt(0, 9);
    return s;
  }

  function weightedSum(digits, weights) {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += Number(digits[i]) * weights[i];
    return sum;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // PESEL: RRMMDD + 3 cyfry serii + cyfra płci (parzysta = K, nieparzysta = M) + kontrolna.
  // Stulecie kodowane w miesiącu: 1800 +80, 1900 +0, 2000 +20, 2100 +40, 2200 +60.
  const PESEL_WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const PESEL_MONTH_OFFSET = { 18: 80, 19: 0, 20: 20, 21: 40, 22: 60 };
  const PESEL_MIN = Date.UTC(1800, 0, 1);
  const PESEL_MAX = Date.UTC(2299, 11, 31);

  function pesel({ from = Date.UTC(1950, 0, 1), to = Date.UTC(2005, 11, 31), sex = 'any' } = {}) {
    const lo = Math.max(Math.min(from, to), PESEL_MIN);
    const hi = Math.min(Math.max(from, to), PESEL_MAX);
    const date = new Date(randInt(Math.floor(lo / DAY_MS), Math.floor(hi / DAY_MS)) * DAY_MS);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1 + PESEL_MONTH_OFFSET[Math.floor(year / 100)];

    let sexDigit;
    if (sex === 'K') sexDigit = randInt(0, 4) * 2;
    else if (sex === 'M') sexDigit = randInt(0, 4) * 2 + 1;
    else sexDigit = randInt(0, 9);

    const base = pad2(year % 100) + pad2(month) + pad2(date.getUTCDate()) + randDigits(3) + sexDigit;
    return base + (10 - (weightedSum(base, PESEL_WEIGHTS) % 10)) % 10;
  }

  // NPWZ lekarza: 7 cyfr, pierwsza to cyfra kontrolna = (1*c2 + 2*c3 + ... + 6*c7) mod 11.
  // Numery z wynikiem 0 lub 10 nie są nadawane.
  function npwz() {
    for (;;) {
      const rest = randDigits(6);
      let k = 0;
      for (let i = 0; i < 6; i++) k += (i + 1) * Number(rest[i]);
      k %= 11;
      if (k >= 1 && k <= 9) return k + rest;
    }
  }

  // REGON: suma ważona mod 11, wynik 10 zamieniany na 0.
  const REGON9_WEIGHTS = [8, 9, 2, 3, 4, 5, 6, 7];
  const REGON14_WEIGHTS = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];

  function regonControl(digits, weights) {
    const r = weightedSum(digits, weights) % 11;
    return r === 10 ? 0 : r;
  }

  function regon9() {
    const base = randDigits(8);
    return base + regonControl(base, REGON9_WEIGHTS);
  }

  // REGON 14: poprawny REGON 9 + 4 cyfry jednostki lokalnej + kontrolna.
  function regon14() {
    const base = regon9() + randDigits(4);
    return base + regonControl(base, REGON14_WEIGHTS);
  }

  // NIP: suma ważona mod 11; wynik 10 oznacza numer nieprawidłowy, więc losujemy ponownie.
  const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

  function nip({ dashes = false } = {}) {
    for (;;) {
      const base = randInt(1, 9) + randDigits(8);
      const r = weightedSum(base, NIP_WEIGHTS) % 11;
      if (r === 10) continue;
      const n = base + r;
      return dashes ? `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8)}` : n;
    }
  }

  const FIRST_NAMES = [
    'anna', 'maria', 'katarzyna', 'malgorzata', 'agnieszka', 'barbara', 'ewa', 'magdalena',
    'joanna', 'zofia', 'piotr', 'krzysztof', 'andrzej', 'tomasz', 'pawel', 'michal',
    'marcin', 'jakub', 'adam', 'kamil',
  ];
  const LAST_NAMES = [
    'nowak', 'kowalski', 'wisniewski', 'wojcik', 'kowalczyk', 'kaminski', 'lewandowski',
    'zielinski', 'szymanski', 'wozniak', 'dabrowski', 'kozlowski', 'jankowski', 'mazur',
    'kwiatkowski', 'krawczyk', 'piotrowski', 'grabowski', 'pawlowski', 'michalski',
  ];
  const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

  function email({ domain = 'example.com' } = {}) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const local = pick([
      `${first}.${last}`,
      `${first}_${last}`,
      `${first[0]}.${last}`,
      `${first}${last}`,
    ]);
    const suffix = randInt(0, 1) ? randInt(1, 999) : '';
    const d = DOMAIN_RE.test(domain.trim()) ? domain.trim().toLowerCase() : 'example.com';
    return `${local}${suffix}@${d}`;
  }

  const api = { pesel, npwz, regon9, regon14, nip, email };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Generators = api;
})(this);
