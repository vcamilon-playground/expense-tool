import type { ReceiptExtraction } from '@expense/shared';
import { WEB_API_URL } from './supabase';

export async function extractReceipt(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<ReceiptExtraction> {
  const res = await fetch(`${WEB_API_URL}/api/extract-receipt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`extract-receipt failed: ${res.status} ${text}`);
  }
  return (await res.json()) as ReceiptExtraction;
}
