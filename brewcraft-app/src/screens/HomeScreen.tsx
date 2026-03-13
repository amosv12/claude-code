import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrewRecipe } from '../types';
import { Card } from '../components/Card';

type Props = {
  recommended: BrewRecipe;
  onStart: () => void;
};

export function HomeScreen({ recommended, onStart }: Props) {
  return (
    <View>
      <Text style={styles.heading}>Today’s Brew</Text>
      <Card>
        <Text style={styles.title}>{recommended.name}</Text>
        <Text>{recommended.method} · {recommended.dose}g → {recommended.water}g</Text>
        <Text>Ratio {recommended.ratio} · {recommended.temperatureC}°C</Text>
        <Pressable style={styles.button} onPress={onStart}>
          <Text style={styles.buttonText}>Start Brew</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#2b221d' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#2b221d' },
  button: { marginTop: 12, backgroundColor: '#4a3427', padding: 12, borderRadius: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' }
});
