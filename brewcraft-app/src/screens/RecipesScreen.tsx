import { StyleSheet, Text, View } from 'react-native';
import { BrewRecipe } from '../types';
import { Card } from '../components/Card';

type Props = { recipes: BrewRecipe[] };

export function RecipesScreen({ recipes }: Props) {
  return (
    <View>
      <Text style={styles.heading}>Recipes</Text>
      {recipes.map((recipe) => (
        <Card key={recipe.id}>
          <Text style={styles.name}>{recipe.name}</Text>
          <Text>{recipe.method} · {recipe.ratio}</Text>
          <Text>{recipe.dose}g dose · {recipe.water}g yield · {recipe.grind}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 10, color: '#2b221d' },
  name: { fontSize: 17, fontWeight: '600', color: '#2b221d', marginBottom: 6 }
});
