import type { ComponentType } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import type { IconProps } from '../icons';

type SourceCardProps = {
  Icon: ComponentType<IconProps>;
  title: string;
  description: string;
  status: string;
  footnote?: string;
};

export function SourceCard({ Icon, title, description, status, footnote }: SourceCardProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  return (
    <View
      style={{
        gap: spacing.sm,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
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
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.fontSize.xs,
          }}>
          {status}
        </Text>
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
