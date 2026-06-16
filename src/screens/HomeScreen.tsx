import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, PermissionsAndroid, Platform,
} from 'react-native';
import SmsListener from '../native/SmsListener';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { SmsMessage } from '../types';
import SmsCard from '../components/SmsCard';
import { buildSmsPayload, isMobileMoneyCI } from '../services/smsService';
import { sendToWebhook } from '../services/webhookService';
import { enqueue, flushQueue, loadQueue } from '../services/queueService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const receive = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'Permission SMS',
        message: "HydroGateway a besoin d'accéder aux SMS pour détecter les paiements Mobile Money.",
        buttonPositive: 'Autoriser',
        buttonNegative: 'Refuser',
      }
    );
    if (receive !== PermissionsAndroid.RESULTS.GRANTED) return false;
    const read = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
    return read === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export default function HomeScreen() {
  const [smsList, setSmsList] = useState<SmsMessage[]>([]);
  const [online, setOnline] = useState(true);
  const [sending, setSending] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [status, setStatus] = useState('En attente de SMS Mobile Money CI…');
  const [permGranted, setPermGranted] = useState(false);

  useEffect(() => {
    requestSmsPermissions().then(setPermGranted);

    const unsubNet = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setOnline(connected);
      if (connected) {
        flushQueue()
          .then(({ sent }) => { if (sent > 0) setStatus(`✅ ${sent} SMS en file envoyés`); })
          .catch(() => {});
      }
    });

    loadQueue().then(q => setQueueSize(q.length));

    return () => { unsubNet(); };
  }, []);

  useEffect(() => {
    if (!permGranted) return;

    const subscription = SmsListener.addListener(async ({ body, originatingAddress }) => {
      if (!isMobileMoneyCI(body)) return;

      const sms = buildSmsPayload(body, originatingAddress);
      setSmsList(prev => [sms, ...prev].slice(0, 10));
      setStatus(`📩 SMS ${sms.operateur} intercepté`);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `HydroGateway — ${sms.operateur}`,
          body: body.slice(0, 100),
        },
        trigger: null,
      });

      setSending(true);
      try {
        if (online) {
          await sendToWebhook(body, originatingAddress);
          setStatus(`✅ Envoyé — ${sms.operateur}`);
        } else {
          await enqueue(sms);
          const q = await loadQueue();
          setQueueSize(q.length);
          setStatus(`📥 Mis en file (hors ligne) — ${q.length} en attente`);
        }
      } catch (err: unknown) {
        await enqueue(sms);
        const q = await loadQueue();
        setQueueSize(q.length);
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setStatus(`⚠️ Échec — mis en file: ${msg.slice(0, 80)}`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'HydroGateway — Échec envoi',
            body: `SMS mis en file. ${msg.slice(0, 80)}`,
          },
          trigger: null,
        });
      } finally {
        setSending(false);
      }
    });

    return () => { subscription.remove(); };
  }, [permGranted, online]);

  const handleFlush = useCallback(async () => {
    if (!online) {
      Alert.alert('Hors ligne', 'Connexion internet requise pour vider la file.');
      return;
    }
    setSending(true);
    try {
      const { sent, failed } = await flushQueue();
      const q = await loadQueue();
      setQueueSize(q.length);
      setStatus(`✅ File vidée — ${sent} envoyés, ${failed} échoués`);
    } catch {
      setStatus('⚠️ Erreur lors du flush de la file');
    } finally {
      setSending(false);
    }
  }, [online]);

  return (
    <View style={styles.container}>
      {/* Statut connexion */}
      <View style={styles.topRow}>
        <View style={[styles.dot, { backgroundColor: online ? '#22c55e' : '#ef4444' }]} />
        <Text style={styles.onlineLabel}>{online ? 'En ligne' : 'Hors ligne'}</Text>
        {queueSize > 0 && (
          <View style={styles.queueBadge}>
            <Text style={styles.queueBadgeText}>{queueSize} en file</Text>
          </View>
        )}
        {!permGranted && (
          <Text style={styles.permWarn}>⚠️ SMS non autorisé</Text>
        )}
      </View>

      {/* Boîte statut */}
      <View style={styles.statusBox}>
        {sending && <ActivityIndicator size="small" color="#C9A857" style={{ marginRight: 8 }} />}
        <Text style={styles.statusText} numberOfLines={2}>{status}</Text>
      </View>

      {/* Bouton flush */}
      {queueSize > 0 && (
        <TouchableOpacity style={styles.flushBtn} onPress={handleFlush} disabled={sending}>
          <Text style={styles.flushBtnText}>
            🔄 Envoyer la file ({queueSize} SMS)
          </Text>
        </TouchableOpacity>
      )}

      {/* Liste SMS */}
      <Text style={styles.sectionTitle}>
        Derniers SMS interceptés ({smsList.length}/10)
      </Text>
      <FlatList
        data={smsList}
        keyExtractor={item => String(item.timestamp)}
        renderItem={({ item }) => <SmsCard sms={item} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyText}>
              En attente de SMS Mobile Money{'\n'}(Wave, Orange Money, Moov, MTN)
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f9', padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  onlineLabel: { fontSize: 12, color: '#555', flex: 1 },
  queueBadge: { backgroundColor: '#C9A857', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  queueBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  permWarn: { color: '#ef4444', fontSize: 11, marginLeft: 8 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#C9A857',
    elevation: 1,
  },
  statusText: { fontSize: 13, color: '#0A2342', flex: 1 },
  flushBtn: {
    backgroundColor: '#0A2342',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  flushBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0A2342', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, lineHeight: 20 },
});
