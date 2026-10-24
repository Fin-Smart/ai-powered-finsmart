import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { GlassSurface } from '../GlassSurface';
import { AlertIcon, CheckIcon, InfoIcon } from '../icons';
import { toast, useCurrentToast, type Toast } from './toastStore';

const HIDDEN_OFFSET = -180;
const SWIPE_DISMISS_DISTANCE = 24;

export function ToastLayer({ topOffset }: { topOffset?: number }) {
  const insets = useSafeAreaInsets();
  const current = useCurrentToast();

  if (!current) return null;
  return <ToastCard key={current.id} item={current} top={topOffset ?? insets.top + 8} />;
}

function ToastCard({ item, top }: { item: Toast; top: number }) {
  const { colors, spacing, typography } = useTheme().theme;
  // Liquid glass stops rendering below full opacity, so the toast only ever slides, never fades.
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;

  const hide = useCallback(() => {
    Animated.timing(translateY, { toValue: HIDDEN_OFFSET, duration: 180, useNativeDriver: true }).start(() =>
      toast.dismiss(item.id),
    );
  }, [item.id, translateY]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(item.message);
    Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }).start();
    const timer = setTimeout(hide, item.duration);
    return () => clearTimeout(timer);
  }, [hide, item.duration, item.message, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderMove: (_, gesture) => translateY.setValue(Math.min(gesture.dy, 0)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -SWIPE_DISMISS_DISTANCE) {
          hide();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const accent = item.kind === 'success' ? colors.primary : item.kind === 'error' ? colors.secondary : colors.text;
  const accentFill =
    item.kind === 'success' ? colors.primaryMuted : item.kind === 'error' ? colors.secondaryMuted : colors.fill;
  const Icon = item.kind === 'success' ? CheckIcon : item.kind === 'error' ? AlertIcon : InfoIcon;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityLiveRegion={item.kind === 'error' ? 'assertive' : 'polite'}
      style={{
        position: 'absolute',
        top,
        left: spacing.md,
        right: spacing.md,
        zIndex: 1000,
        elevation: 24,
        transform: [{ translateY }],
      }}>
      <GlassSurface style={{ borderRadius: 24 }}>
        <Pressable
          accessibilityRole="alert"
          accessibilityHint="Tap or swipe up to dismiss"
          onPress={hide}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm + 4,
            paddingVertical: spacing.sm + 4,
            paddingLeft: spacing.sm + 4,
            paddingRight: item.action ? spacing.sm : spacing.md,
          }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: accentFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon size={19} color={accent} strokeWidth={2} />
          </View>

          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.sm,
              lineHeight: 20,
            }}>
            {item.message}
          </Text>

          {item.action ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                item.action?.onPress();
                hide();
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm + 4,
                borderRadius: 999,
                backgroundColor: accentFill,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ color: accent, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                {item.action.label}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </GlassSurface>
    </Animated.View>
  );
}
