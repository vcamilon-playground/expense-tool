import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  formatMoney,
  type Category,
  type RecurringCadence,
  type RecurringExpense,
  type RecurringInput,
} from '@expense/shared';
import {
  createRecurring,
  deleteRecurring,
  listCategories,
  listRecurring,
  updateRecurring,
} from '../lib/db';
import { colors, styles } from '../theme';

const cadences: RecurringCadence[] = ['weekly', 'monthly', 'yearly'];

const today = () => new Date().toISOString().slice(0, 10);

const empty: RecurringInput = {
  name: '',
  amount: 0,
  category_id: null,
  cadence: 'monthly',
  next_charge_date: today(),
  active: true,
};

export default function RecurringScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecurringInput>(empty);
  const [amountText, setAmountText] = useState('');

  const reload = useCallback(async () => {
    const [c, r] = await Promise.all([listCategories(), listRecurring()]);
    setCategories(c);
    setItems(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  function startEdit(r: RecurringExpense) {
    setEditingId(r.id);
    setDraft({
      name: r.name,
      amount: r.amount,
      category_id: r.category_id,
      cadence: r.cadence,
      next_charge_date: r.next_charge_date,
      active: r.active,
    });
    setAmountText(String(r.amount));
  }

  function reset() {
    setEditingId(null);
    setDraft(empty);
    setAmountText('');
  }

  async function save() {
    const amount = parseFloat(amountText);
    if (!draft.name || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Name and positive amount required');
      return;
    }
    const payload: RecurringInput = { ...draft, amount };
    try {
      if (editingId) await updateRecurring(editingId, payload);
      else await createRecurring(payload);
      reset();
      await reload();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'unknown');
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecurring(id);
          reload();
        },
      },
    ]);
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.h1}>Recurring</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>{editingId ? 'Edit' : 'New'} subscription</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(v) => setDraft({ ...draft, name: v })}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Amount</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={setAmountText}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Cadence</Text>
        <View style={styles.row}>
          {cadences.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setDraft({ ...draft, cadence: c })}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: draft.cadence === c ? colors.accent : colors.border,
              }}
            >
              <Text style={{ color: colors.text }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setDraft({ ...draft, category_id: null })}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: draft.category_id === null ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: colors.text }}>None</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setDraft({ ...draft, category_id: c.id })}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: draft.category_id === c.id ? colors.accent : colors.border,
              }}
            >
              <Text style={{ color: colors.text }}>{c.icon ?? ''} {c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Next charge (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={draft.next_charge_date}
          onChangeText={(v) => setDraft({ ...draft, next_charge_date: v })}
        />

        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Text style={styles.text}>Active</Text>
          <Switch
            value={draft.active}
            onValueChange={(v) => setDraft({ ...draft, active: v })}
          />
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={save}>
            <Text style={styles.primaryText}>{editingId ? 'Update' : 'Add'}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity style={[styles.ghostButton, { flex: 1 }]} onPress={reset}>
              <Text style={styles.ghostText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Subscriptions</Text>
        {items.length === 0 ? (
          <Text style={styles.muted}>None yet.</Text>
        ) : (
          items.map((r) => {
            const cat = r.category_id ? catMap.get(r.category_id) : null;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.rowBetween, { marginBottom: 10 }]}
                onPress={() => startEdit(r)}
                onLongPress={() => confirmDelete(r.id)}
              >
                <View>
                  <Text style={styles.text}>{r.name} {r.active ? '' : '(inactive)'}</Text>
                  <Text style={styles.muted}>
                    {r.cadence} · next {r.next_charge_date}
                    {cat ? ` · ${cat.icon ?? ''} ${cat.name}` : ''}
                  </Text>
                </View>
                <Text style={[styles.text, { fontWeight: '700' }]}>{formatMoney(r.amount)}</Text>
              </TouchableOpacity>
            );
          })
        )}
        {items.length > 0 && (
          <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>
            Tap to edit · Long-press to delete
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
