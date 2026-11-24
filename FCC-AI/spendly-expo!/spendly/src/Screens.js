import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, SectionList, TextInput, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import * as LA from 'expo-local-authentication';
import * as FS from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useC, Dot, Seg, Sheet, Btn, TxRow, DateField, pullProps } from './ui';
import { tr, getLang } from './i18n';
import * as L from './lib';

const { RED, GREEN, BLUE } = L;

/* ---------- file sharing (expo-file-system SDK 53+ API) ---------- */
async function shareText(name, text) {
  const f = new FS.File(FS.Paths.cache, name);
  if (f.exists) f.delete();
  f.create(); f.write(text);
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', UTI: 'public.json' });
}
const readPicked = async () => {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (r.canceled) return null;
  return (await fetch(r.assets[0].uri)).text();
};

const Sec = ({ l, children }) => {
  const c = useC();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 14, marginBottom: 14 }}>
      <Text style={{ color: c.mute, fontSize: 13, marginBottom: 8 }}>{l}</Text>
      {children}
    </View>
  );
};
const Chip = ({ on, children, onPress }) => {
  const c = useC();
  return (
    <Pressable onPress={onPress} style={{ minWidth: 46, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: on ? BLUE : c.bg }}>
      <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '600' }}>{children}</Text>
    </Pressable>
  );
};
const Input = (p) => {
  const c = useC();
  return <TextInput placeholderTextColor={c.mute} {...p} style={[{ color: c.ink, fontSize: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg }, p.style]} />;
};

/* ---------- Lock screen ---------- */
export function Lock({ set, onOk }) {
  const c = useC(), ins = useSafeAreaInsets();
  const [v, setV] = useState(''), [bad, setBad] = useState(false);
  const bio = useCallback(async () => { try { const r = await LA.authenticateAsync({ promptMessage: 'Spendly' }); if (r.success) onOk(); } catch (_) {} }, [onOk]);
  useEffect(() => { if (set.bio) bio(); }, [set.bio, bio]);
  const press = async (d) => {
    const n = v + d;
    if (n.length < set.pinLen) { setV(n); setBad(false); return; }
    const h = await SecureStore.getItemAsync(L.PINKEY);
    const ok = await L.verifyPin(n, h);
    if (ok) onOk(); else { setV(''); setBad(true); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingBottom: ins.bottom }}>
      <Text style={{ color: c.ink, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Spendly</Text>
      <Text style={{ color: bad ? RED : c.mute, marginBottom: 24 }}>{bad ? tr('Неверный пароль', 'Wrong passcode') : tr('Введите пароль', 'Enter passcode')}</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
        {Array.from({ length: set.pinLen }, (_, i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: BLUE, backgroundColor: i < v.length ? BLUE : 'transparent' }} />)}
      </View>
      <View style={{ width: 260, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'bio', 0, '⌫'].map((k) => k === 'bio'
          ? (set.bio ? <Pressable key={k} onPress={bio} style={{ width: 77, paddingVertical: 16, alignItems: 'center' }}><Text style={{ fontSize: 26 }}>🔓</Text></Pressable> : <View key={k} style={{ width: 77 }} />)
          : <Pressable key={k} onPress={() => (k === '⌫' ? setV(v.slice(0, -1)) : press(String(k)))} style={({ pressed }) => ({ width: 77, paddingVertical: 16, borderRadius: 40, alignItems: 'center', backgroundColor: c.card, opacity: pressed ? 0.5 : 1 })}>
              <Text style={{ color: c.ink, fontSize: 24 }}>{k}</Text>
            </Pressable>)}
      </View>
    </View>
  );
}

