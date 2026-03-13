import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { ratioFrom, waterFromRatio } from '../utils/brew';

export function ToolsScreen() {
  const [dose, setDose] = useState('18');
  const [ratio, setRatio] = useState('16');
  const doseNum = Number(dose) || 0;
  const ratioNum = Number(ratio) || 0;
  const water = useMemo(() => waterFromRatio(doseNum, ratioNum), [doseNum, ratioNum]);

  return (
    <View>
      <Text style={styles.heading}>Smart Tools</Text>
      <Card>
        <Text style={styles.label}>Ratio Calculator</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} keyboardType="numeric" value={dose} onChangeText={setDose} placeholder="Dose (g)" />
          <TextInput style={styles.input} keyboardType="numeric" value={ratio} onChangeText={setRatio} placeholder="Ratio" />
        </View>
        <Text style={styles.output}>Water target: {water}g</Text>
        <Text style={styles.output}>Computed ratio: {ratioFrom(doseNum, water)}</Text>
        <Pressable style={styles.quick}><Text style={styles.quickText}>Quick preset: 20g @ 1:15</Text></Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#2b221d' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#2b221d' },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d6ccc5', borderRadius: 10, padding: 10, backgroundColor: '#fffcfa' },
  output: { marginTop: 10, color: '#3d2f26' },
  quick: { marginTop: 12, backgroundColor: '#efe8e3', borderRadius: 10, padding: 10 },
  quickText: { textAlign: 'center', color: '#4a3427' }
});
