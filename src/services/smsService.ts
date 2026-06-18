import { Operateur, SmsMessage } from '../types';

interface ExtractionConfig {
  detect: RegExp | ((body: string) => boolean);
  operateur: Operateur;
  montant: RegExp;
  expediteurInBody?: RegExp;
  transaction_id: RegExp;
}

function matches(detect: ExtractionConfig['detect'], body: string): boolean {
  return typeof detect === 'function' ? detect(body) : detect.exec(body) !== null;
}

const EXTRACT_CONFIGS: ExtractionConfig[] = [
  // Wave CI — notification push
  // Détecter : "ID de transaction" ET identifiant T_XXXX (les deux obligatoires)
  // Montant  : ex "50.500F" (le point est séparateur de milliers, pas décimal)
  {
    detect: (body) =>
      /ID\s+de\s+transaction/i.test(body) && /T_[A-Z0-9]+/.test(body),
    operateur: 'Wave',
    montant: /(\d[\d.]*)\s*F(?:CFA)?/i,
    expediteurInBody: /(?:Client\s*:\s*|Vendu\s+[aà]\s+)([\d\s]+)/i,
    transaction_id: /(T_[A-Z0-9]+)/,
  },
  // Orange Money CI — SMS avec "Reference PP..."
  // Montant  : /(\d+[\s.,]\d*)\s*FCFA/
  // Numéro   : /du\s+(\d+)/
  {
    detect: /Reference\s+PP/i,
    operateur: 'Orange Money',
    montant: /(\d[\d\s.,]*)\s*FCFA/i,
    expediteurInBody: /du\s+(\d+)/i,
    transaction_id: /Reference\s+(PP[A-Z0-9.]+)/i,
  },
  // Moov Money CI — SMS avec "Ref:" (strict — pas "Reference:")
  // Montant  : /(\d[\d\s]*)\s*FCFA/
  // Numéro   : /de\s+(\d+)/
  {
    detect: /\bRef:\s*[A-Z0-9]/,
    operateur: 'Moov Money',
    montant: /(\d[\d\s]*)\s*FCFA/i,
    expediteurInBody: /de\s+(\d+)/i,
    transaction_id: /Ref:\s*([A-Z0-9]+)/i,
  },
  // MTN Mobile Money CI — "ID Transaction:" ET "Mobile Money" (les deux obligatoires)
  // Exemple réel : "Vous avez recu 4004 FCFA de 2250575899797 sur votre compte Mobile Money.
  //                Date: 25-09-2025 15:58:44 Votre nouveau solde est de: 15829 FCFA.
  //                ID Transaction: 14251504940."
  {
    detect: (body) =>
      /ID\s+Transaction:/i.test(body) && /Mobile\s+Money/i.test(body),
    operateur: 'MTN',
    montant: /(\d[\d\s]*)\s*FCFA/i,
    expediteurInBody: /de\s+(\d+)/i,
    transaction_id: /ID\s+Transaction:\s*(\d+)/i,
  },
];

export function detectOperateur(body: string): Operateur | null {
  for (const c of EXTRACT_CONFIGS) {
    if (matches(c.detect, body)) return c.operateur;
  }
  return null;
}

export function isMobileMoneyCI(body: string): boolean {
  return detectOperateur(body) !== null;
}

export function extractSmsData(body: string, originatingAddress: string): SmsMessage {
  for (const c of EXTRACT_CONFIGS) {
    if (!matches(c.detect, body)) continue;

    const montantMatch = c.montant.exec(body);
    const montantStr = montantMatch?.[1]?.replace(/[\s.]/g, '') ?? null;
    const montant = montantStr ? Number.parseInt(montantStr, 10) : null;

    const expMatch = c.expediteurInBody ? c.expediteurInBody.exec(body) : null;
    const expediteur = expMatch?.[1]?.replace(/\s/g, '') ?? originatingAddress;

    const idMatch = c.transaction_id.exec(body);
    const transaction_id = idMatch?.[1] ?? null;

    return { body, expediteur, timestamp: Date.now(), operateur: c.operateur, montant, transaction_id };
  }
  return { body, expediteur: originatingAddress, timestamp: Date.now(), operateur: null };
}

export function buildSmsPayload(body: string, expediteur: string): SmsMessage {
  return extractSmsData(body, expediteur);
}
