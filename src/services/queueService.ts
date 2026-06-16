import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedWebhook, SmsMessage } from '../types';
import { sendToWebhook } from './webhookService';

const QUEUE_KEY = '@hydrogateway:sms_queue';
const MAX_RETRIES = 3;

export async function enqueue(sms: SmsMessage): Promise<void> {
  const queue = await loadQueue();
  const item: QueuedWebhook = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sms,
    retries: 0,
    createdAt: Date.now(),
  };
  queue.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function loadQueue(): Promise<QueuedWebhook[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as QueuedWebhook[]; } catch { return []; }
}

export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  const queue = await loadQueue();
  if (queue.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  const remaining: QueuedWebhook[] = [];

  for (const item of queue) {
    if (item.retries >= MAX_RETRIES) continue;
    try {
      await sendToWebhook(item.sms.body, item.sms.expediteur);
      sent++;
    } catch {
      remaining.push({ ...item, retries: item.retries + 1 });
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { sent, failed: remaining.length };
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
