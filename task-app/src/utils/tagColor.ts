function djb2Hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i)
    h = h & h // Convert to 32-bit integer
  }
  return Math.abs(h)
}

export function getTagColor(tag: string): string {
  const hue = djb2Hash(tag.toLowerCase().trim()) % 360
  return `hsl(${hue}, 65%, 55%)`
}

export function getTagBgColor(tag: string): string {
  const hue = djb2Hash(tag.toLowerCase().trim()) % 360
  return `hsl(${hue}, 65%, 18%)`
}
