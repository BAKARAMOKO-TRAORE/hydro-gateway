import { Platform } from 'react-native';
import {
  startListening,
  stopListening,
  addSmsListener,
  SmsReceivedEvent,
} from 'expo-sms-receiver';

export interface IncomingSms {
  body: string;
  originatingAddress: string;
}

export interface SmsSubscription {
  remove(): void;
}

const SmsListener = {
  addListener(callback: (message: IncomingSms) => void): SmsSubscription {
    if (Platform.OS !== 'android') {
      return { remove: () => {} };
    }

    startListening();

    const sub = addSmsListener((event: SmsReceivedEvent) => {
      callback({
        body: event.body,
        originatingAddress: event.originatingAddress,
      });
    });

    return {
      remove: () => {
        sub.remove();
        stopListening();
      },
    };
  },
};

export default SmsListener;
