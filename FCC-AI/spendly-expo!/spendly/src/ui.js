import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, Animated, StyleSheet, KeyboardAvoidingView, Keyboard, PanResponder, Platform, useColorScheme } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RED, GREEN, BLUE, ds, parseD, todayS, catOf } from './lib';
import { tr, loc } from './i18n';

let THEME = 'auto';
export const setTheme = (t) => { THEME = t; };
export const useC = () => {
  const sys = useColorScheme();
  const dark = THEME === 'auto' ? sys === 'dark' : THEME === 'dark';
  return dark
    ? { bg: '#0b0d12', card: '#161a22', ink: '#f3f4f6', mute: '#9ca3af', line: '#262b36', dark }
    : { bg: '#f2f3f6', card: '#ffffff', ink: '#12151c', mute: '#6b7280', line: '#e4e6ec', dark };
};

export const Dot = ({ c, e, s = 40 }) => (
  <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: c + '2e', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: s * 0.5 }}>{e}</Text>
  </View>
);

export function Btn({ onPress, children, bg, fg, disabled, flex, outline }) {
  const c = useC();
  const color = outline ? fg || c.ink : fg || '#fff';
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ flex, backgroundColor: outline ? 'transparent' : bg, borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: disabled ? 0.4 : 1, borderWidth: outline ? 1 : 0, borderColor: c.line }}>
      <Text style={{ color, fontWeight: '600', fontSize: 15 }}>{children}</Text>
    </Pressable>
  );
}

export function Seg({ opts, val, on, color = BLUE }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: 16, padding: 4, gap: 4 }}>
      {opts.map(([k, l]) => (
        <Pressable key={String(k)} onPress={() => on(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: val === k ? color : 'transparent' }}>
          <Text style={{ fontWeight: '600', fontSize: 13, color: val === k ? '#fff' : c.mute }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* Props for ScrollViews inside sheets: dismiss keyboard on drag, close the sheet by pulling down at the top. */
export const pullProps = (onClose) => ({
  keyboardDismissMode: 'on-drag', alwaysBounceVertical: true,
  onScrollEndDrag: (e) => { if (e.nativeEvent.contentOffset.y < -70) onClose(); },
});

/* Bottom sheet: lifted above the keyboard, swipe the handle down to close (also hides the keyboard). */
export function Sheet({ onClose, children }) {
  const c = useC(), ins = useSafeAreaInsets();
  // eslint-disable-next-line react-hooks/refs
  const y = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line react-hooks/refs
  const closeRef = useRef(onClose); closeRef.current = onClose;
  // eslint-disable-next-line react-hooks/refs
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, g) => { if (g.dy > 8) Keyboard.dismiss(); y.setValue(Math.max(0, g.dy)); },
    onPanResponderRelease: (e, g) => { if (g.dy > 90 || g.vy > 0.8) closeRef.current(); else Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: y }], backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: ins.bottom + 20, maxHeight: '92%' }}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 14 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.line }} />
          </View>
          <View style={{ paddingHorizontal: 20 }}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* Side drawer: left by default, right with `right`. */
export function Drawer({ onClose, right, children }) {
  const c = useC(), ins = useSafeAreaInsets();
  // eslint-disable-next-line react-hooks/refs
  const x = useRef(new Animated.Value(right ? 300 : -300)).current;
  useEffect(() => { Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }).start(); }, [x]);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: right ? 'flex-end' : 'flex-start', backgroundColor: '#0006' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={{ width: 290, backgroundColor: c.card, paddingTop: ins.top + 12, paddingBottom: ins.bottom + 12, paddingHorizontal: 12, transform: [{ translateX: x }] }}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/* Date field: native picker, future dates disabled. */
