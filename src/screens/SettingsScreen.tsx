import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { getWebhookSecret, saveWebhookSecret } from '../services/webhookService';
import { clearQueue, loadQueue } from '../services/queueService';

const WEBHOOK_URL = 'https://admin.hydroscope.ci/api/webhook/sms';

const OPERATEURS = [
  { op: 'Wave',         pattern: 'Contient "WV-"',            color: '#1B7FD7' },
  { op: 'Orange Money', pattern: 'Contient "ID transaction"', color: '#FF7900' },
  { op: 'Moov Money',   pattern: 'Contient "MOV" ou "Reference:"', color: '#00B0D8' },
  { op: 'MTN',          pattern: 'Contient "TxnId"',          color: '#c29e00' },
];

export default function SettingsScreen() {
  const [secret, setSecret] = useState('');
  const [saved, setSaved]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    getWebhookSecret().then(s => { if (s) { setSecret(s); setSaved(true); } });
    loadQueue().then(q => setQueueSize(q.length));
  }, []);

  const handleSave = async () => {
    if (!secret.trim()) { Alert.alert('Erreur', 'Le secret ne peut pas être vide.'); return; }
    await saveWebhookSecret(secret.trim());
    setSaved(true);
    Alert.alert('✅ Enregistré', 'Secret webhook sauvegardé en SecureStore (jamais en clair).');
  };

  const handleTest = async () => {
    const s = secret.trim();
    if (!s) { Alert.alert('Erreur', 'Configurez d\'abord le secret.'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': s },
        body: JSON.stringify({
          body: 'WV-TEST-GATEWAY Vous avez reçu 10000 XOF de HydroTest',
          expediteur: '+22500000000',
        }),
      });
      if (res.ok) {
        setTestResult('✅ Connexion OK — admin.hydroscope.ci répond correctement');
      } else {
        const text = await res.text().catch(() => '');
        setTestResult(`⚠️ Réponse ${res.status}: ${text.slice(0, 150)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setTestResult(`❌ Erreur: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Vider la file',
      `Supprimer les ${queueSize} SMS en attente ? Ils ne seront plus envoyés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider', style: 'destructive',
          onPress: async () => {
            await clearQueue();
            setQueueSize(0);
            Alert.alert('File vidée', 'Tous les SMS en attente ont été supprimés.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Secret */}
      <Text style={styles.sectionTitle}>Secret Webhook</Text>
      <Text style={styles.label}>x-webhook-secret</Text>
      <TextInput
        style={styles.input}
        value={secret}
        onChangeText={s => { setSecret(s); setSaved(false); }}
        placeholder="Entrez le WEBHOOK_SECRET de Render"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {saved && <Text style={styles.savedBadge}>🔒 Stocké dans SecureStore</Text>}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Enregistrer</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Test */}
      <Text style={styles.sectionTitle}>Test de connexion</Text>
      <Text style={styles.hint}>
        Envoie un SMS Wave fictif vers admin.hydroscope.ci pour vérifier la connectivité.
      </Text>
      <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
        {testing
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.testBtnText}>🧪 Tester le webhook</Text>
        }
      </TouchableOpacity>
      {testResult !== null && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* File d'attente */}
      <Text style={styles.sectionTitle}>File d'attente offline</Text>
      <View style={styles.queueRow}>
        <Text style={styles.queueLabel}>SMS en attente :</Text>
        <Text style={[styles.queueCount, { color: queueSize > 0 ? '#C9A857' : '#22c55e' }]}>
          {queueSize}
        </Text>
      </View>
      {queueSize > 0 && (
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearQueue}>
          <Text style={styles.dangerBtnText}>🗑️ Vider la file</Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />

      {/* Filtres */}
      <Text style={styles.sectionTitle}>Filtres opérateurs actifs</Text>
      {OPERATEURS.map(({ op, pattern, color }) => (
        <View key={op} style={styles.filterRow}>
          <View style={[styles.filterBadge, { backgroundColor: color }]}>
            <Text style={styles.filterBadgeText}>{op}</Text>
          </View>
          <Text style={styles.filterPattern}>{pattern}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔗 Serveur : admin.hydroscope.ci{'\n'}
          📡 Endpoint : POST /api/webhook/sms{'\n'}
          🔑 Secret : SecureStore uniquement (jamais en clair)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f9' },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0A2342', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 11, fontWeight: '600', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#0A2342',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0A2342',
    marginBottom: 8,
  },
  savedBadge: { color: '#22c55e', fontSize: 12, marginBottom: 10 },
  saveBtn: { backgroundColor: '#0A2342', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  hint: { fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 18 },
  testBtn: { backgroundColor: '#C9A857', borderRadius: 8, padding: 14, alignItems: 'center' },
  testBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultBox: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#C9A857', elevation: 1 },
  resultText: { fontSize: 13, color: '#333', lineHeight: 18 },
  queueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  queueLabel: { fontSize: 14, color: '#555', flex: 1 },
  queueCount: { fontSize: 22, fontWeight: '800' },
  dangerBtn: { backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  dangerBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  filterBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, marginRight: 12, minWidth: 100, alignItems: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  filterPattern: { fontSize: 13, color: '#555', flex: 1 },
  infoBox: { backgroundColor: '#0A2342', borderRadius: 8, padding: 14 },
  infoText: { color: '#C9A857', fontSize: 12, lineHeight: 20, fontFamily: 'monospace' },
});
