import { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { GlassSurface } from '../GlassSurface';
import { dialog, useCurrentDialog, type Dialog, type DialogButton } from './dialogStore';

const MAX_WIDTH = 340;
const BUTTON_HEIGHT = 48;

export function DialogLayer() {
  const current = useCurrentDialog();
  return current ? <DialogCard key={current.id} item={current} /> : null;
}

function DialogCard({ item }: { item: Dialog }) {
  const { colors, spacing, typography } = useTheme().theme;
  const { width } = useWindowDimensions();
  const backdrop = useRef(new Animated.Value(0)).current;
  // Liquid glass stops rendering below full opacity, so the card only scales; the backdrop fades.
  const scale = useRef(new Animated.Value(1.08)).current;
  const closing = useRef(false);

  const close = useCallback(
    (button?: DialogButton) => {
      if (closing.current) return;
      closing.current = true;
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 160, useNativeDriver: true }),
      ]).start(() => {
        dialog.dismiss(item.id);
        button?.onPress?.();
      });
    },
    [backdrop, item.id, scale],
  );

  const cancelButton = item.buttons.find((button) => button.style === 'cancel');

  useEffect(() => {
    Keyboard.dismiss();
    AccessibilityInfo.announceForAccessibility([item.title, item.message].filter(Boolean).join('. '));
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 260, useNativeDriver: true }),
    ]).start();

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close(cancelButton);
      return true;
    });
    return () => subscription.remove();
  }, [backdrop, cancelButton, close, item.message, item.title, scale]);

  const sideBySide = item.buttons.length === 2;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 900, elevation: 20 }]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: backdrop }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: spacing.lg }]}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{ width: Math.min(width - spacing.xl * 2, MAX_WIDTH), transform: [{ scale }] }}>
          <GlassSurface interactive={false} style={{ borderRadius: 34, padding: spacing.lg, gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={{
                  textAlign: 'center',
                  color: colors.text,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: typography.fontSize.lg,
                }}>
                {item.title}
              </Text>
              {item.message ? (
                <Text
                  style={{
                    textAlign: 'center',
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.sm,
                    lineHeight: 20,
                  }}>
                  {item.message}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: spacing.sm }}>
              {item.buttons.map((button) => (
                <DialogAction
                  key={button.label}
                  button={button}
                  fill={sideBySide}
                  onPress={() => close(button)}
                />
              ))}
            </View>
          </GlassSurface>
        </Animated.View>
      </View>
    </View>
  );
}

function DialogAction({ button, fill, onPress }: { button: DialogButton; fill: boolean; onPress: () => void }) {
  const { colors, typography } = useTheme().theme;

  const palette =
    button.style === 'destructive'
      ? { background: colors.secondary, foreground: colors.onSecondary }
      : button.style === 'cancel'
        ? { background: colors.fill, foreground: colors.text }
        : { background: colors.primary, foreground: colors.onPrimary };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: fill ? 1 : undefined,
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.background,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={{ color: palette.foreground, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
        {button.label}
      </Text>
    </Pressable>
  );
}
