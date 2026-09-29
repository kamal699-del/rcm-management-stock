'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const UNITS = ['kg', 'gr', 'pcs', 'pack'];

const ROLES = {
  admin: 'Admin',
  store_leader: 'Store Leader',
  team_leader: 'Team Leader',
  crew: 'Crew',
};

const baseUnit = p => p?.base_unit || p?.unit || 'pcs';

const fmt = n =>
  Number(n || 0).toLocaleString('id-ID', {
    maximumFractionDigits: 3,
  });

const unitMap = p => ({
  [baseUnit(p)]: 1,
  ...(p?.unit_1 && p?.unit_1_per_base
    ? { [p.unit_1]: Number(p.unit_1_per_base) }
    : {}),
  ...(p?.unit_2 && p?.unit_2_per_base
    ? { [p.unit_2]: Number(p.unit_2_per_base) }
    : {}),
  ...(p?.unit_3 && p?.unit_3_per_base
    ? { [p.unit_3]: Number(p.unit_3_per_base) }
    : {}),
});

const toBase = (qty, unit, p) => {
  const factor = Number(unitMap(p)[unit] || 1);
  return Number(qty || 0) * factor;
};

const fromBase = (qty, unit, p) => {
  const factor = Number(unitMap(p)[unit] || 1);
  return factor > 0 ? Number(qty || 0) / factor : 0;
};

const canLeader = role =>
  ['admin', 'store_leader', 'team_leader'].includes(role);

const canAdmin = role => role === 'admin';

export default function Home() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }

    loadProfile();
  }, [session]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id,full_name,role,store_id,active,stores(name,code)'
      )
      .eq('id', session.user.id)
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    setProfile(data);

    if (!data.active) {
      await supabase.auth.signOut();
      setMsg('Akun Anda tidak aktif.');
      return;
    }

    setTab(data.role === 'crew' ? 'crew-stock' : 'dashboard');
  }

  async function login(e) {
    e.preventDefault();

    setBusy(true);
    setMsg('');

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) setMsg(error.message);
    } finally {
