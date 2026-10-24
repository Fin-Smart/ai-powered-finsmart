import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useColorScheme } from 'react-native';

import { palette } from '../theme';
import { useTheme } from '../theme/ThemeProvider';

const splashIcon = require('../../assets/splash-icon.png');

/** Must match the expo-splash-screen config in app.json so the hand-off is invisible. */
const ICON_SIZE = 180;
const HOLD_MS = 450;

type AnimatedSplashProps = {
  /** The app underneath has finished loading; the splash fades out once its intro has played. */
  ready: boolean;
  onFinish: () => void;
};

/**
 * Takes over from the native splash on the same frame, lifts the owl to reveal the FinSmart name,
 * then fades away to show the app.
 */
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const { typography } = useTheme().theme;
  // The native splash follows the system appearance, not the in-app preference.
  const dark = useColorScheme() === 'dark';
  const intro = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  const finish = useRef(onFinish);
  finish.current = onFinish;
  const [introDone, setIntroDone] = useState(false);

  const start = async () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hide();
    if (await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)) {
      intro.setValue(1);
      setIntroDone(true);
      return;
    }
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(intro, { toValue: 1, damping: 16, stiffness: 140, mass: 0.9, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
    ]).start(() => setIntroDone(true));
  };

  useEffect(() => {
    if (!introDone || !ready) return;
    Animated.timing(exit, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => finish.current());
  }, [introDone, ready, exit]);

  return (
    <Animated.View
      onLayout={() => void start()}
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? palette.black : palette.white,
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          pointerEvents: introDone && ready ? 'none' : 'auto',
        },
      ]}>
      <Animated.Image
        source={splashIcon}
        accessibilityIgnoresInvertColors
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          transform: [
            { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [0, -36] }) },
            { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: '50%',
          marginTop: ICON_SIZE / 2 - 12,
          alignItems: 'center',
          opacity: intro.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
          transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}>
        <Animated.Text
          style={{
            color: dark ? palette.white : palette.black,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.hero,
            letterSpacing: -0.5,
          }}>
          FinSmart
        </Animated.Text>
        <Animated.Text
          style={{
            color: palette.gray400,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.fontSize.sm,
          }}>
          Your pocket money coach
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}
