import * as SecureStore from 'expo-secure-store';

const WEBHOOK_URL = 'https://admin.hydroscope.ci/api/webhook/sms';
const SECRET_STORE_KEY = 'WEBHOOK_SECRET';

export async function getWebhookSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(SECRET_STORE_KEY);
}

export async function saveWebhookSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(SECRET_STORE_KEY, secret.trim());
}

export async function sendToWebhook(
  body: string,
  expediteur: string,
  transaction_id?: string | null,
  operateur?: string | null,
): Promise<void> {
  const secret = await getWebhookSecret();
  if (!secret) throw new Error('Secret webhook non configuré — allez dans Paramètres');

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret,
    },
    body: JSON.stringify({
      body,
      expediteur,
      transaction_id: transaction_id ?? null,
      operateur: operateur ?? null,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Webhook ${response.status}: ${text.slice(0, 200)}`);
  }
}
