import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, SectionList, StatusBar, AppState, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useC, setTheme, Dot, Donut, Sheet, Drawer, Seg, Btn, DateField, TxRow, pullProps } from './src/ui';
import AddWizard from './src/AddWizard';
import { Settings, CatsScreen, SearchScreen, GuideScreen, Lock, EditSheet, NoteSheet } from './src/Screens';
import { tr, setLang } from './src/i18n';
import * as L from './src/lib';

const { RED, GREEN, BLUE } = L;

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

/* Swipe from the left edge to go back (like iOS). */
function SwipeBack({ enabled, onBack, children }) {
  const c = useC(), W = Dimensions.get('window').width;
  const x = useRef(new Animated.Value(0)).current;
  const ref = useRef({}); ref.current = { enabled, onBack };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => ref.current.enabled && g.x0 < 30 && g.dx > 12 && Math.abs(g.dy) < Math.abs(g.dx) * 0.6,
    onPanResponderMove: (e, g) => x.setValue(Math.max(0, g.dx)),
    onPanResponderRelease: (e, g) => {
      if (g.dx > 110 || g.vx > 0.6) Animated.timing(x, { toValue: W, duration: 160, useNativeDriver: true }).start(() => { ref.current.onBack(); x.setValue(0); });
      else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  return <Animated.View style={{ flex: 1, backgroundColor: c.bg, transform: [{ translateX: x }] }} {...pan.panHandlers}>{children}</Animated.View>;
}

function PeriodDrawer({ per, setPer, set, earliest, onClose }) {
  const c = useC(), today = L.todayS();
  const [rf, setRf] = useState(per.mode === 'all' ? today : per.from), [rt, setRt] = useState(per.to < today ? per.to : today);
  const modes = [['day', tr('Дни', 'Days')], ['week', tr('Недели', 'Weeks')], ['month', tr('Месяцы', 'Months')], ['year', tr('Годы', 'Years')]];
  const lm = per.mode === 'range' || per.mode === 'all' ? 'month' : per.mode;
  return (
    <Drawer onClose={onClose}>
      <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 }}>{tr('Период', 'Period')}</Text>
      <Seg opts={modes} val={per.mode} on={(m) => setPer(L.periodFor(m, per.mode === 'range' ? per.to : per.mode === 'all' ? today : per.from, set))} />
      <Pressable onPress={() => { setPer({ mode: 'all', from: '0000-01-01', to: '9999-12-31' }); onClose(); }} style={{ marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: per.mode === 'all' ? BLUE : c.bg }}>
        <Text style={{ textAlign: 'center', fontWeight: '600', color: per.mode === 'all' ? '#fff' : c.ink }}>{tr('За всё время', 'All time')}</Text>
      </Pressable>
      <View style={{ marginTop: 12, padding: 10, borderRadius: 16, backgroundColor: c.bg, gap: 8, borderWidth: per.mode === 'range' ? 2 : 0, borderColor: BLUE }}>
        <Text style={{ color: c.ink, fontWeight: '600' }}>{tr('Свой период', 'Custom range')}</Text>
        <DateField label={tr('С', 'From')} value={rf} onChange={setRf} />
        <DateField label={tr('По', 'To')} value={rt} onChange={setRt} />
        <Btn bg={BLUE} disabled={rf > rt} onPress={() => { setPer({ mode: 'range', from: rf, to: rt }); onClose(); }}>{tr('Показать', 'Apply')}</Btn>
      </View>
      <ScrollView style={{ marginTop: 8 }}>
        {L.pList(lm, earliest, set).map((q, i) => (
          <Pressable key={q.from} onPress={() => { setPer(q); onClose(); }} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Text style={{ color: q.from === per.from && per.mode !== 'range' ? BLUE : c.ink, fontWeight: q.from === per.from && per.mode !== 'range' ? '700' : '400', textTransform: 'capitalize' }}>{L.pLabel(q, set)}</Text>
            {i === 0 && <Text style={{ color: c.mute, fontSize: 12 }}>{tr('сейчас', 'now')}</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </Drawer>
  );
}

function Main() {
  const ins = useSafeAreaInsets();
  const [db, setDb] = useState(null);
  setTheme(db ? db.set.theme : 'auto');
  const c = useC();
  const [per, setPer] = useState(() => L.periodFor('month', L.todayS(), L.DSET));
  const [screen, setScreen] = useState('home'), [locked, setLocked] = useState(false);
  const [menu, setMenu] = useState(false), [perOpen, setPerOpen] = useState(false);
  const [add, setAdd] = useState(null), [sel, setSel] = useState(null), [move, setMove] = useState(false);
  const [toast, setToast] = useState(null), [imp, setImp] = useState(null);
  const [cf, setCf] = useState(null), [edit, setEdit] = useState(null), [hk, setHk] = useState(null), [noteSel, setNoteSel] = useState(false);
  const dbRef = useRef(null); dbRef.current = db;

  useEffect(() => { L.loadDb().then((d) => { setDb(d); setPer(L.periodFor('month', L.todayS(), d.set)); if (d.set.pinLen) setLocked(true); }); }, []);
  useEffect(() => { if (db) L.saveDb(db); }, [db]);
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(null), 5000); return () => clearTimeout(x); }, [toast]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'background' && dbRef.current && dbRef.current.set.pinLen) setLocked(true); });
    return () => sub.remove();
  }, []);

  const set = db ? db.set : L.DSET;
  setLang(set.lang);
  const money = (n) => `${L.fmt(n)} ${set.cur}`;
  const month = useMemo(() => (db ? db.tx.filter((x) => x.d >= per.from && x.d <= per.to).sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id)) : []), [db, per]);
  const inc = month.filter((x) => x.t === 'inc').reduce((s, x) => s + x.a, 0);
  const exp = month.filter((x) => x.t === 'exp').reduce((s, x) => s + x.a, 0);
  const sums = useMemo(() => { const m = {}; month.filter((x) => x.t === 'exp').forEach((x) => { m[x.c] = (m[x.c] || 0) + x.a; }); return m; }, [month]);
  const hist0 = useMemo(() => (cf ? month.filter((x) => x.t === cf.t && x.c === cf.c) : month), [month, cf]);
  const hist = useMemo(() => (hk ? hist0.filter((x) => x.t === hk) : hist0), [hist0, hk]);
  const hInc = hist0.filter((x) => x.t === 'inc').reduce((s, x) => s + x.a, 0), hExp = hist0.filter((x) => x.t === 'exp').reduce((s, x) => s + x.a, 0);
  const sections = useMemo(() => { const g = {}; hist.forEach((x) => (g[x.d] = g[x.d] || []).push(x)); return Object.entries(g).map(([title, data]) => ({ title, data })); }, [hist]);
  const earliest = useMemo(() => (db ? db.tx.reduce((m, x) => (x.d < m ? x.d : m), L.todayS()) : L.todayS()), [db]);

  if (!db) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (locked && set.pinLen) return <Lock set={set} onOk={() => setLocked(false)} />;
  const slices = db.cats.exp.filter((k) => sums[k.n] > 0).map((k) => ({ ...k, v: sums[k.n] }));
  const cfk = cf ? L.catOf(db.cats, cf.t, cf.c) : null;

  const go = (s) => { setScreen(s); setMenu(false); setSel(null); setHk(null); };
  const openHist = () => { setCf(null); go('hist'); };
  const openCat = (n) => { setCf({ t: 'exp', c: n }); go('hist'); };
  const saveEdit = (t) => { setDb({ ...db, tx: db.tx.map((x) => (x.id === t.id ? t : x)) }); setEdit(null); };
  const bulkNote = (ids, note) => withUndo(`${tr('Заметка изменена', 'Note updated', 'Note modifiée')}: ${ids.size}`, { ...db, tx: db.tx.map((x) => (ids.has(x.id) ? { ...x, n: note } : x)) });
  const delEdit = (id) => { withUndo(tr('Операция удалена', 'Transaction deleted'), { ...db, tx: db.tx.filter((x) => x.id !== id) }); setEdit(null); };
  const upd = (p) => { const next = { ...set, ...p }; setDb({ ...db, set: next }); if (('wk' in p || 'md' in p) && per.mode !== 'range' && per.mode !== 'all') setPer(L.periodFor(per.mode, L.todayS(), next)); };
  const withUndo = (msg, next) => { const prev = db; setDb(next); setToast({ msg, undo: () => { setDb(prev); setToast(null); } }); };
  const save = (t) => {
    setDb({ ...db, tx: [t, ...db.tx] }); setAdd(null);
    setPer(per.mode === 'all' ? per : per.mode === 'range' ? (t.d >= per.from && t.d <= per.to ? per : L.periodFor('month', t.d, set)) : L.periodFor(per.mode, t.d, set));
  };
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const del = () => { withUndo(`${tr('Удалено', 'Deleted')}: ${sel.length}`, { ...db, tx: db.tx.filter((x) => !sel.includes(x.id)) }); setSel(null); };
  const pick = (t, name) => {
    const ids = new Set(sel), n = db.tx.filter((x) => ids.has(x.id) && x.t === t).length;
    withUndo(`${tr('Перенесено в', 'Moved to')} «${name}»: ${n}`, { ...db, tx: db.tx.map((x) => (ids.has(x.id) && x.t === t ? { ...x, c: name } : x)) });
    setMove(false);
    const left = sel.filter((id) => { const x = db.tx.find((y) => y.id === id); return x && x.t !== t; });
    setSel(left.length ? left : null);
  };
  const doImport = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (r.canceled) return;
      const res = L.runImport(await (await fetch(r.assets[0].uri)).text(), db);
      if (res.err) setImp({ err: res.err }); else { setDb({ ...db, tx: res.tx, cats: res.cats }); setImp(res); }
    } catch (e) { setImp({ err: tr('Не удалось прочитать файл', 'Could not read the file') }); }
  };

  const periodBtn = (
    <Pressable onPress={() => setPerOpen(true)} style={{ flexShrink: 1, padding: 8 }}>
      <Text numberOfLines={1} style={{ color: c.ink, fontSize: 18, fontWeight: '600', textTransform: 'capitalize' }}>{L.pLabel(per, set)} ▾</Text>
    </Pressable>
  );
  const Back = () => <Pressable onPress={() => go('home')} hitSlop={10} style={{ padding: 8 }}><Text style={{ color: c.ink, fontSize: 28 }}>‹</Text></Pressable>;
  const Top = (title) => <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 }}><Back /><Text style={{ color: c.ink, fontSize: 22, fontWeight: '700' }}>{title}</Text></View>;
  const MI = (e, l, s) => <Pressable onPress={() => go(s)} style={{ padding: 14 }}><Text style={{ color: c.ink, fontSize: 16 }}>{e}  {l}</Text></Pressable>;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top }}>
      <StatusBar barStyle={c.dark ? 'light-content' : 'dark-content'} />

      <SwipeBack enabled={screen !== 'home'} onBack={() => go('home')}>
      {screen === 'home' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8 }}>
            {periodBtn}
            <View style={{ flexDirection: 'row' }}>
              <Pressable onPress={() => go('search')} hitSlop={8} style={{ padding: 8 }}><Text style={{ fontSize: 22 }}>🔍</Text></Pressable>
              <Pressable onPress={() => setMenu(true)} hitSlop={8} style={{ padding: 8 }}><Text style={{ color: c.ink, fontSize: 26 }}>☰</Text></Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
            <Donut data={slices} total={exp || 1} inc={inc} exp={exp} money={money} fmt={L.fmt} onOpen={openHist} onSlice={openCat} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 }}>
              {db.cats.exp.map((k) => (
                <Pressable key={k.n} onPress={() => openCat(k.n)} style={{ width: '31.5%', alignItems: 'center', gap: 4, padding: 12, borderRadius: 16, backgroundColor: c.card }}>
                  <Dot c={k.c} e={k.e} s={44} />
                  <Text numberOfLines={1} style={{ color: c.mute, fontSize: 12 }}>{k.n}</Text>
                  <Text style={{ color: sums[k.n] ? k.c : c.mute, opacity: sums[k.n] ? 1 : 0.5, fontWeight: '600', fontSize: 14 }}>{L.fmt(sums[k.n] || 0)}</Text>
                </Pressable>
              ))}
            </View>
            </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: ins.bottom + 12 }}>
            {[['exp', `−  ${tr('Расход', 'Expense')}`, RED], ['inc', `+  ${tr('Доход', 'Income')}`, GREEN]].map(([t, l, bg]) => (
              <Pressable key={t} onPress={() => setAdd({ t })} style={({ pressed }) => ({ flex: 1, backgroundColor: bg, borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {screen === 'hist' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}><Back />{periodBtn}</View>
            {sel ? (
              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={() => setSel(sel.length === hist.length ? [] : hist.map((x) => x.id))} style={{ padding: 8 }}><Text style={{ color: BLUE, fontWeight: '600' }}>{tr('Все', 'All')}</Text></Pressable>
                <Pressable onPress={() => setSel(null)} style={{ padding: 8 }}><Text style={{ color: BLUE, fontWeight: '600' }}>{tr('Отмена', 'Cancel')}</Text></Pressable>
              </View>
            ) : <Pressable onPress={() => setSel([])} style={{ padding: 8 }}><Text style={{ color: BLUE, fontWeight: '600' }}>{tr('Выбрать', 'Select')}</Text></Pressable>}
          </View>
          {cf && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 14, backgroundColor: c.card }}>
              <Dot c={cfk.c} e={cfk.e} s={32} />
              <Text numberOfLines={1} style={{ flex: 1, color: c.ink, fontWeight: '600' }}>{cf.c}</Text>
              <Pressable onPress={() => setAdd({ t: cf.t, c: cf.c })} hitSlop={8}><Text style={{ color: BLUE, fontWeight: '700' }}>＋ {tr('Добавить', 'Add')}</Text></Pressable>
              <Pressable onPress={() => setCf(null)} hitSlop={8}><Text style={{ color: c.mute, fontSize: 18 }}>✕</Text></Pressable>
            </View>
          )}
          {!!hist0.length && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 20, paddingBottom: 8 }}>
              <Pressable onPress={() => setHk(hk === 'inc' ? null : 'inc')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: GREEN, backgroundColor: hk === 'inc' ? GREEN : 'transparent' }}><Text style={{ color: hk === 'inc' ? '#fff' : GREEN, fontWeight: '700' }}>{tr('Доход', 'Income')}: +{money(hInc)}</Text></Pressable>
              <Pressable onPress={() => setHk(hk === 'exp' ? null : 'exp')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: RED, backgroundColor: hk === 'exp' ? RED : 'transparent' }}><Text style={{ color: hk === 'exp' ? '#fff' : RED, fontWeight: '700' }}>{tr('Расход', 'Expense')}: −{money(hExp)}</Text></Pressable>
            </View>
          )}
          {!hist.length ? (
            <Text style={{ color: c.mute, textAlign: 'center', padding: 40, marginTop: 40 }}>{tr('За этот период операций нет. Добавьте расход или импортируйте историю из Monefy.', 'No transactions in this period. Add one or import your Monefy history.')}</Text>
          ) : (
            <SectionList sections={sections} keyExtractor={(x) => x.id} extraData={sel} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingBottom: 100 }}
              renderSectionHeader={({ section }) => <Text style={{ color: c.mute, fontSize: 13, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, textTransform: 'capitalize' }}>{L.dayLabel(section.title)}</Text>}
              renderItem={({ item: t }) => (
                <TxRow t={t} cats={db.cats} money={money} selMode={!!sel} on={!!sel && sel.includes(t.id)}
                  onLongPress={() => !sel && setSel([t.id])} onPress={() => (sel ? toggle(t.id) : setEdit(t))} />
              )} />
          )}
          {sel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: ins.bottom + 12, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ flex: 1, color: c.ink }}><Text style={{ fontWeight: '700' }}>{sel.length}</Text> {tr('выбрано', 'selected')}</Text>
              <Pressable disabled={!sel.length} onPress={() => setMove(true)} style={{ backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, opacity: sel.length ? 1 : 0.4 }}><Text style={{ color: '#fff', fontWeight: '600' }}>{tr('Перенести', 'Move')}</Text></Pressable>
              {set.bulkNote && <Pressable disabled={!sel.length} onPress={() => setNoteSel(true)} style={{ backgroundColor: c.mute, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, opacity: sel.length ? 1 : 0.4 }}><Text style={{ color: '#fff', fontWeight: '600' }}>✎</Text></Pressable>}
              <Pressable disabled={!sel.length} onPress={del} style={{ backgroundColor: RED, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, opacity: sel.length ? 1 : 0.4 }}><Text style={{ color: '#fff', fontWeight: '600' }}>{tr('Удалить', 'Delete')}</Text></Pressable>
            </View>
          )}
        </>
      )}

      {screen === 'search' && <>{Top(tr('Поиск', 'Search'))}<SearchScreen db={db} money={money} per={per} onOpen={setEdit} /></>}
      {screen === 'cats' && <>{Top(tr('Иконки и категории', 'Icons & categories'))}<CatsScreen db={db} setDb={setDb} /></>}
      {screen === 'guide' && <>{Top(tr('Руководство', 'Guide'))}<GuideScreen /></>}
      {screen === 'set' && <>{Top(tr('Настройки', 'Settings'))}<Settings db={db} setDb={setDb} upd={upd} /></>}
      {screen === 'imp' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {Top(tr('Импорт данных', 'Import data'))}
          <View style={{ padding: 20, gap: 16 }}>
            <Text style={{ color: c.mute, fontSize: 14 }}>{tr('В Monefy откройте настройки и выберите экспорт в CSV, затем выберите файл здесь. Расходы определяются по минусу в сумме, неизвестные категории создаются автоматически, дубликаты пропускаются.', 'In Monefy open settings and export to CSV, then choose the file here. Negative amounts are expenses, unknown categories are created automatically, duplicates are skipped.')}</Text>
            <Pressable onPress={doImport} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: c.line, backgroundColor: c.card, borderRadius: 24, padding: 32, alignItems: 'center' }}>
              <Text style={{ color: c.ink, fontWeight: '600', fontSize: 16 }}>{tr('Выбрать CSV-файл', 'Choose CSV file')}</Text>
            </Pressable>
            {imp && (imp.err
              ? <Text style={{ color: RED, backgroundColor: RED + '22', padding: 16, borderRadius: 16 }}>{imp.err}</Text>
              : <Text style={{ color: c.ink, backgroundColor: GREEN + '22', padding: 16, borderRadius: 16 }}>{tr('Добавлено', 'Added')}: {imp.added}. {tr('Дубликатов пропущено', 'Duplicates skipped')}: {imp.dup}. {tr('Строк с ошибками', 'Rows with errors')}: {imp.bad}.</Text>)}
          </View>
        </ScrollView>
      )}

      </SwipeBack>

      {toast && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: ins.bottom + 90, backgroundColor: c.ink, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: c.bg, flexShrink: 1 }}>{toast.msg}</Text>
          <Pressable onPress={toast.undo}><Text style={{ color: c.bg, fontWeight: '700', textDecorationLine: 'underline' }}>{tr('Отменить', 'Undo')}</Text></Pressable>
        </View>
      )}

      {perOpen && <PeriodDrawer per={per} setPer={setPer} set={set} earliest={earliest} onClose={() => setPerOpen(false)} />}
      {menu && (
        <Drawer right onClose={() => setMenu(false)}>
          <Text style={{ color: c.ink, fontSize: 22, fontWeight: '700', marginBottom: 12, paddingHorizontal: 8 }}>Spendly</Text>
          {MI('📥', tr('Импорт данных', 'Import data'), 'imp')}
          {MI('🎨', tr('Иконки и категории', 'Icons & categories'), 'cats')}
          {MI('📖', tr('Руководство', 'Guide'), 'guide')}
          {MI('⚙️', tr('Настройки', 'Settings'), 'set')}
        </Drawer>
      )}
      {edit && <EditSheet key={edit.id} t={edit} cats={db.cats} cur={set.cur} onSave={saveEdit} onDelete={delEdit} onClose={() => setEdit(null)} />}
      {noteSel && sel && <NoteSheet count={sel.length} initial="" onClose={() => setNoteSel(false)} onApply={(v) => { bulkNote(new Set(sel), v); setNoteSel(false); setSel(null); }} />}
      {add && <AddWizard init={add} cats={db.cats} cur={set.cur} onSave={save} onClose={() => setAdd(null)} />}
      {move && (
        <Sheet onClose={() => setMove(false)}>
          <Text style={{ color: c.ink, fontSize: 18, fontWeight: '600' }}>{tr('Перенести в категорию', 'Move to category')}</Text>
          <Text style={{ color: c.mute, marginBottom: 12 }}>{tr('Выбрано операций', 'Selected')}: {sel ? sel.length : 0}</Text>
          <ScrollView {...pullProps(() => setMove(false))}>
            {['exp', 'inc'].filter((t) => db.tx.some((x) => sel && sel.includes(x.id) && x.t === t)).map((t) => (
              <View key={t} style={{ marginBottom: 12 }}>
                <Text style={{ color: t === 'exp' ? RED : GREEN, fontWeight: '600', marginBottom: 8 }}>{t === 'exp' ? tr('Расходы', 'Expenses') : tr('Доходы', 'Income')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {db.cats[t].map((k) => (
                    <Pressable key={k.n} onPress={() => pick(t, k.n)} style={{ width: '23%', alignItems: 'center', gap: 4, padding: 8 }}>
                      <Dot c={k.c} e={k.e} s={36} />
                      <Text numberOfLines={1} style={{ color: c.ink, fontSize: 11 }}>{k.n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Sheet>
      )}
    </View>
  );
}
