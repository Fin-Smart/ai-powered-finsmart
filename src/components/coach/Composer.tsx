import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useTheme } from '../../theme/ThemeProvider';
import { GlassGroup, GlassSurface, isLiquidGlassEnabled } from '../GlassSurface';
import { MicIcon, PaperPlaneIcon, StopIcon } from '../icons';

const HEIGHT = 50;

type ComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isResponding: boolean;
};

export function Composer({ value, onChangeText, onSend, onStop, isResponding }: ComposerProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const voice = useVoiceInput(onChangeText);
  const hasText = value.trim().length > 0;

  const action = isResponding
    ? {
        label: 'Stop response',
        tint: undefined,
        onPress: onStop,
        icon: <StopIcon size={20} color={colors.text} />,
      }
    : voice.isListening
      ? {
          label: 'Stop listening',
          tint: colors.secondary,
          onPress: voice.stop,
          icon: <StopIcon size={20} color={colors.onSecondary} />,
        }
      : hasText
        ? {
            label: 'Send message',
            tint: colors.primary,
            onPress: onSend,
            icon: <PaperPlaneIcon size={21} color={colors.onPrimary} />,
          }
        : {
            label: 'Talk to Smart Coach',
            tint: undefined,
            onPress: () => void voice.start(value),
            icon: <MicIcon size={22} color={colors.text} />,
          };

  const pulseScale = voice.level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });

  return (
    <GlassGroup spacing={10} style={styles.row}>
      <GlassSurface interactive={false} style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!voice.isListening}
          placeholder={voice.isListening ? 'Listening…' : 'Message…'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          accessibilityLabel="Message Smart Coach"
          style={{
            maxHeight: 120,
            paddingHorizontal: spacing.md + 2,
            paddingTop: 13,
            paddingBottom: 13,
            color: colors.text,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.md,
          }}
        />
      </GlassSurface>

      <View style={styles.actionSlot}>
        {voice.isListening ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulse,
              { backgroundColor: colors.secondaryMuted, transform: [{ scale: pulseScale }] },
            ]}
          />
        ) : null}
        <GlassSurface tintColor={action.tint} style={styles.action}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actionPressable,
              pressed && !isLiquidGlassEnabled && { opacity: 0.7 },
            ]}>
            {action.icon}
          </Pressable>
        </GlassSurface>
      </View>
    </GlassGroup>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  field: {
    flex: 1,
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    justifyContent: 'center',
  },
  actionSlot: {
    width: HEIGHT,
    height: HEIGHT,
  },
  pulse: {
    ...StyleSheet.absoluteFill,
    borderRadius: HEIGHT / 2,
  },
  action: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
  },
  actionPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
