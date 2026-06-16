import { Operateur, SmsMessage } from '../types';

interface Filter {
  pattern: RegExp;
  operateur: Operateur;
}

const FILTERS: Filter[] = [
  { pattern: /WV-/i,                    operateur: 'Wave' },
  { pattern: /ID\s*transaction/i,       operateur: 'Orange Money' },
  { pattern: /MOV|Reference:/i,         operateur: 'Moov Money' },
  { pattern: /TxnId/i,                  operateur: 'MTN' },
];

export function detectOperateur(body: string): Operateur | null {
  for (const f of FILTERS) {
    if (f.pattern.test(body)) return f.operateur;
  }
  return null;
}

export function isMobileMoneyCI(body: string): boolean {
  return detectOperateur(body) !== null;
}

export function buildSmsPayload(body: string, expediteur: string): SmsMessage {
  return {
    body,
    expediteur,
    timestamp: Date.now(),
    operateur: detectOperateur(body),
  };
}
