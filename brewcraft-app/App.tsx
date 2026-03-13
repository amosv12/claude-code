import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Pressable } from 'react-native';
import { seedLogs, seedRecipes } from './src/data/seed';
import { HomeScreen } from './src/screens/HomeScreen';
import { BrewSessionScreen } from './src/screens/BrewSessionScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ToolsScreen } from './src/screens/ToolsScreen';

type Tab = 'Home' | 'Brew' | 'Recipes' | 'Tools' | 'History';

export default function App() {
  const [tab, setTab] = useState<Tab>('Home');
  const recommended = useMemo(() => seedRecipes[0], []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}><Text style={styles.brand}>Brewcraft</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'Home' && <HomeScreen recommended={recommended} onStart={() => setTab('Brew')} />}
        {tab === 'Brew' && <BrewSessionScreen recipe={recommended} />}
        {tab === 'Recipes' && <RecipesScreen recipes={seedRecipes} />}
        {tab === 'Tools' && <ToolsScreen />}
        {tab === 'History' && <HistoryScreen logs={seedLogs} recipes={seedRecipes} />}
      </ScrollView>
      <View style={styles.tabbar}>
        {(['Home', 'Brew', 'Recipes', 'Tools', 'History'] as Tab[]).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
            <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f2ef' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  brand: { fontSize: 28, fontWeight: '700', color: '#2b221d' },
  content: { padding: 16, paddingBottom: 100 },
  tabbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopColor: '#e8ded8',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6
  },
  tab: { flex: 1, borderRadius: 12, paddingVertical: 10 },
  activeTab: { backgroundColor: '#efe7e1' },
  tabText: { textAlign: 'center', color: '#7f6d62', fontWeight: '500', fontSize: 12 },
  activeTabText: { color: '#3d2f26', fontWeight: '700' }
});