export function DateField({ value, onChange, label }) {
  const c = useC(), [open, setOpen] = useState(false), ios = Platform.OS === 'ios';
  const onCh = (e, d) => { if (!ios) setOpen(false); if (d && e.type !== 'dismissed') onChange(ds(d)); };
  const txt = parseD(value).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' });
  const dt = <DateTimePicker value={parseD(value)} mode="date" display={ios ? 'inline' : 'default'} maximumDate={parseD(todayS())} onChange={onCh} locale={loc()} themeVariant={c.dark ? 'dark' : 'light'} accentColor={BLUE} />;
  const picker = ios ? <View style={{ borderRadius: 16, backgroundColor: c.bg, padding: 6, marginBottom: 12 }}>{dt}</View> : dt;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: c.bg }}>
        <Text style={{ color: c.mute }}>{label}</Text>
        <Text style={{ color: c.ink, fontWeight: '600' }}>{txt}</Text>
      </Pressable>
      {open && ios && <Sheet onClose={() => setOpen(false)}>{picker}<Btn bg={BLUE} onPress={() => setOpen(false)}>{tr('Готово', 'Done')}</Btn></Sheet>}
      {open && !ios && picker}
    </>
  );
}

export function TxRow({ t, cats, money, selMode, on, onPress, onLongPress }) {
  const c = useC(), k = catOf(cats, t.t, t.c);
  return (
    <Pressable delayLongPress={450} onLongPress={onLongPress} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: on ? c.line : c.card, borderBottomWidth: 1, borderBottomColor: c.line }}>
      {selMode && (
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? BLUE : c.mute, backgroundColor: on ? BLUE : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {on && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
        </View>
      )}
      <Dot c={k.c} e={k.e} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: c.ink, fontWeight: '500', fontSize: 16 }}>{t.c}</Text>
        {!!t.n && <Text numberOfLines={1} style={{ color: c.mute, fontSize: 12 }}>{t.n}</Text>}
      </View>
      <Text style={{ color: t.t === 'exp' ? RED : GREEN, fontWeight: '600' }}>{t.t === 'exp' ? '−' : '+'}{money(t.a)}</Text>
    </Pressable>
  );
}

/* Donut chart: balance in the center, tap a colored segment to open that category's history. */
export function Donut({ data, total, inc, exp, money, fmt, onOpen, onSlice }) {
  const c = useC();
  const R = 84, C = 2 * Math.PI * R; const bal = inc - exp;
  const tap = (e) => {
    if (!onSlice || !data.length) return;
    const dx = e.nativeEvent.locationX - 130, dy = e.nativeEvent.locationY - 130;
    const r = (Math.hypot(dx, dy) * 200) / 260;
    if (r < 64 || r > 106) return;
    let a = Math.atan2(dx, -dy); if (a < 0) a += 2 * Math.PI;
    const f = (a / (2 * Math.PI)) * total; let sum = 0;
    for (const d of data) { sum += d.v; if (f <= sum) { onSlice(d.n); return; } }
  };
  const segments = useMemo(() => {
    return data.reduce((acc, d) => {
      const len = (d.v / total) * C;
      acc.push({ ...d, len, offset: -acc.reduce((s, x) => s + x.len, 0) });
      return acc;
    }, []);
  }, [data, total, C]);
  return (
    <View style={{ width: 260, height: 260, alignSelf: 'center' }}>
      <Pressable onPress={tap}>
        <Svg width={260} height={260} viewBox="0 0 200 200">
          <G rotation="-90" origin="100, 100">
            <Circle cx="100" cy="100" r={R} fill="none" stroke={c.line} strokeWidth="22" />
            {segments.map((d) => (
              <Circle key={d.n} cx="100" cy="100" r={R} fill="none" stroke={d.c} strokeWidth="22"
                strokeDasharray={`${Math.max(d.len - (data.length > 1 ? 2 : 0), 0.5)} ${C}`}
                strokeDashoffset={d.offset} />
            ))}
          </G>
        </Svg>
      </Pressable>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <Text style={{ color: c.mute, fontSize: 12 }}>{tr('Баланс', 'Balance')}</Text>
        <Pressable onPress={onOpen} hitSlop={8}>
          <Text style={{ color: bal < 0 ? RED : c.ink, fontSize: 24, fontWeight: '700' }}>{bal < 0 ? '−' : ''}{money(Math.abs(bal))}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={{ color: GREEN, fontSize: 12, fontWeight: '600' }}>+{fmt(inc)}</Text>
          <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>−{fmt(exp)}</Text>
        </View>
        <Pressable onPress={onOpen} hitSlop={12}>
          <Text style={{ color: BLUE, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{tr('история', 'history')} ›</Text>
        </Pressable>
      </View>
    </View>
  );
}
