import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface IncomingSms {
  body: string;
  originatingAddress: string;
}

export interface SmsSubscription {
  remove(): void;
}

// NativeModules.RNSmsListener est fourni par le module natif Android.
// Sur simulateur ou si non installé, on renvoie un stub no-op.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nativeModule = NativeModules.RNSmsListener as any;
const emitter: NativeEventEmitter | null = nativeModule
  ? new NativeEventEmitter(nativeModule)
  : null;

const SmsListener = {
  addListener(callback: (message: IncomingSms) => void): SmsSubscription {
    if (Platform.OS !== 'android' || !emitter) {
      return { remove: () => {} };
    }
    const sub = emitter.addListener('onSMSReceived', callback);
    return { remove: () => sub.remove() };
  },
};

export default SmsListener;
