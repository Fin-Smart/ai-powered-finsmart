import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking } from 'react-native';

import { toast } from '../components/toast/toastStore';
import { speechRecognition } from '../lib/speech';

const IGNORED_ERRORS = new Set(['aborted', 'no-speech', 'speech-timeout', 'interrupted']);

const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale;
const RECOGNITION_LANG = deviceLocale?.toLowerCase().startsWith('en') ? deviceLocale : 'en-US';

const joinText = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join(' ');

function showPermissionToast() {
  toast.error('Allow microphone and speech recognition access to talk to Smart Coach.', {
    action: { label: 'Settings', onPress: () => void Linking.openSettings() },
  });
}

/** Live dictation: calls `onTranscript` with the full text (existing draft + speech) as words arrive. */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const level = useRef(new Animated.Value(0)).current;
  const onTranscriptRef = useRef(onTranscript);
  const prefixRef = useRef('');
  const finalizedRef = useRef('');

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const recognizer = speechRecognition?.ExpoSpeechRecognitionModule;
    if (!recognizer) {
      return;
    }

    const subscriptions = [
      recognizer.addListener('start', () => setIsListening(true)),
      recognizer.addListener('end', () => {
        setIsListening(false);
        level.setValue(0);
      }),
      recognizer.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript ?? '';
        // Android's continuous mode emits one final result per spoken segment, so finals accumulate.
        if (event.isFinal) {
          finalizedRef.current = joinText(finalizedRef.current, transcript);
        }
        const spoken = event.isFinal ? finalizedRef.current : joinText(finalizedRef.current, transcript);
        onTranscriptRef.current(joinText(prefixRef.current, spoken));
      }),
      recognizer.addListener('error', (event) => {
        if (IGNORED_ERRORS.has(event.error)) {
          return;
        }
        if (event.error === 'not-allowed') {
          showPermissionToast();
        } else if (event.error === 'network') {
          toast.error('Voice input needs an internet connection on this device.');
        } else if (event.error === 'language-not-supported') {
          toast.error("Voice input doesn't support your device language yet.");
        } else {
          toast.error("Couldn't hear you. Please try again.");
        }
      }),
      recognizer.addListener('volumechange', (event) => {
        level.setValue(Math.min(Math.max(event.value, 0) / 10, 1));
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      recognizer.abort();
    };
  }, [level]);

  const start = useCallback(async (currentText: string) => {
    const recognizer = speechRecognition?.ExpoSpeechRecognitionModule;

    if (!recognizer) {
      toast.error("Voice input isn't available in this build of FinSmart.");
      return;
    }
    if (!recognizer.isRecognitionAvailable()) {
      toast.error("Speech recognition isn't available on this device.");
      return;
    }

    const permission = await recognizer.requestPermissionsAsync();
    if (!permission.granted) {
      showPermissionToast();
      return;
    }

    prefixRef.current = currentText;
    finalizedRef.current = '';
    recognizer.start({
      lang: RECOGNITION_LANG,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }, []);

  const stop = useCallback(() => {
    speechRecognition?.ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, level, start, stop };
}
