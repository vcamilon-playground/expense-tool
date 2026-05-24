import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { formatMoney, type Budget, type Category } from '@expense/shared';
import { deleteBudget, listBudgets, listCategories, upsertBudget } from '../lib/db';
import { colors, styles } from '../theme';

export default function BudgetsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState('');

  const reload = useCallback(async () => {
    const [c, b] = await Promise.all([listCategories(), listBudgets()]);
    setCategories(c);
    setBudgets(b);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function save() {
    const parsed = parseFloat(limit);
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert('Invalid limit');
      return;
    }
    try {
      await upsertBudget({ category_id: categoryId, monthly_limit: parsed });
      setLimit('');
      setCategoryId(null);
      await reload();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'unknown');
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete budget?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(id);
          reload();
        },
      },
    ]);
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.h1}>Budgets</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>New / update</Text>

        <Text style={styles.label}>Category</Text>
        <View style={[styles.row, { marginTop: 4 }]}>
          <TouchableOpacity
            onPress={() => setCategoryId(null)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: categoryId === null ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: colors.text }}>Overall</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: categoryId === c.id ? colors.accent : colors.border,
              }}
            >
              <Text style={{ color: colors.text }}>
                {c.icon ?? ''} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Monthly limit</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={limit}
          onChangeText={setLimit}
          placeholder="0.00"
          placeholderTextColor={colors.muted}
        />

        <TouchableOpacity style={[styles.primaryButton, { marginTop: 12 }]} onPress={save}>
          <Text style={styles.primaryText}>Save budget</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Current</Text>
        {budgets.length === 0 ? (
          <Text style={styles.muted}>No budgets yet.</Text>
        ) : (
          budgets.map((b) => {
            const cat = b.category_id ? catMap.get(b.category_id) : null;
            return (
              <View key={b.id} style={[styles.rowBetween, { marginBottom: 8 }]}>
                <Text style={styles.text}>
                  {cat ? `${cat.icon ?? ''} ${cat.name}` : 'Overall'} · {formatMoney(b.monthly_limit)}
                </Text>
                <TouchableOpacity onPress={() => confirmDelete(b.id)}>
                  <Text style={{ color: colors.bad, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