function PinSheet({ onSave, onClose }) {
  const c = useC(), [v, setV] = useState('');
  return (
    <Sheet onClose={onClose}>
      <Text style={{ color: c.ink, fontSize: 18, fontWeight: '600' }}>{tr('Пароль на вход', 'Passcode')}</Text>
      <Text style={{ color: c.mute, marginVertical: 8 }}>{tr('4–6 цифр. Это защита от случайного просмотра, а не шифрование данных.', '4–6 digits. This keeps casual viewers out; it does not encrypt your data.')}</Text>
      <Input autoFocus secureTextEntry keyboardType="number-pad" maxLength={6} value={v} onChangeText={(x) => setV(x.replace(/\D/g, ''))} style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }} />
      <View style={{ height: 14 }} />
      <Btn bg={BLUE} disabled={!/^\d{4,6}$/.test(v)} onPress={() => onSave(v)}>{tr('Сохранить', 'Save')}</Btn>
    </Sheet>
  );
}

function WipeSheet({ n, onExport, onOk, onClose }) {
  const c = useC(), [step, setStep] = useState(1), [w, setW] = useState('');
  const word = tr('УДАЛИТЬ', 'DELETE');
  return (
    <Sheet onClose={onClose}>
      <Text style={{ color: RED, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>{tr('Удалить все данные?', 'Delete all data?')}</Text>
      {step === 1 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.mute, marginBottom: 8 }}>{tr(`Будет удалено операций: ${n}. Категории вернутся к стандартным. Отменить это действие нельзя.`, `${n} transactions will be deleted and categories reset to defaults. This cannot be undone.`, `${n} opérations seront supprimées et les catégories réinitialisées. Cette action est irréversible.`)}</Text>
          <Btn outline onPress={onExport}>{tr('Сначала сохранить копию в файл', 'Save a backup file first')}</Btn>
          <Btn bg={RED} onPress={() => setStep(2)}>{tr('Продолжить', 'Continue')}</Btn>
          <Btn outline fg={c.mute} onPress={onClose}>{tr('Отмена', 'Cancel')}</Btn>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ color: c.mute }}>{tr('Последний шаг. Введите слово', 'Last step. Type the word')} <Text style={{ color: c.ink, fontWeight: '700' }}>{word}</Text> {tr('для подтверждения.', 'to confirm.')}</Text>
          <Input autoFocus autoCapitalize="characters" value={w} onChangeText={setW} style={{ textAlign: 'center', fontSize: 18 }} />
          <Btn bg={RED} disabled={w.trim().toUpperCase() !== word} onPress={onOk}>{tr('Удалить навсегда', 'Delete forever')}</Btn>
          <Btn outline fg={c.mute} onPress={onClose}>{tr('Отмена', 'Cancel')}</Btn>
        </View>
      )}
    </Sheet>
  );
}

