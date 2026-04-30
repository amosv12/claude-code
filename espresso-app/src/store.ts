import { create } from 'zustand';
import {
  deleteProfile as dbDeleteProfile,
  deleteShot as dbDeleteShot,
  loadAllProfiles,
  loadAllShots,
  loadEquipment,
  saveEquipment as dbSaveEquipment,
  saveProfile as dbSaveProfile,
  saveShot as dbSaveShot,
} from './db';
import { PRESET_PROFILES } from './presets';
import type { Equipment, Profile, Shot } from './types';

export function newId(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${Date.now().toString(36)}-${hex}`;
}

interface AppState {
  initialized: boolean;
  shots: Shot[];
  profiles: Profile[];
  equipment: Equipment;

  init: () => Promise<void>;

  upsertShot: (shot: Shot) => Promise<void>;
  removeShot: (id: string) => Promise<void>;

  upsertProfile: (profile: Profile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  duplicateProfile: (id: string) => Promise<Profile | null>;

  setEquipment: (eq: Equipment) => Promise<void>;
}

const EMPTY_EQUIPMENT: Equipment = {
  id: 'singleton',
  machine: null,
  grinder: null,
};

export const useStore = create<AppState>((set, get) => ({
  initialized: false,
  shots: [],
  profiles: [],
  equipment: EMPTY_EQUIPMENT,

  init: async () => {
    if (get().initialized) return;
    const [shots, savedProfiles, eq] = await Promise.all([
      loadAllShots(),
      loadAllProfiles(),
      loadEquipment(),
    ]);

    const builtInIds = new Set(PRESET_PROFILES.map((p) => p.id));
    const userProfiles = savedProfiles.filter((p) => !builtInIds.has(p.id));
    const profiles: Profile[] = [...PRESET_PROFILES, ...userProfiles];

    set({
      initialized: true,
      shots,
      profiles,
      equipment: eq ?? EMPTY_EQUIPMENT,
    });
  },

  upsertShot: async (shot) => {
    await dbSaveShot(shot);
    const others = get().shots.filter((s) => s.id !== shot.id);
    const next = [shot, ...others].sort((a, b) => b.createdAt - a.createdAt);
    set({ shots: next });
  },

  removeShot: async (id) => {
    await dbDeleteShot(id);
    set({ shots: get().shots.filter((s) => s.id !== id) });
  },

  upsertProfile: async (profile) => {
    if (profile.isBuiltIn) {
      throw new Error('Built-in profiles cannot be edited. Duplicate first.');
    }
    await dbSaveProfile(profile);
    const others = get().profiles.filter((p) => p.id !== profile.id);
    set({ profiles: [...others, profile] });
  },

  removeProfile: async (id) => {
    const target = get().profiles.find((p) => p.id === id);
    if (!target || target.isBuiltIn) return;
    await dbDeleteProfile(id);
    set({ profiles: get().profiles.filter((p) => p.id !== id) });
  },

  duplicateProfile: async (id) => {
    const source = get().profiles.find((p) => p.id === id);
    if (!source) return null;
    const copy: Profile = {
      ...source,
      id: newId('profile'),
      name: `${source.name} (copy)`,
      isBuiltIn: false,
      waypoints: source.waypoints.map((w) => ({ ...w })),
    };
    await dbSaveProfile(copy);
    set({ profiles: [...get().profiles, copy] });
    return copy;
  },

  setEquipment: async (eq) => {
    await dbSaveEquipment(eq);
    set({ equipment: eq });
  },
}));
