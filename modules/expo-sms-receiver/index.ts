import { requireNativeModule, EventEmitter, Subscription } from 'expo-modules-core';

export interface SmsReceivedEvent {
  body: string;
  originatingAddress: string;
}

const ExpoSmsReceiver = requireNativeModule('ExpoSmsReceiver');
const emitter = new EventEmitter(ExpoSmsReceiver);

export function startListening(): void {
  ExpoSmsReceiver.startListening();
}

export function stopListening(): void {
  ExpoSmsReceiver.stopListening();
}

export function addSmsListener(
  listener: (event: SmsReceivedEvent) => void,
): Subscription {
  return emitter.addListener<SmsReceivedEvent>('onSmsReceived', listener);
}
