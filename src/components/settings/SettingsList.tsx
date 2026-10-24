import { Children, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { ChevronRightIcon, type IconProps } from '../icons';

export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
          {title}
        </Text>
      ) : null}
      <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, overflow: 'hidden' }}>
        {rows.map((row, index) => (
          <View key={index}>
            {index === 0 ? null : <View style={{ height: 0.5, marginLeft: 56, backgroundColor: colors.border }} />}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <Text
          style={{
            paddingHorizontal: spacing.xs,
            color: colors.textMuted,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.xs,
            lineHeight: 17,
          }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type SettingsRowProps = {
  Icon: ComponentType<IconProps>;
  label: string;
  value?: string;
  destructive?: boolean;
  busy?: boolean;
  /** Rows without a handler are read-only and show no chevron. */
  onPress?: () => void;
};

export function SettingsRow({ Icon, label, value, destructive, busy, onPress }: SettingsRowProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const tint = destructive ? colors.secondary : colors.text;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      disabled={!onPress || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
        minHeight: 54,
        paddingHorizontal: spacing.md,
        backgroundColor: pressed ? colors.fill : 'transparent',
      })}>
      <View style={{ width: 28, alignItems: 'center' }}>
        <Icon size={22} color={tint} />
      </View>
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: tint, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.md }}>
        {label}
      </Text>
      {busy ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : value ? (
        <Text
          numberOfLines={1}
          style={{ maxWidth: '45%', color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          {value}
        </Text>
      ) : null}
      {onPress && !busy && !destructive ? <ChevronRightIcon size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}
