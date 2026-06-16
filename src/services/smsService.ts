import { Operateur, SmsMessage } from '../types';

interface ExtractionConfig {
  detect: RegExp;
  operateur: Operateur;
  montant: RegExp;
  expediteurInBody?: RegExp;
  transaction_id: RegExp;
}

const EXTRACT_CONFIGS: ExtractionConfig[] = [
  {
    detect: /WV-|wave/i,
    operateur: 'Wave',
    montant: /(\d[\d.]*)\s*F(?:CFA)?/i,
    expediteurInBody: /Client\s*:\s*([\d\s]+)/i,
    transaction_id: /(T_[A-Z0-9]+)/,
  },
  {
    detect: /ID\s*transaction|orange\s*money|OM-/i,
    operateur: 'Orange Money',
    montant: /(\d+[\s,.]?\d*)\s*FCFA/i,
    expediteurInBody: /du\s+(\d+)/i,
    transaction_id: /Reference\s+([A-Z0-9.]+)/i,
  },
  {
    detect: /MOV|Reference:|Moov\s*Money/i,
    operateur: 'Moov Money',
    montant: /(\d+\s?\d*)\s*FCFA/i,
    expediteurInBody: /de\s+(\d+)/i,
    transaction_id: /Ref:\s*([A-Z0-9]+)/i,
  },
  {
    detect: /TxnId|MTN\s*MoMo/i,
    operateur: 'MTN',
    montant: /(\d+[\s,.]?\d*)\s*FCFA/i,
    expediteurInBody: /de\s+(\d+)/i,
    transaction_id: /TxnId[:\s]+([A-Z0-9]+)/i,
  },
];

export function detectOperateur(body: string): Operateur | null {
  for (const c of EXTRACT_CONFIGS) {
    if (c.detect.test(body)) return c.operateur;
  }
  return null;
}

export function isMobileMoneyCI(body: string): boolean {
  return detectOperateur(body) !== null;
}

export function extractSmsData(body: string, originatingAddress: string): SmsMessage {
  for (const c of EXTRACT_CONFIGS) {
    if (!c.detect.test(body)) continue;

    const montantMatch = body.match(c.montant);
    const montantStr = montantMatch?.[1]?.replace(/[\s.]/g, '') ?? null;
    const montant = montantStr ? parseInt(montantStr, 10) : null;

    const expMatch = c.expediteurInBody ? body.match(c.expediteurInBody) : null;
    const expediteur = expMatch?.[1]?.replace(/\s/g, '') ?? originatingAddress;

    const idMatch = body.match(c.transaction_id);
    const transaction_id = idMatch?.[1] ?? null;

    return { body, expediteur, timestamp: Date.now(), operateur: c.operateur, montant, transaction_id };
  }
  return { body, expediteur: originatingAddress, timestamp: Date.now(), operateur: null };
}

export function buildSmsPayload(body: string, expediteur: string): SmsMessage {
  return extractSmsData(body, expediteur);
}
