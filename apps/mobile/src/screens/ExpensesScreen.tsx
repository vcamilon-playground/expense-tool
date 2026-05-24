import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatMoney, type Category, type Expense } from '@expense/shared';
import { deleteExpense, listCategories, listExpenses } from '../lib/db';
import { colors, styles } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExpensesList'>;

export default function ExpensesScreen() {
  const nav = useNavigation<Nav>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([listCategories(), listExpenses()]);
      setCategories(c);
      setExpenses(e);
    } catch (e) {
      Alert.alert('Load failed', e instanceof Error ? e.message : 'unknown');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  function confirmDelete(id: string) {
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(id);
            load();
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'unknown');
          }
        },
      },
    ]);
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.row, { marginBottom: 12 }]}>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => nav.navigate('AddExpense')}>
          <Text style={styles.primaryText}>+ Add</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ghostButton, { flex: 1 }]} onPress={() => nav.navigate('ScanReceipt')}>
          <Text style={styles.ghostText}>📷 Scan receipt</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={<Text style={styles.muted}>No expenses yet.</Text>}
        renderItem={({ item }) => {
          const cat = item.category_id ? catMap.get(item.category_id) : null;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => nav.navigate('AddExpense', { editing: item })}
              onLongPress={() => confirmDelete(item.id)}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.text}>
                  {cat ? `${cat.icon ?? ''} ${cat.name}` : 'Uncategorized'}
                </Text>
                <Text style={[styles.text, { fontWeight: '700' }]}>
                  {formatMoney(item.amount, item.currency)}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.muted}>
                  {item.merchant ?? '—'}
                  {item.description ? ` · ${item.description}` : ''}
                </Text>
                <Text style={styles.muted}>{item.occurred_at}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>
        Tap to edit · Long-press to delete
      </Text>
    </View>
  );
}
