import type { Profile } from './types';

export const PRESET_PROFILES: Profile[] = [
  {
    id: 'preset-classic-9bar',
    name: 'Classic Italian 9-bar',
    isBuiltIn: true,
    showPressure: true,
    showFlow: true,
    waypoints: [
      { tS: 0, pressureBar: 0, flowMls: 0 },
      { tS: 3, pressureBar: 9, flowMls: 1.5 },
      { tS: 8, pressureBar: 9, flowMls: 2.2 },
      { tS: 20, pressureBar: 9, flowMls: 2.8 },
      { tS: 30, pressureBar: 9, flowMls: 3.0 },
    ],
  },
  {
    id: 'preset-blooming-preinfusion',
    name: 'Blooming Pre-infusion',
    isBuiltIn: true,
    showPressure: true,
    showFlow: true,
    waypoints: [
      { tS: 0, pressureBar: 0, flowMls: 0 },
      { tS: 4, pressureBar: 2, flowMls: 0.8 },
      { tS: 10, pressureBar: 2, flowMls: 0.3 },
      { tS: 14, pressureBar: 9, flowMls: 1.5 },
      { tS: 25, pressureBar: 9, flowMls: 2.5 },
      { tS: 32, pressureBar: 9, flowMls: 2.8 },
    ],
  },
  {
    id: 'preset-ramped-decline',
    name: 'Ramped Pressure Decline',
    isBuiltIn: true,
    showPressure: true,
    showFlow: true,
    waypoints: [
      { tS: 0, pressureBar: 0, flowMls: 0 },
      { tS: 5, pressureBar: 9, flowMls: 1.0 },
      { tS: 12, pressureBar: 9, flowMls: 2.0 },
      { tS: 22, pressureBar: 6, flowMls: 2.4 },
      { tS: 32, pressureBar: 4, flowMls: 2.0 },
    ],
  },
  {
    id: 'preset-long-preinfusion-plateau',
    name: 'Long Pre-infusion + Plateau',
    isBuiltIn: true,
    showPressure: true,
    showFlow: true,
    waypoints: [
      { tS: 0, pressureBar: 0, flowMls: 0 },
      { tS: 5, pressureBar: 3, flowMls: 0.6 },
      { tS: 15, pressureBar: 3, flowMls: 0.4 },
      { tS: 20, pressureBar: 8, flowMls: 1.6 },
      { tS: 35, pressureBar: 8, flowMls: 2.4 },
      { tS: 42, pressureBar: 8, flowMls: 2.6 },
    ],
  },
];
