import { BrewLog, BrewRecipe } from '../types';

export const seedRecipes: BrewRecipe[] = [
  { id: '1', name: 'Balanced V60', method: 'Pour-over', dose: 18, water: 300, ratio: '1:16.7', grind: 'Medium-fine', temperatureC: 94, brewTimeSeconds: 180 },
  { id: '2', name: 'Classic Espresso', method: 'Espresso', dose: 18, water: 36, ratio: '1:2', grind: 'Fine', temperatureC: 93, brewTimeSeconds: 30 },
  { id: '3', name: 'Daily AeroPress', method: 'AeroPress', dose: 15, water: 240, ratio: '1:16', grind: 'Medium', temperatureC: 92, brewTimeSeconds: 120 }
];

export const seedLogs: BrewLog[] = [
  { id: 'l1', recipeId: '1', brewedAt: new Date().toISOString(), grind: 'Medium-fine', timeSeconds: 178, score: 8, tastingNotes: 'Sweet citrus, tea-like finish' }
];
