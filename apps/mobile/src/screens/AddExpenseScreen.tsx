import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Category, ExpenseInput } from '@expense/shared';
import { createExpense, listCategories, updateExpense } from '../lib/db';
import { colors, styles } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;
type Rt = RouteProp<RootStackParamList, 'AddExpense'>;

const today = () => new Date().toISOString().slice(0, 10);

export default function AddExpenseScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editing = route.params?.editing;
  const prefill = route.params?.prefill;

  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState(
    editing ? String(editing.amount) : prefill?.amount != null ? String(prefill.amount) : '',
  );
  const [currency, setCurrency] = useState(editing?.currency ?? prefill?.currency ?? 'USD');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null);
  const [merchant, setMerchant] = useState(editing?.merchant ?? prefill?.merchant ?? '');
  const [description, setDescription] = useState(editing?.description ?? prefill?.description ?? '');
  const [occurredAt, setOccurredAt] = useState(
    editing?.occurred_at ?? prefill?.occurred_at ?? today(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories().then((cats) => {
      setCategories(cats);
      if (!editing && !categoryId && prefill?.category_guess) {
        const match = cats.find((c) => c.name.toLowerCase() === prefill.category_guess?.toLowerCase());
        if (match) setCategoryId(match.id);
      }
    });
  }, []);

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert('Invalid amount', 'Enter a number ≥ 0.');
      return;
    }
    setSaving(true);
    const payload: ExpenseInput = {
      amount: parsed,
      currency: currency.toUpperCase() || 'USD',
      category_id: categoryId,
      merchant: merchant || null,
      description: description || null,
      occurred_at: occurredAt,
      receipt_url: editing?.receipt_url ?? null,
      source: editing?.source ?? (prefill ? 'receipt' : 'manual'),
    };
    try {
      if (editing) {
        await updateExpense(editing.id, payload);
      } else {
        await createExpense(payload);
      }
      nav.goBack();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'unknown');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Currency</Text>
        <TextInput
          style={styles.input}
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          maxLength={4}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="2026-05-24"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
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
            <Text style={{ color: colors.text }}>None</Text>
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

        <Text style={[styles.label, { marginTop: 12 }]}>Merchant</Text>
        <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} />

        <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 20 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryText}>
            {saving ? 'Saving…' : editing ? 'Update expense' : 'Save expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
