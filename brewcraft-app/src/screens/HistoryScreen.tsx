import { StyleSheet, Text, View } from 'react-native';
import { BrewLog, BrewRecipe } from '../types';
import { Card } from '../components/Card';
import { nextAdjustment } from '../utils/brew';

type Props = {
  logs: BrewLog[];
  recipes: BrewRecipe[];
};

export function HistoryScreen({ logs, recipes }: Props) {
  return (
    <View>
      <Text style={styles.heading}>Brew History</Text>
      {logs.map((log) => {
        const recipe = recipes.find((r) => r.id === log.recipeId);
        return (
          <Card key={log.id}>
            <Text style={styles.name}>{recipe?.name ?? 'Unknown Recipe'}</Text>
            <Text>Score: {log.score}/10 · Time: {log.timeSeconds}s · Grind: {log.grind}</Text>
            <Text style={styles.note}>Notes: {log.tastingNotes}</Text>
            <Text style={styles.reco}>Recommendation: {nextAdjustment(log.score)}</Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#2b221d' },
  name: { fontWeight: '600', fontSize: 16, color: '#2b221d', marginBottom: 6 },
  note: { marginTop: 8, color: '#6a5b52' },
  reco: { marginTop: 8, color: '#4a3427', fontWeight: '500' }
});
