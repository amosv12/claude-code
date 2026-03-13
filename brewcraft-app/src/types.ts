export type BrewMethod = 'Espresso' | 'Pour-over' | 'AeroPress' | 'French Press' | 'Moka Pot' | 'Cold Brew';

export type BrewRecipe = {
  id: string;
  name: string;
  method: BrewMethod;
  dose: number;
  water: number;
  ratio: string;
  grind: string;
  temperatureC: number;
  brewTimeSeconds: number;
  notes?: string;
};

export type BrewLog = {
  id: string;
  recipeId: string;
  brewedAt: string;
  grind: string;
  timeSeconds: number;
  score: number;
  tastingNotes: string;
};
