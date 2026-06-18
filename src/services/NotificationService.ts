export interface ParsedWaveNotification {
  operateur: 'Wave';
  montant: number | null;
  expediteur: string | null;
  transaction_id: string | null;
  body: string;
}

const WAVE_ID_RE    = /T_[A-Z0-9]+/;
const WAVE_DETECT_RE = /ID\s+de\s+transaction/i;
const MONTANT_RE    = /(\d[\d.]*)\s*F(?:CFA)?/i;
const EXP_RE        = /(?:Client\s*:\s*|Vendu\s+[aà]\s+)([\d\s]+)/i;
const TRANS_ID_RE   = /(T_[A-Z0-9]+)/;

export function parseWaveNotification(
  title: string,
  messageBody: string,
): ParsedWaveNotification | null {
  const fullText = `${title}\n${messageBody}`;

  // Nécessite "ID de transaction" ET identifiant T_XXXX — les deux obligatoires
  if (WAVE_ID_RE.exec(fullText) === null || WAVE_DETECT_RE.exec(fullText) === null) return null;

  // Montant ex: "50.500F" — le point est séparateur de milliers (Wave CI)
  const montantMatch = MONTANT_RE.exec(fullText);
  const montantStr = montantMatch?.[1]?.replaceAll('.', '') ?? null;
  const montant = montantStr ? Number.parseInt(montantStr, 10) : null;

  // Numéro expéditeur : "Client : 0789..." ou "Vendu à 0789..."
  const expMatch = EXP_RE.exec(fullText);
  const expediteur = expMatch?.[1]?.replaceAll(' ', '') ?? null;

  const idMatch = TRANS_ID_RE.exec(fullText);
  const transaction_id = idMatch?.[1] ?? null;

  return { operateur: 'Wave', montant, expediteur, transaction_id, body: fullText };
}
