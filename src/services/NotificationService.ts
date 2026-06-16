export interface ParsedWaveNotification {
  operateur: 'Wave';
  montant: number | null;
  expediteur: string | null;
  transaction_id: string | null;
  body: string;
}

export function parseWaveNotification(
  title: string,
  messageBody: string,
): ParsedWaveNotification | null {
  const fullText = `${title}\n${messageBody}`;
  if (!/(T_[A-Z0-9]+)/.test(fullText)) return null;

  const montantMatch = fullText.match(/(\d[\d.]+)\s*F(?:CFA)?/i);
  const montantStr = montantMatch?.[1]?.replace(/\./g, '') ?? null;
  const montant = montantStr ? parseInt(montantStr, 10) : null;

  const expMatch = fullText.match(/Client\s*:\s*([\d\s]+)/i);
  const expediteur = expMatch?.[1]?.replace(/\s/g, '') ?? null;

  const idMatch = fullText.match(/(T_[A-Z0-9]+)/);
  const transaction_id = idMatch?.[1] ?? null;

  return { operateur: 'Wave', montant, expediteur, transaction_id, body: fullText };
}
