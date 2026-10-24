import { requireOptionalNativeModule } from 'expo';

type SpeechRecognitionPackage = typeof import('expo-speech-recognition');

/**
 * `null` when the native module isn't in the binary (e.g. Expo Go). The package throws on
 * import in that case, so it's only required once the native module is known to exist.
 */
export const speechRecognition: SpeechRecognitionPackage | null = requireOptionalNativeModule(
  'ExpoSpeechRecognition',
)
  ? require('expo-speech-recognition')
  : null;