/* ---------- Settings ---------- */
export function Settings({ db, setDb, upd }) {
  const c = useC(), s = db.set;
  const [pin, setPin] = useState(false), [wipe, setWipe] = useState(false), [msg, setMsg] = useState('');
  const [bk, setBk] = useState(null), [bioOk, setBioOk] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(L.BKEY).then((v) => v && setBk(JSON.parse(v))).catch(() => {});
    LA.hasHardwareAsync().then((h) => h && LA.isEnrolledAsync().then(setBioOk)).catch(() => {});
  }, []);
  const payload = () => JSON.stringify({ app: 'spendly', v: 1, at: new Date().toISOString(), tx: db.tx, cats: db.cats, set: { ...s, pinLen: 0, bio: false } }, null, 1);
  const exportFile = async () => { try { await shareText(`spendly-${L.todayS()}.json`, payload()); } catch (_) { setMsg(tr('Не удалось поделиться файлом', 'Could not share the file')); } };
  const snap = async () => { const v = { at: new Date().toISOString(), data: { tx: db.tx, cats: db.cats } }; await AsyncStorage.setItem(L.BKEY, JSON.stringify(v)); setBk(v); setMsg(tr('Копия создана', 'Backup created')); };
  const restoreSnap = () => Alert.alert(tr('Восстановить данные из этой копии?', 'Restore data from this backup?'), '', [
    { text: tr('Отмена', 'Cancel'), style: 'cancel' },
    { text: tr('Восстановить', 'Restore'), onPress: () => { setDb({ ...db, ...bk.data }); setMsg(tr('Данные восстановлены из копии', 'Restored from backup')); } },
  ]);
  const fromFile = async () => {
    try {
      const t = await readPicked(); if (!t) return;
      const j = JSON.parse(t);
      if (!Array.isArray(j.tx) || !j.cats || !j.cats.exp || !j.cats.inc) throw 0;
      setDb({ ...db, tx: j.tx, cats: j.cats });
      setMsg(`${tr('Восстановлено операций:', 'Restored transactions:')} ${j.tx.length}`);
    } catch (_) { setMsg(tr('Файл не похож на копию Spendly', 'This is not a Spendly backup file')); }
  };
  const savePin = async (v) => { const h = await L.hashPin(v); await SecureStore.setItemAsync(L.PINKEY, h); upd({ pinLen: v.length }); setPin(false); };
  const offPin = async () => { await SecureStore.deleteItemAsync(L.PINKEY); upd({ pinLen: 0, bio: false }); };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Sec l={tr('Тема', 'Theme')}><Seg val={s.theme} on={(v) => upd({ theme: v })} opts={[['auto', tr('Авто', 'Auto')], ['light', tr('Светлая', 'Light')], ['dark', tr('Тёмная', 'Dark')]]} /></Sec>
      <Sec l={tr('Язык', 'Language')}><Seg val={s.lang} on={(v) => upd({ lang: v })} opts={[['ru', 'Русский'], ['en', 'English'], ['fr', 'Français']]} /></Sec>
      <Sec l={tr('Валюта', 'Currency')}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{L.CURS.map((x) => <Chip key={x} on={s.cur === x} onPress={() => upd({ cur: x })}>{x}</Chip>)}</View></Sec>
      <Sec l={tr('Начало месяца (число)', 'Month starts on day')}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <Chip key={d} on={s.md === d} onPress={() => upd({ md: d })}>{d}</Chip>)}</View></Sec>
      <Sec l={tr('Заметки', 'Notes')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.ink, fontWeight: '600' }}>{tr('Массовая замена заметки', 'Bulk note editing')}</Text>
            <Text style={{ color: c.mute, fontSize: 12 }}>{tr('Кнопка ✎ в режиме выбора операций в истории', 'The ✎ button when selecting transactions in History')}</Text>
          </View>
          <Switch value={!!s.bulkNote} onValueChange={(v) => upd({ bulkNote: v })} trackColor={{ true: BLUE }} />
        </View>
      </Sec>
      <Sec l={tr('Пароль на вход', 'Passcode')}>
        <View style={{ gap: 8 }}>
          <Btn outline onPress={() => setPin(true)}>{s.pinLen ? tr('Изменить пароль', 'Change passcode') : tr('Установить пароль', 'Set passcode')}</Btn>
          {!!s.pinLen && <Btn outline fg={RED} onPress={offPin}>{tr('Отключить пароль', 'Turn off passcode')}</Btn>}
          {!!s.pinLen && bioOk && <Btn outline fg={s.bio ? GREEN : c.ink} onPress={() => upd({ bio: !s.bio })}>{s.bio ? '✓ ' : ''}{tr('Face ID / Touch ID', 'Face ID / Touch ID')}</Btn>}
        </View>
      </Sec>
      <Sec l={tr('Данные', 'Data')}>
        <View style={{ gap: 8 }}>
          <Btn outline onPress={exportFile}>{tr('Экспорт всех данных (JSON)', 'Export all data (JSON)')}</Btn>
          <Btn outline onPress={snap}>{tr('Создать резервную копию в приложении', 'Create in-app backup')}</Btn>
          {bk && <Btn outline onPress={restoreSnap}>{tr('Восстановить из копии приложения', 'Restore from in-app backup')}</Btn>}
          {bk && <Text style={{ color: c.mute, fontSize: 12 }}>{tr('Последняя копия:', 'Last backup:')} {new Date(bk.at).toLocaleString()}</Text>}
          <Btn outline onPress={fromFile}>{tr('Восстановить из файла', 'Restore from file')}</Btn>
          <Btn outline fg={RED} onPress={() => setWipe(true)}>{tr('Удалить все данные', 'Delete all data')}</Btn>
          {!!msg && <Text style={{ color: c.mute }}>{msg}</Text>}
        </View>
      </Sec>
      {pin && <PinSheet onClose={() => setPin(false)} onSave={savePin} />}
      {wipe && <WipeSheet n={db.tx.length} onExport={exportFile} onClose={() => setWipe(false)} onOk={() => { setDb({ ...db, tx: [], cats: L.CATS }); setWipe(false); setMsg(tr('Все данные удалены', 'All data deleted')); }} />}
    </ScrollView>
  );
}

