import type { ComponentType } from 'react';
import { ActivityIndicator, Platform, Pressable, Switch, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import type { IconProps } from '../icons';

type SourceCardProps = {
  Icon: ComponentType<IconProps>;
  title: string;
  description: string;
  status: string;
  footnote?: string;
  action?: { label: string; onPress: () => void; busy?: boolean };
  /** Replaces the status text with an on/off switch. */
  toggle?: { value: boolean; onValueChange: (value: boolean) => void };
};

export function SourceCard({ Icon, title, description, status, footnote, action, toggle }: SourceCardProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  return (
    <View
      style={{
        gap: spacing.sm,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 4,
          minHeight: 56,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          borderRadius: radius.xl,
        }}>
        <View
          style={{
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon size={22} color={colors.text} />
        </View>
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.fontSize.md,
          }}>
          {title}
        </Text>
        {toggle ? (
          <View style={{ height: 56, justifyContent: 'center' }}>
            <Switch
              accessibilityLabel={`${title} checks`}
              value={toggle.value}
              onValueChange={toggle.onValueChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? colors.onPrimary : undefined}
              ios_backgroundColor={colors.border}
              style={{ marginVertical: 0 }}
            />
          </View>
        ) : (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.xs,
            }}>
            {status}
          </Text>
        )}
      </View>

      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.sm,
          lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
        }}>
        {description}
      </Text>

      {action ? (
        <Pressable
          accessibilityRole="button"
          disabled={action.busy}
          onPress={action.onPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            alignSelf: 'flex-start',
            paddingVertical: spacing.sm + 2,
            paddingHorizontal: spacing.md + 4,
            borderRadius: 999,
            backgroundColor: colors.primary,
            opacity: pressed || action.busy ? 0.7 : 1,
          })}>
          {action.busy ? <ActivityIndicator size="small" color={colors.onPrimary} /> : null}
          <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}

      {footnote ? (
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.fontSize.xs,
          }}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}
