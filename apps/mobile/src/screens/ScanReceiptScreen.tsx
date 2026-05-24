import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { extractReceipt } from '../lib/claude';
import { colors, styles } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScanReceipt'>;

const MAX_DIM = 1600;

async function shrink(uri: string): Promise<{ uri: string; base64: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIM } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return { uri: result.uri, base64: result.base64 ?? '' };
}

export default function ScanReceiptScreen() {
  const nav = useNavigation<Nav>();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('Choose a source to start.');

  async function handleResult(uri: string) {
    setBusy(true);
    try {
      setStatus('Compressing image…');
      const { uri: small, base64 } = await shrink(uri);
      setPreview(small);
      if (!base64) throw new Error('No base64 from manipulator');
      setStatus('Asking Claude to read receipt…');
      const extraction = await extractReceipt(base64, 'image/jpeg');
      setStatus('Done. Confirm fields →');
      nav.replace('AddExpense', { prefill: extraction });
    } catch (e) {
      Alert.alert('Receipt scan failed', e instanceof Error ? e.message : 'unknown');
      setStatus('Failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission required');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (r.canceled || !r.assets?.[0]) return;
    await handleResult(r.assets[0].uri);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission required');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (r.canceled || !r.assets?.[0]) return;
    await handleResult(r.assets[0].uri);
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.h1}>Scan a receipt</Text>
      <Text style={styles.muted}>
        Claude will read the photo and fill out an expense for you. You'll get to confirm before saving.
      </Text>

      <View style={[styles.row, { marginTop: 16 }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1 }]}
          onPress={pickFromCamera}
          disabled={busy}
        >
          <Text style={styles.primaryText}>📷 Use camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ghostButton, { flex: 1 }]}
          onPress={pickFromGallery}
          disabled={busy}
        >
          <Text style={styles.ghostText}>🖼️ Pick photo</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        {busy && <ActivityIndicator color={colors.accent} />}
        <Text style={[styles.muted, { marginTop: busy ? 8 : 0 }]}>{status}</Text>
        {preview && (
          <Image
            source={{ uri: preview }}
            style={{ width: '100%', height: 240, marginTop: 12, borderRadius: 8 }}
            resizeMode="contain"
          />
        )}
      </View>
    </ScrollView>
  );
}
