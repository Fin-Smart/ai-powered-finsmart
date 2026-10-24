import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { formatWhen } from '../../lib/formatWhen';
import type { RiskLevel } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { RiskBadge } from './RiskBadge';

const AVATAR_SIZE = 44;

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
  const [logoFailed, setLogoFailed] = useState(false);
  const initial = title.match(/[A-Za-z0-9]/)?.[0].toUpperCase() ?? '#';
  const showLogo = Boolean(avatarUri) && level === 'safe' && !logoFailed;

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
      <View
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          backgroundColor: level === 'scam' ? colors.secondaryMuted : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        {showLogo && avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            onError={() => setLogoFailed(true)}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{ width: AVATAR_SIZE * 0.62, height: AVATAR_SIZE * 0.62 }}
          />
        ) : (
          <Text
            style={{
              color: level === 'scam' ? colors.secondary : colors.text,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.md,
            }}>
            {initial}
          </Text>
        )}
      </View>

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
