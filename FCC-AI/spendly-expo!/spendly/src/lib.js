import AsyncStorage from '@react-native-async-storage/async-storage';
import { loc, tr } from './i18n';
import * as Crypto from 'expo-crypto';

export const KEY = 'spendly.v1', BKEY = 'spendly.backup', PINKEY = 'spendly.pin', SALTKEY = 'spendly.salt';
export const RED = '#ef4444', GREEN = '#22c55e', BLUE = '#3b82f6';
export const PAL = ['#f97316', '#3b82f6', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#eab308', '#84cc16', '#06b6d4', '#64748b'];
export const CATS = {
  exp: [
    { n: 'Еда', e: '🛒', c: '#84cc16' }, { n: 'Транспорт', e: '🚌', c: '#3b82f6' }, { n: 'Дом', e: '🏠', c: '#a855f7' },
    { n: 'Здоровье', e: '💊', c: '#ef4444' }, { n: 'Кафе', e: '☕', c: '#f97316' }, { n: 'Одежда', e: '👕', c: '#ec4899' },
    { n: 'Развлечения', e: '🎮', c: '#14b8a6' }, { n: 'Подарки', e: '🎁', c: '#eab308' }, { n: 'Прочее', e: '📦', c: '#64748b' },
  ],
  inc: [
    { n: 'Зарплата', e: '💼', c: '#22c55e' }, { n: 'Подработка', e: '💻', c: '#06b6d4' },
    { n: 'Подарки', e: '🎁', c: '#eab308' }, { n: 'Прочее', e: '💰', c: '#64748b' },
  ],
};
export const DSET = { cur: '€', wk: 1, md: 1, theme: 'auto', lang: 'ru', pinLen: 0, bio: false, bulkNote: false };
export const CURS = ['€', '$', '£', '₽', '₴', '₸', '₺', '¥', 'zł', 'CHF'];
export const EMOJI = '🛒 🍎 🍔 🍕 ☕ 🍺 🍷 🚌 🚗 ⛽ 🚆 ✈️ 🏠 💡 📱 💻 🎮 🎬 🎵 📚 🎓 💊 🏥 💇 👕 👟 🎁 🐶 🧸 🏋️ ⚽ 🧾 💳 🏦 💼 💰 📈 🔧 🧹 🌴 🚬 🛠️ 🧴 🚿 🎂 🌐'.split(' ');

/* ---------- secure PIN hashing (SHA-256 + per-device salt) ---------- */
async function getOrCreateSalt() {
  try {
    let salt = await AsyncStorage.getItem(SALTKEY);
    if (!salt) {
      salt = Array.from(new Uint8Array(32), (b) => b.toString(16).padStart(2, '0')).join('');
      await AsyncStorage.setItem(SALTKEY, salt);
    }
    return salt;
  } catch (_) {
    // fallback: deterministic but unique per install
    return 'spendly-fallback-salt-' + Math.random().toString(36).slice(2);
  }
}
export async function hashPin(pin) {
  const salt = await getOrCreateSalt();
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin + salt);
}
export async function verifyPin(pin, storedHash) {
  const hash = await hashPin(pin);
  return hash === storedHash;
}
export const lastG = (v) => { try { const s = [...new Intl.Segmenter().segment(v)]; return s.length ? s[s.length - 1].segment : ''; } catch (_) { return Array.from(v).pop() || ''; } };

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayS = () => ds(new Date());
export const yesterdayS = () => { const d = new Date(); d.setDate(d.getDate() - 1); return ds(d); };
export const parseD = (s) => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c); };
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const fmt = (n) => new Intl.NumberFormat(loc(), { maximumFractionDigits: 2 }).format(n);
export const catOf = (cats, t, n) => cats[t].find((x) => x.n === n) || { n, e: '🏷️', c: '#64748b' };
export const dayLabel = (s) => parseD(s).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'long' });

