import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Sheet, Dot, useC, DateField } from './ui';
import { tr, getLang } from './i18n';
import { RED, GREEN, uid, todayS, parseAmount } from './lib';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export default function AddWizard({ init, cats, cur, onSave, onClose }) {
  const c = useC();
  const [t, setT] = useState(init.t), [step, setStep] = useState(1), [top, setTop] = useState(1);
  const [n, setN] = useState(''), [a, setA] = useState(''), [d, setD] = useState(todayS());
  const [cat, setCat] = useState(init.c || cats[init.t][0].n);
  const col = t === 'exp' ? RED : GREEN, val = parseAmount(a), ok = val > 0;
  const sep = getLang() === 'en' ? '.' : ',';
  const shown = (a || '0').replace('.', sep);
  const go = (s) => { setStep(s); setTop((x) => Math.max(x, s)); };
  const pickT = (x) => { setT(x); setCat(cats[x].some((k) => k.n === cat) ? cat : cats[x][0].n); };

  // Only digits and one decimal separator, max 2 decimals
  const key = (k) => setA((s) => {
    if (k === '⌫') return s.slice(0, -1);
    if (k === '.') return s.includes('.') ? s : (s === '' ? '0.' : s + '.');
    if (s.replace('.', '').length >= 10) return s;
    const i = s.indexOf('.'); if (i >= 0 && s.length - i > 2) return s;
    return s === '0' ? k : s + k;
  });

  const Btn = ({ onPress, children, bg, fg = '#fff', disabled, flex }) => (
    <Pressable disabled={disabled} onPress={onPress} style={{ flex, backgroundColor: bg, borderRadius: 16, paddingVertical: 14, alignItems: 'center', opacity: disabled ? 0.4 : 1, borderWidth: bg ? 0 : 1, borderColor: c.line }}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{children}</Text>
    </Pressable>
  );
  const Nav = (back, backL, next, nextL, dis) => (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
      {back && <Btn flex={1} fg={c.ink} onPress={back}>‹ {backL}</Btn>}
      <Btn flex={2} bg={col} disabled={dis} onPress={next}>{nextL}</Btn>
    </View>
  );
  const steps = [[1, tr('Заметка', 'Note')], [2, tr('Сумма', 'Amount')], [3, tr('Категория', 'Category')]];

  return (
    <Sheet onClose={onClose}>
      <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: 16, padding: 4, gap: 4, marginBottom: 12 }}>
        {[['exp', tr('Расход', 'Expense'), RED], ['inc', tr('Доход', 'Income'), GREEN]].map(([k, l, cl]) => (
          <Pressable key={k} onPress={() => pickT(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: t === k ? cl : 'transparent' }}>
            <Text style={{ fontWeight: '600', color: t === k ? '#fff' : c.mute }}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {steps.map(([s, l]) => (
          <Pressable key={s} disabled={s > top} onPress={() => go(s)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, opacity: s > top ? 0.4 : 1, backgroundColor: step === s ? col : c.bg }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: step === s ? '#fff' : c.mute }}>{s}. {l}</Text>
          </Pressable>
        ))}
      </View>

      {step === 1 && (
        <View>
          <TextInput autoFocus value={n} onChangeText={setN} placeholder={tr('За что платим? (необязательно)', 'What is it for? (optional)')} placeholderTextColor={c.mute}
            style={{ color: c.ink, fontSize: 18, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg }} />
          <View style={{ marginTop: 12 }}><DateField value={d} onChange={setD} label={tr('Дата', 'Date')} /></View>
          {Nav(null, '', () => go(2), n.trim() ? tr('Далее', 'Next') : tr('Пропустить', 'Skip'), false)}
        </View>
      )}

      {step === 2 && (
        <View>
          <Text numberOfLines={1} style={{ textAlign: 'center', color: c.mute, fontSize: 14 }}>{n.trim() || ' '}</Text>
          <Text style={{ textAlign: 'center', color: col, fontSize: 48, fontWeight: '700', paddingVertical: 8 }}>
            {shown} <Text style={{ fontSize: 24, color: c.mute }}>{cur}</Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KEYS.map((k) => (
              <Pressable key={k} onPress={() => key(k)} style={({ pressed }) => ({ width: '31.5%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: c.bg, opacity: pressed ? 0.5 : 1 })}>
                <Text style={{ color: c.ink, fontSize: 24, fontWeight: '500' }}>{k === '.' ? sep : k}</Text>
              </Pressable>
            ))}
          </View>
          {Nav(() => go(1), tr('Заметка', 'Note'), () => go(3), tr('Далее', 'Next'), !ok)}
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={{ textAlign: 'center', color: col, fontSize: 30, fontWeight: '700' }}>{t === 'exp' ? '−' : '+'}{shown} {cur}</Text>
          {!!n.trim() && <Text numberOfLines={1} style={{ textAlign: 'center', color: c.mute, marginBottom: 4 }}>{n.trim()}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {cats[t].map((k) => (
              <Pressable key={k.n} onPress={() => setCat(k.n)} style={{ width: '23%', alignItems: 'center', gap: 4, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: cat === k.n ? k.c : 'transparent', backgroundColor: cat === k.n ? k.c + '1f' : 'transparent' }}>
                <Dot c={k.c} e={k.e} s={36} />
                <Text numberOfLines={1} style={{ color: c.ink, fontSize: 11 }}>{k.n}</Text>
              </Pressable>
            ))}
          </View>
          {Nav(() => go(2), tr('Сумма', 'Amount'), () => onSave({ id: uid(), t, a: val, c: cat, d, n: n.trim() }), tr('Сохранить', 'Save'), !ok)}
        </View>
      )}
    </Sheet>
  );
}
