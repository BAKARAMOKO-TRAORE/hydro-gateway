export type Operateur = 'Wave' | 'Orange Money' | 'Moov Money' | 'MTN';

export interface SmsMessage {
  body: string;
  expediteur: string;
  timestamp: number;
  operateur: Operateur | null;
  montant?: number | null;
  transaction_id?: string | null;
}

export interface QueuedWebhook {
  id: string;
  sms: SmsMessage;
  retries: number;
  createdAt: number;
}
