export type RoastLevel = 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';

export interface Bean {
  name: string;
  roaster: string;
  roastDate: string;
  roastLevel: RoastLevel;
}

export interface Shot {
  id: string;
  createdAt: number;
  bean: Bean;
  grinderSetting: string;
  doseG: number;
  yieldG: number;
  timeS: number;
  tempC: number;
  rating: number;
  notes: string;
  profileId: string | null;
}

export interface Waypoint {
  tS: number;
  pressureBar: number;
  flowMls: number;
}

export interface Profile {
  id: string;
  name: string;
  isBuiltIn: boolean;
  waypoints: Waypoint[];
  showPressure: boolean;
  showFlow: boolean;
}

export interface Machine {
  name: string;
  maxPressureBar: number;
  basketSizeG: number;
}

export interface Grinder {
  name: string;
  burrSizeMm: number;
}

export interface Equipment {
  id: 'singleton';
  machine: Machine | null;
  grinder: Grinder | null;
}

export type TabId = 'log' | 'profiles' | 'compare' | 'equipment';
