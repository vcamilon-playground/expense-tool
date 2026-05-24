import { useCallback, useState } from 'react';
import { ScrollView, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  budgetStatus,
  formatMoney,
  summarize,
  type Budget,
  type Category,
  type Expense,
} from '@expense/shared';
import { listBudgets, listCategories, listExpenses } from '../lib/db';
import { colors, styles } from '../theme';

export default function DashboardScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, e, b] = await Promise.all([listCategories(), listExpenses(), listBudgets()]);
      setCategories(c);
      setExpenses(e);
      setBudgets(b);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
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

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: colors.bad }}>{err}</Text>
      </View>
    );
  }

  const day = summarize(expenses, categories, 'day');
  const week = summarize(expenses, categories, 'week');
  const month = summarize(expenses, categories, 'month');
  const year = summarize(expenses, categories, 'year');
  const statuses = budgetStatus(expenses, categories, budgets);

  return (
    <ScrollView
      style={styles.screen}
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
    >
      <Text style={styles.h1}>Dashboard</Text>

      {[
        { label: 'Today', s: day },
        { label: 'This Week', s: week },
        { label: 'This Month', s: month },
        { label: 'This Year', s: year },
      ].map((row) => (
        <View key={row.label} style={styles.card}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{formatMoney(row.s.total)}</Text>
          <Text style={styles.muted}>{row.s.count} expense(s)</Text>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.h2}>This month by category</Text>
        {month.by_category.length === 0 ? (
          <Text style={styles.muted}>No expenses yet this month.</Text>
        ) : (
          month.by_category.map((c) => (
            <View key={c.category_id ?? 'none'} style={[styles.rowBetween, { marginBottom: 4 }]}>
              <Text style={styles.text}>{c.category_name}</Text>
              <Text style={styles.text}>{formatMoney(c.total)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Budget status</Text>
        {statuses.length === 0 ? (
          <Text style={styles.muted}>No budgets set yet.</Text>
        ) : (
          statuses.map((s) => {
            const color = s.status === 'over' ? colors.bad : s.status === 'warning' ? colors.warn : colors.ok;
            return (
              <View
                key={s.category_id ?? 'overall'}
                style={[styles.rowBetween, { marginBottom: 6 }]}
              >
                <Text style={styles.text}>{s.category_name}</Text>
                <Text style={{ color, fontWeight: '600' }}>
                  {Math.round(s.pct_used * 100)}% — {formatMoney(s.spent)} / {formatMoney(s.limit)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
