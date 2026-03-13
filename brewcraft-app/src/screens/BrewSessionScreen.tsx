import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrewRecipe } from '../types';
import { Card } from '../components/Card';

type Props = {
  recipe: BrewRecipe;
};

export function BrewSessionScreen({ recipe }: Props) {
  const [remaining, setRemaining] = useState(recipe.brewTimeSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const progress = useMemo(() => ((recipe.brewTimeSeconds - remaining) / recipe.brewTimeSeconds) * 100, [remaining, recipe.brewTimeSeconds]);
  const phase = remaining > recipe.brewTimeSeconds * 0.66 ? 'Bloom / Preinfusion' : remaining > recipe.brewTimeSeconds * 0.33 ? 'Main Brew' : 'Finish';

  return (
    <View>
      <Text style={styles.heading}>Live Brew Session</Text>
      <Card>
        <Text style={styles.timer}>{remaining}s</Text>
        <Text style={styles.meta}>Phase: {phase}</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} /></View>
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={() => setRunning((v) => !v)}>
            <Text style={styles.buttonText}>{running ? 'Pause' : 'Start'}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.ghost]} onPress={() => { setRunning(false); setRemaining(recipe.brewTimeSeconds); }}>
            <Text style={styles.ghostText}>Reset</Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#2b221d' },
  timer: { fontSize: 52, fontWeight: '700', textAlign: 'center', color: '#2b221d' },
  meta: { textAlign: 'center', marginVertical: 8, color: '#6c5f57' },
  track: { height: 10, backgroundColor: '#ece4df', borderRadius: 999, overflow: 'hidden', marginVertical: 10 },
  fill: { height: '100%', backgroundColor: '#8d5f42' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { flex: 1, backgroundColor: '#4a3427', padding: 12, borderRadius: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  ghost: { backgroundColor: '#efe8e3' },
  ghostText: { color: '#3d2f26', textAlign: 'center', fontWeight: '600' }
});