/* ---------- periods ---------- */
export function periodFor(mode, s, set) {
  const d = parseD(s), y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
  let a, b;
  if (mode === 'day') a = b = d;
  else if (mode === 'week') {
    a = new Date(y, m, dd - ((d.getDay() - set.wk + 7) % 7));
    b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
  } else if (mode === 'month') {
    const md = set.md || 1, s0 = dd >= md ? m : m - 1;
    a = new Date(y, s0, md); b = new Date(y, s0 + 1, md - 1);
  } else { a = new Date(y, 0, 1); b = new Date(y, 11, 31); }
  return { mode, from: ds(a), to: ds(b) };
}
const prevP = (p, set) => {
  const a = parseD(p.from);
  return periodFor(p.mode, ds(new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1)), set);
};
const LD = (s, o) => parseD(s).toLocaleDateString(loc(), o);
export function pLabel(p, set) {
  if (p.mode === 'all') return tr('За всё время', 'All time');
  if (p.mode === 'range') return `${LD(p.from, { day: 'numeric', month: 'short', year: 'numeric' })} – ${LD(p.to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (p.mode === 'day') return LD(p.from, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  if (p.mode === 'week' || (p.mode === 'month' && set.md > 1))
    return `${LD(p.from, { day: 'numeric', month: 'short' })} – ${LD(p.to, { day: 'numeric', month: 'short' })}`;
  if (p.mode === 'month') return LD(p.from, { month: 'long', year: 'numeric' });
  return LD(p.from, { year: 'numeric' });
}
export function pList(mode, earliest, set) {
  const cap = { day: 90, week: 104, month: 120, year: 50 }[mode], minN = { day: 14, week: 8, month: 6, year: 2 }[mode];
  let p = periodFor(mode, todayS(), set); const out = [p];
  while (out.length < cap) { p = prevP(p, set); if (out.length >= minN && p.to < earliest) break; out.push(p); }
  return out;
}

/* ---------- Monefy CSV ---------- */
function parseCSV(t) {
  t = t.replace(/^\uFEFF/, '');
  const f0 = t.split('\n')[0];
  const dl = (f0.match(/;/g) || []).length > (f0.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === dl) { r.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(f); f = ''; rows.push(r); r = []; }
    else f += ch;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  return rows.filter((x) => x.some((v) => v && v.trim()));
}
function parseAmt(s) {
  s = (s || '').replace(/[\s\u00a0]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, ''); else s = s.replace(',', '.');
  return parseFloat(s);
}
export const parseAmount = parseAmt;
function parseDate(s) {
  s = (s || '').trim();
  let m = s.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}
export function runImport(text, db) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { err: tr('Файл пустой или не похож на CSV экспорта Monefy', 'The file is empty or is not a Monefy CSV export') };
  const H = rows[0].map((x) => x.trim().toLowerCase());
  const ix = (n, d) => { const i = H.indexOf(n); return i < 0 ? d : i; };
  const iD = ix('date', 0), iC = ix('category', 2), iA = ix('amount', 3), iN = ix('description', 7);
  const cats = JSON.parse(JSON.stringify(db.cats));
  const seen = new Set(db.tx.map((x) => [x.d, x.t, x.c, x.a, x.n].join('|')));
  const add = []; let dup = 0, bad = 0;
  for (const r of rows.slice(1)) {
    const d = parseDate(r[iD]), v = parseAmt(r[iA]), cn = (r[iC] || '').trim() || 'Прочее', n = (r[iN] || '').trim();
    if (!d || !isFinite(v) || v === 0) { bad++; continue; }
    const t = v < 0 ? 'exp' : 'inc', a = Math.abs(v);
    let c = cats[t].find((x) => x.n.toLowerCase() === cn.toLowerCase());
    if (!c) { c = { n: cn, e: '🏷️', c: PAL[cats[t].length % PAL.length] }; cats[t].push(c); }
    const k = [d, t, c.n, a, n].join('|');
    if (seen.has(k)) { dup++; continue; }
    seen.add(k); add.push({ id: uid(), t, a, c: c.n, d, n });
  }
  return { tx: [...add, ...db.tx], cats, added: add.length, dup, bad };
}

/* ---------- storage ---------- */
export async function loadDb() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { tx: [], cats: CATS, set: { ...DSET } };
    const r = JSON.parse(raw);
    if (!r.tx || !r.cats) throw new Error('Invalid schema');
    return { ...r, set: { ...DSET, ...r.set } };
  } catch (e) {
    console.error('[Spendly] loadDb failed:', e);
    return { tx: [], cats: CATS, set: { ...DSET } };
  }
}
export async function saveDb(db) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.error('[Spendly] saveDb failed:', e);
  }
}
