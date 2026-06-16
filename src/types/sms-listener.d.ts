declare module 'react-native-sms-listener' {
  interface IncomingSms {
    body: string;
    originatingAddress: string;
  }

  interface SmsSubscription {
    remove(): void;
  }

  interface SmsListenerStatic {
    addListener(callback: (message: IncomingSms) => void): SmsSubscription;
  }

  const SmsListener: SmsListenerStatic;
  export default SmsListener;
}
