import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SmsMessage } from '../types';

const OP_COLORS: Record<string, string> = {
  Wave: '#1B7FD7',
  'Orange Money': '#FF7900',
  'Moov Money': '#00B0D8',
  MTN: '#c29e00',
};

interface Props {
  sms: SmsMessage;
}

export default function SmsCard({ sms }: Props) {
  const color = sms.operateur ? (OP_COLORS[sms.operateur] ?? '#888') : '#888';
  const date = new Date(sms.timestamp).toLocaleString('fr-CI');

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{sms.operateur ?? 'Inconnu'}</Text>
      </View>
      <Text style={styles.body} numberOfLines={3}>{sms.body}</Text>
      <Text style={styles.meta}>{sms.expediteur}  ·  {date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { fontSize: 13, color: '#1a1a1a', lineHeight: 18, marginBottom: 6 },
  meta: { fontSize: 11, color: '#999' },
});