/* ---------- Category editor ---------- */
function CatEdit({ t, idx, cats, onSave, onDel, onClose }) {
  const c = useC();
  const cur = idx >= 0 ? cats[t][idx] : { n: '', e: '🏷️', c: L.PAL[cats[t].length % L.PAL.length] };
  const [n, setN] = useState(cur.n), [e, setE] = useState(cur.e), [col, setCol] = useState(cur.c);
  const dup = cats[t].some((k, i) => i !== idx && k.n.toLowerCase() === n.trim().toLowerCase());
  const ok = n.trim() && e && !dup;
  const ask = () => Alert.alert(tr('Удалить категорию?', 'Delete this category?'), tr('Операции останутся в истории с серой иконкой.', 'Transactions stay in history with a gray icon.'), [
    { text: tr('Отмена', 'Cancel'), style: 'cancel' }, { text: tr('Удалить', 'Delete'), style: 'destructive', onPress: () => onDel(t, idx) }]);
  return (
    <Sheet onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" {...pullProps(onClose)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Dot c={col} e={e} s={52} />
          <Input style={{ flex: 1 }} value={n} onChangeText={setN} placeholder={tr('Название', 'Name')} />
        </View>
        {dup && <Text style={{ color: RED, fontSize: 12, marginBottom: 8 }}>{tr('Такая категория уже есть', 'This category already exists')}</Text>}
        <Text style={{ color: c.mute, marginBottom: 6 }}>{tr('Иконка', 'Icon')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {L.EMOJI.map((x) => <Pressable key={x} onPress={() => setE(x)} style={{ width: '12.5%', alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: e === x ? col + '44' : 'transparent' }}><Text style={{ fontSize: 22 }}>{x}</Text></Pressable>)}
        </View>
        <Input style={{ marginTop: 8 }} value="" onChangeText={(v) => { const g = L.lastG(v); if (g) setE(g); }} placeholder={tr('Или введите свой эмодзи', 'Or type your own emoji')} />
        <Text style={{ color: c.mute, marginTop: 12, marginBottom: 6 }}>{tr('Цвет', 'Color')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {L.PAL.map((x) => <Pressable key={x} onPress={() => setCol(x)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: x, borderWidth: col === x ? 3 : 0, borderColor: c.ink }} />)}
        </View>
        <View style={{ marginTop: 20, gap: 8 }}>
          <Btn bg={BLUE} disabled={!ok} onPress={() => onSave(t, idx, { n: n.trim(), e, c: col })}>{tr('Сохранить', 'Save')}</Btn>
          {idx >= 0 && cats[t].length > 1 && <Btn outline fg={RED} onPress={ask}>{tr('Удалить категорию', 'Delete category')}</Btn>}
        </View>
      </ScrollView>
    </Sheet>
  );
}
export function CatsScreen({ db, setDb }) {
  const c = useC(), [t, setT] = useState('exp'), [ed, setEd] = useState(null);
  const save = (t, idx, v) => {
    const old = idx >= 0 ? db.cats[t][idx] : null, list = [...db.cats[t]];
    if (old) list[idx] = v; else list.push(v);
    const tx = old && old.n !== v.n ? db.tx.map((x) => (x.t === t && x.c === old.n ? { ...x, c: v.n } : x)) : db.tx;
    setDb({ ...db, cats: { ...db.cats, [t]: list }, tx }); setEd(null);
  };
  const del = (t, idx) => { setDb({ ...db, cats: { ...db.cats, [t]: db.cats[t].filter((_, i) => i !== idx) } }); setEd(null); };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Seg val={t} on={setT} opts={[['exp', tr('Расходы', 'Expenses')], ['inc', tr('Доходы', 'Income')]]} />
      <View style={{ marginTop: 12, backgroundColor: c.card, borderRadius: 16, overflow: 'hidden' }}>
        {db.cats[t].map((k, i) => (
          <Pressable key={k.n} onPress={() => setEd({ t, idx: i })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Dot c={k.c} e={k.e} /><Text style={{ flex: 1, color: c.ink, fontSize: 16, fontWeight: '500' }}>{k.n}</Text><Text style={{ color: c.mute, fontSize: 20 }}>›</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 12 }}><Btn bg={BLUE} onPress={() => setEd({ t, idx: -1 })}>＋ {tr('Добавить категорию', 'Add category')}</Btn></View>
      {ed && <CatEdit key={ed.t + ed.idx} t={ed.t} idx={ed.idx} cats={db.cats} onSave={save} onDel={del} onClose={() => setEd(null)} />}
    </ScrollView>
  );
}

export function NoteSheet({ count, initial, onApply, onClose }) {
  const c = useC(), [v, setV] = useState(initial || '');
  return (
    <Sheet onClose={onClose}>
      <Text style={{ color: c.ink, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>{tr('Изменить заметку', 'Rename note')}</Text>
      <Text style={{ color: c.mute, marginBottom: 10 }}>{tr(`Будет изменено операций: ${count}`, `Transactions to update: ${count}`, `Opérations à modifier : ${count}`)}</Text>
      <Input autoFocus value={v} onChangeText={setV} placeholder={tr('Новая заметка', 'New note')} />
      <View style={{ height: 14 }} />
      <Btn bg={BLUE} onPress={() => onApply(v.trim())}>{tr('Применить', 'Apply', 'Appliquer')}</Btn>
    </Sheet>
  );
}

/* ---------- Search: text + time interval, tappable totals filter expenses / income ---------- */
function SearchHint({ c, children }) {
  return <Text style={{ color: c.mute, textAlign: 'center', padding: 30 }}>{children}</Text>;
}
function SearchTot({ k, sign, col, kind, setKind, money, sum, cnt, c, tr }) {
  return (
    <Pressable onPress={() => setKind(kind === k ? null : k)} style={{ flex: 1, padding: 10, borderRadius: 14, borderWidth: 2, borderColor: col, backgroundColor: kind === k ? col : c.card }}>
      <Text style={{ color: kind === k ? '#fff' : col, fontWeight: '700', fontSize: 16 }}>{sign}{money(sum(k))}</Text>
      <Text style={{ color: kind === k ? '#fffc' : c.mute, fontSize: 12 }}>{cnt(k)} {tr('операций', 'operations')}</Text>
    </Pressable>
  );
}

export function SearchScreen({ db, money, per, onOpen }) {
  const c = useC(), today = L.todayS();
  const [q, setQ] = useState(''), [scope, setScope] = useState('all'), [kind, setKind] = useState(null);
  const [rf, setRf] = useState(per.mode === 'all' ? L.ds(new Date(new Date().getFullYear(), 0, 1)) : per.from);
  const [rt, setRt] = useState(per.to < today ? per.to : today);
  const qq = q.trim().toLowerCase();
  const [from, to] = scope === 'period' ? [per.from, per.to] : scope === 'range' ? [rf, rt] : ['0000-01-01', '9999-12-31'];
  const found = useMemo(() => (qq.length < 1 ? [] : db.tx.filter((x) => x.d >= from && x.d <= to && `${x.c} ${x.n} ${x.a}`.toLowerCase().includes(qq))
    .sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id))), [db.tx, qq, from, to]);
  const shown = useMemo(() => (kind ? found.filter((x) => x.t === kind) : found), [found, kind]);
  const sum = (t) => found.filter((x) => x.t === t).reduce((s, x) => s + x.a, 0);
  const cnt = (t) => found.filter((x) => x.t === t).length;
  const sections = useMemo(() => { const g = {}; shown.slice(0, 300).forEach((x) => (g[x.d] = g[x.d] || []).push(x)); return Object.entries(g).map(([title, data]) => ({ title, data })); }, [shown]);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        <Input autoFocus value={q} onChangeText={(v) => { setQ(v); setKind(null); }} placeholder={tr('Поиск: категория, заметка, сумма', 'Search: category, note, amount')} />
        <Seg val={scope} on={setScope} opts={[['all', tr('За всё время', 'All time')], ['range', tr('Свой период', 'Custom range')]]} />
        {scope === 'period' && <Text style={{ color: c.mute, textAlign: 'center', textTransform: 'capitalize' }}>{L.pLabel(per, db.set)}</Text>}
        {scope === 'range' && <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><DateField label={tr('С', 'From')} value={rf} onChange={setRf} /></View><View style={{ flex: 1 }}><DateField label={tr('По', 'To')} value={rt} onChange={setRt} /></View></View>}
        {qq.length > 0 && !!found.length && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SearchTot k="exp" sign="−" col={RED} kind={kind} setKind={setKind} money={money} sum={sum} cnt={cnt} c={c} tr={tr} />
              <SearchTot k="inc" sign="+" col={GREEN} kind={kind} setKind={setKind} money={money} sum={sum} cnt={cnt} c={c} tr={tr} />
            </View>
            <Text style={{ color: c.mute, fontSize: 12 }}>{tr('Нажмите на сумму, чтобы показать только расходы или доходы', 'Tap a total to show only expenses or income')}</Text>
          </>
        )}
      </View>
      {qq.length < 1 ? <SearchHint c={c}>{tr('Начните вводить: поиск идёт по операциям с первой буквы.', 'Start typing: search works from the first letter.')}</SearchHint>
        : !found.length ? <SearchHint c={c}>{tr('Ничего не найдено', 'Nothing found')}</SearchHint> : (
          <SectionList sections={sections} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" keyExtractor={(x) => x.id} contentContainerStyle={{ paddingBottom: 40 }}
            renderSectionHeader={({ section }) => <Text style={{ color: c.mute, fontSize: 13, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, textTransform: 'capitalize' }}>{L.dayLabel(section.title)}</Text>}
            renderItem={({ item }) => <TxRow t={item} cats={db.cats} money={money} onPress={() => onOpen(item)} />}
            ListFooterComponent={shown.length > 300 ? <SearchHint c={c}>{tr('Показаны первые 300 операций. Уточните запрос.', 'Showing the first 300 results. Refine your search.')}</SearchHint> : null} />
        )}
    </View>
  );
}

