import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from './src/services/supabase';
import {
  signIn,
  signUp,
  signOut,
  fetchProfile,
  fetchHubs,
  fetchSessions,
  fetchCheckIns,
  registerSession,
  resolveCheckIn,
  type PractitionerProfile,
  type SessionRegister,
  type CheckInLog,
  type HubRow,
} from './src/services/supabaseData';

type Tab = 'sessions' | 'checkins' | 'hub' | 'profile';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string>('');

  // Restore persisted Supabase session on launch.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user;
      if (u) {
        setSessionUserId(u.id);
        setSessionEmail(u.email ?? '');
      }
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setSessionUserId(u?.id ?? null);
      setSessionEmail(u?.email ?? '');
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (booting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0B5FFF" />
        <Text style={styles.muted}>Loading…</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return sessionUserId ? (
    <Dashboard authId={sessionUserId} email={sessionEmail} />
  ) : (
    <LoginScreen />
  );
}

/* ------------------------------ Login ------------------------------ */

function LoginScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'up') {
        await signUp(email, password, name.trim() || 'Practitioner');
      } else {
        await signIn(email, password);
      }
      // Auth state listener swaps to the dashboard automatically.
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.loginWrap}>
          <Text style={styles.logo}>E-Literacy</Text>
          <Text style={styles.logoSub}>Practitioner App</Text>

          <Text style={styles.h1}>{mode === 'in' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.muted}>Sign in with your email and password.</Text>

          {mode === 'up' && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'in' ? 'Sign in' : 'Sign up'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setError(null); setMode(mode === 'in' ? 'up' : 'in'); }}>
            <Text style={styles.link}>
              {mode === 'in' ? 'New practitioner? Create an account' : 'Already registered? Sign in'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

/* ---------------------------- Dashboard ---------------------------- */

function Dashboard({ authId, email }: { authId: string; email: string }) {
  const [tab, setTab] = useState<Tab>('sessions');
  const [profile, setProfile] = useState<PractitionerProfile | null>(null);
  const [hubs, setHubs] = useState<HubRow[]>([]);
  const [sessions, setSessions] = useState<SessionRegister[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const prof = await fetchProfile(authId, email);
      setProfile(prof);
      const [hubRows, sess, ci] = await Promise.all([
        fetchHubs(),
        prof ? fetchSessions(prof.id) : Promise.resolve([]),
        prof ? fetchCheckIns(prof.id) : Promise.resolve([]),
      ]);
      setHubs(hubRows);
      setSessions(sess);
      setCheckIns(ci);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Could not reach Supabase. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [authId, email]);

  useEffect(() => {
    load();
  }, [load]);

  const presentToday = useMemo(
    () => sessions.filter((s) => s.session_date === new Date().toISOString().slice(0, 10)).reduce((n, s) => n + s.attendees.filter((a) => a.present).length, 0),
    [sessions],
  );

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hi, {(profile?.name ?? 'Practitioner').split(' ')[0]} 👋</Text>
          <Text style={styles.headerSub}>{profile?.organization ?? email}</Text>
        </View>
        <Pressable onPress={() => signOut()} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['sessions', 'checkins', 'hub', 'profile'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'sessions' ? 'Sessions' : t === 'checkins' ? 'Check-ins' : t === 'hub' ? 'Hubs' : 'Me'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#0B5FFF" /></View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{loadError}</Text>
          <Pressable style={styles.primaryBtn} onPress={load}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {tab === 'sessions' && (
            <>
              <StatCard label="Registered sessions" value={String(sessions.length)} />
              <StatCard label="Present today" value={String(presentToday)} />
              {sessions.length === 0 && <Empty text="No sessions yet. Register one from the Hubs tab." />}
              {sessions.map((s) => (
                <Card key={s.id}>
                  <Text style={styles.cardTitle}>{s.session_date}</Text>
                  <Text style={styles.muted}>
                    {hubs.find((h) => h.id === s.hub_id)?.name ?? s.hub_id} · {s.attendees.length} attendee(s)
                  </Text>
                  {!!s.notes && <Text style={styles.notes}>{s.notes}</Text>}
                </Card>
              ))}
            </>
          )}

          {tab === 'checkins' && (
            <>
              {checkIns.length === 0 && <Empty text="No learner check-ins logged." />}
              {checkIns.map((c) => (
                <Card key={c.id}>
                  <Text style={styles.cardTitle}>
                    {c.occurred_on} {c.resolved ? '· resolved' : ''}
                  </Text>
                  <Text style={styles.muted}>{(c.reasons ?? []).join(', ') || 'General check-in'}</Text>
                  {!!c.notes && <Text style={styles.notes}>{c.notes}</Text>}
                  {!c.resolved && (
                    <Pressable
                      style={styles.smallBtn}
                      onPress={async () => {
                        await resolveCheckIn(c.id);
                        setCheckIns((prev) => prev.map((p) => (p.id === c.id ? { ...p, resolved: true } : p)));
                      }}
                    >
                      <Text style={styles.smallBtnText}>Mark resolved</Text>
                    </Pressable>
                  )}
                </Card>
              ))}
            </>
          )}

          {tab === 'hub' && (
            <>
              {hubs.length === 0 && <Empty text="No active hubs found in Supabase." />}
              {hubs.map((h) => (
                <Card key={h.id}>
                  <Text style={styles.cardTitle}>{h.name}</Text>
                  <Text style={styles.muted}>
                    {[h.town, h.province].filter(Boolean).join(', ')}
                  </Text>
                  <QuickRegister hub={h} profile={profile} onDone={load} />
                </Card>
              ))}
            </>
          )}

          {tab === 'profile' && (
            <Card>
              <Row k="Name" v={profile?.name ?? '—'} />
              <Row k="Email" v={profile?.email ?? email} />
              <Row k="Role" v={profile?.role ?? 'practitioner'} />
              <Row k="Province" v={profile?.province ?? '—'} />
              <Row k="Certification" v={profile?.certification ?? '—'} />
              <Row k="Verification" v={profile?.verification_status ?? 'pending'} />
            </Card>
          )}
        </ScrollView>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function QuickRegister({ hub, profile, onDone }: { hub: HubRow; profile: PractitionerProfile | null; onDone: () => void }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!profile?.hub_id && !hub) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <TextInput
        style={styles.input}
        placeholder="Session notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Pressable
        style={[styles.smallBtn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg(null);
          try {
            await registerSession({
              hub_id: hub.id,
              practitioner_id: profile!.id,
              session_date: new Date().toISOString().slice(0, 10),
              notes: notes || undefined,
              attendees: [],
            });
            setMsg('Session registered ✓');
            setNotes('');
            onDone();
          } catch (e: any) {
            setMsg(e?.message ?? 'Failed to register session');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text style={styles.smallBtnText}>{busy ? 'Saving…' : 'Register today’s session'}</Text>
      </Pressable>
      {!!msg && <Text style={styles.muted}>{msg}</Text>}
    </View>
  );
}

/* ------------------------------ Bits ------------------------------ */

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.muted}>{label}</Text>
  </View>
);
const Card = ({ children }: { children: React.ReactNode }) => <View style={styles.card}>{children}</View>;
const Empty = ({ text }: { text: string }) => <Text style={[styles.muted, { textAlign: 'center', marginVertical: 24 }]}>{text}</Text>;
const Row = ({ k, v }: { k: string; v: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowK}>{k}</Text>
    <Text style={styles.rowV}>{v}</Text>
  </View>
);

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F6F7FB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F6F7FB' },
  loginWrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 28, fontWeight: '800', color: '#0B5FFF', textAlign: 'center' },
  logoSub: { fontSize: 14, color: '#5A6272', textAlign: 'center', marginBottom: 32 },
  h1: { fontSize: 22, fontWeight: '700', color: '#14181F' },
  muted: { color: '#5A6272', marginTop: 4 },
  error: { color: '#C62828', marginTop: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE2EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    fontSize: 16,
    color: '#14181F',
  },
  primaryBtn: {
    backgroundColor: '#0B5FFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#0B5FFF', textAlign: 'center', marginTop: 18, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#14181F' },
  headerSub: { color: '#5A6272', marginTop: 2 },
  signOut: { paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: { color: '#C62828', fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E4E8F0' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#0B5FFF' },
  tabText: { color: '#5A6272', fontWeight: '600' },
  tabTextActive: { color: '#0B5FFF' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E4E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#14181F' },
  notes: { marginTop: 8, color: '#14181F' },
  stat: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E4E8F0' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#0B5FFF' },
  smallBtn: {
    backgroundColor: '#EAF1FF',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  smallBtnText: { color: '#0B5FFF', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowK: { color: '#5A6272' },
  rowV: { color: '#14181F', fontWeight: '600' },
});
