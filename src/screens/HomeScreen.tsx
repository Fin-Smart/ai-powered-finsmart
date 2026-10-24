import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export function HomeScreen() {
  const { theme, preference, setPreference, isDark } = useTheme();
  const { colors, spacing, typography, radius } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
      <Text
        style={{
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.fontSize.hero,
          color: colors.text,
          letterSpacing: -0.5,
        }}>
        Premier League
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.fontSize.md,
          color: colors.accent,
          marginTop: spacing.xs,
          marginBottom: spacing.xl,
        }}>
        Theme: {preference} · {isDark ? 'dark' : 'light'}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
        {[colors.accent, colors.accentMagenta, colors.accentCyan, colors.primary].map((swatch) => (
          <View
            key={swatch}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.sm,
              backgroundColor: swatch,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['system', 'light', 'dark'] as const).map((mode) => {
          const active = preference === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setPreference(mode)}
              style={{
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
              }}>
              <Text
                style={{
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: typography.fontSize.sm,
                  color: active ? colors.onPrimary : colors.text,
                  textTransform: 'capitalize',
                }}>
                {mode}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <StatusBar style={colors.statusBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