/* ---------- Transaction details / edit ---------- */
export function EditSheet({ t, cats, cur, onSave, onDelete, onClose }) {
  const c = useC();
  const [a, setA] = useState(String(t.a)), [d, setD] = useState(t.d), [cat, setCat] = useState(t.c), [n, setN] = useState(t.n || '');
  const col = t.t === 'exp' ? RED : GREEN, val = L.parseAmount(a), ok = val > 0, sep = getLang() === 'en' ? '.' : ',';
  const clean = (v) => { v = v.replace(',', '.').replace(/[^0-9.]/g, ''); const i = v.indexOf('.'); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2); return v; };
  const list = cats[t.t].some((k) => k.n === t.c) ? cats[t.t] : [...cats[t.t], L.catOf(cats, t.t, t.c)];
  const ask = () => Alert.alert(tr('Удалить эту операцию?', 'Delete this transaction?'), '', [
    { text: tr('Отмена', 'Cancel'), style: 'cancel' }, { text: tr('Удалить', 'Delete'), style: 'destructive', onPress: () => onDelete(t.id) }]);
  return (
    <Sheet onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" {...pullProps(onClose)}>
        <Text style={{ color: c.mute, textAlign: 'center' }}>{tr('Операция', 'Transaction')} · {t.t === 'exp' ? tr('Расход', 'Expense') : tr('Доход', 'Income')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 6, paddingVertical: 6 }}>
          <TextInput value={a.replace('.', sep)} onChangeText={(v) => setA(clean(v))} keyboardType="decimal-pad" selectTextOnFocus
            style={{ color: col, fontSize: 40, fontWeight: '700', textAlign: 'center', minWidth: 120 }} />
          <Text style={{ color: c.mute, fontSize: 22 }}>{cur}</Text>
        </View>
        <DateField label={tr('Дата', 'Date')} value={d} onChange={setD} />
        <View style={{ height: 10 }} />
        <Input value={n} onChangeText={setN} placeholder={tr('Заметка', 'Note')} />
        <Text style={{ color: c.mute, marginTop: 14, marginBottom: 6 }}>{tr('Категория', 'Category')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {list.map((k) => (
            <Pressable key={k.n} onPress={() => setCat(k.n)} style={{ width: '23%', alignItems: 'center', gap: 4, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: cat === k.n ? k.c : 'transparent', backgroundColor: cat === k.n ? k.c + '1f' : 'transparent' }}>
              <Dot c={k.c} e={k.e} s={36} /><Text numberOfLines={1} style={{ color: c.ink, fontSize: 11 }}>{k.n}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 18, gap: 8 }}>
          <Btn bg={col} disabled={!ok} onPress={() => onSave({ ...t, a: val, d: d || t.d, c: cat, n: n.trim() })}>{tr('Сохранить', 'Save')}</Btn>
          <Btn outline fg={RED} onPress={ask}>{tr('Удалить', 'Delete')}</Btn>
        </View>
      </ScrollView>
    </Sheet>
  );
}

