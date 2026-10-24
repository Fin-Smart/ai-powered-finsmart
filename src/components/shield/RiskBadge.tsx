import { Text, View } from 'react-native';

import type { RiskLevel } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { AlertIcon, CheckIcon } from '../icons';

const LABELS: Record<RiskLevel, string> = {
  scam: 'Likely scam',
  suspicious: 'Suspicious',
  safe: 'No red flags',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { colors, typography, spacing } = useTheme().theme;

  const palette = {
    scam: { background: colors.secondary, foreground: colors.onSecondary },
    suspicious: { background: colors.secondaryMuted, foreground: colors.secondary },
    safe: { background: colors.primaryMuted, foreground: colors.primary },
  }[level];

  const Icon = level === 'safe' ? CheckIcon : AlertIcon;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        backgroundColor: palette.background,
        borderRadius: 999,
        paddingVertical: 5,
        paddingLeft: spacing.sm,
        paddingRight: spacing.sm + 2,
      }}>
      <Icon size={16} color={palette.foreground} strokeWidth={2} />
      <Text
        style={{
          color: palette.foreground,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.xs,
        }}>
        {LABELS[level]}
      </Text>
    </View>
  );
}
