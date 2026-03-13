export function ratioFrom(dose: number, water: number): string {
  if (dose <= 0 || water <= 0) return '1:0';
  return `1:${(water / dose).toFixed(1)}`;
}

export function waterFromRatio(dose: number, ratio: number): number {
  return Math.round(dose * ratio);
}

export function nextAdjustment(score: number): string {
  if (score <= 4) return 'Try a finer grind and +1°C water to boost extraction.';
  if (score <= 6) return 'Keep recipe fixed and extend brew time by 10s.';
  if (score <= 8) return 'Very close. Adjust grind by 1 click finer for more sweetness.';
  return 'Great cup. Save as your baseline and repeat tomorrow.';
}
