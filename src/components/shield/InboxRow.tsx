import { Pressable, Text, View } from 'react-native';

import { formatWhen } from '../../lib/formatWhen';
import type { RiskLevel } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { RiskBadge } from './RiskBadge';
import { SenderAvatar } from './SenderAvatar';

type InboxRowProps = {
  title: string;
  preview: string;
  date: number;
  unread: boolean;
  level: RiskLevel;
  /** Sender logo; ignored for flagged messages so a spoofed sender never borrows a real brand's logo. */
  avatarUri?: string | null;
  onPress: () => void;
};

export function InboxRow({ title, preview, date, unread, level, avatarUri, onPress }: InboxRowProps) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${level === 'safe' ? '' : level === 'scam' ? 'Likely scam. ' : 'Suspicious. '}${preview}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.sm + 4,
        paddingVertical: spacing.sm + 2,
        backgroundColor: pressed ? colors.surface : 'transparent',
      })}>
      <SenderAvatar name={title} level={level} logoUri={avatarUri} />

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: unread ? typography.fontFamily.bold : typography.fontFamily.semiBold,
              fontSize: typography.fontSize.md,
            }}>
            {title}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
            {formatWhen(date)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text
            numberOfLines={2}
            style={{
              flex: 1,
              color: unread ? colors.text : colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.sm,
            }}>
            {preview}
          </Text>
          {unread ? <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary }} /> : null}
        </View>
        {level !== 'safe' ? (
          <View style={{ marginTop: spacing.xs }}>
            <RiskBadge level={level} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