/* ---------- Guide ---------- */
export function GuideScreen() {
  const c = useC();
  const G = [
    [tr('Главная', 'Home'), tr('Категории — плитки под диаграммой. Тап по категории или по цветной полосе диаграммы открывает её историю. Кнопки «Расход» и «Доход» открывают ввод в три шага: заметка, сумма, категория.', 'Categories are tiles under the chart. Tap a category or a colored segment to open its history. The Expense and Income buttons open entry in three steps: note, amount, category.')],
    [tr('История', 'History'), tr('Нажмите на сумму баланса в центре диаграммы, чтобы открыть историю. Удерживайте операцию, чтобы выбрать несколько, затем «Перенести» или «Удалить».', 'Tap the balance amount in the center of the chart to open history. Press and hold a transaction to select several, then Move or Delete.')],
    [tr('Период', 'Period'), tr('Кнопка с датой слева вверху: дни, недели, месяцы, годы или свой период «с — по».', 'The date button at the top left: days, weeks, months, years or a custom From–To range.')],
    [tr('Поиск', 'Search'), tr('Лупа справа вверху ищет по всем операциям с первой буквы.', 'The magnifier at the top right searches all transactions from the first letter.')],
    [tr('Импорт', 'Import'), tr('Меню → Импорт данных: загрузите CSV из Monefy, дубликаты пропускаются.', 'Menu → Import data: upload a CSV from Monefy; duplicates are skipped.')],
    [tr('Категории', 'Categories'), tr('Меню → Иконки и категории: добавляйте, меняйте и удаляйте категории.', 'Menu → Icons & categories: add, edit or delete categories.')],
    [tr('Настройки', 'Settings'), tr('Тема, язык, валюта, начало недели и месяца, пароль и Face ID, экспорт и резервные копии.', 'Theme, language, currency, week and month start, passcode and Face ID, export and backups.')],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }}>
      {G.map(([a, b]) => <View key={a} style={{ backgroundColor: c.card, borderRadius: 16, padding: 14 }}><Text style={{ color: c.ink, fontWeight: '600', marginBottom: 4 }}>{a}</Text><Text style={{ color: c.mute, fontSize: 14 }}>{b}</Text></View>)}
    </ScrollView>
  );
}
