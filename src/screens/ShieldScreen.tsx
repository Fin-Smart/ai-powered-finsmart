import { Platform, Text, View } from 'react-native';

import { MailIcon, MessageIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { MessageChecker } from '../components/shield/MessageChecker';
import { SourceCard } from '../components/shield/SourceCard';
import { useTheme } from '../theme/ThemeProvider';

export function ShieldScreen() {
  const { colors, spacing, typography } = useTheme().theme;

  const sectionTitle = {
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 2,
    color: colors.text,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
  } as const;

  return (
    <Screen title="Shield" subtitle="Spot money scams in your texts and emails.">
      <Text accessibilityRole="header" style={sectionTitle}>
        Protection
      </Text>
      <View style={{ gap: spacing.sm + 2 }}>
        {Platform.OS === 'android' ? (
          <SourceCard
            Icon={MessageIcon}
            title="Text messages"
            status="Not connected"
            description="Make FinSmart your default SMS app and Shield checks every text you receive, flagging scams before you act on them."
            footnote="Setup arrives in the next update."
          />
        ) : null}
        <SourceCard
          Icon={MailIcon}
          title="Gmail"
          status="Not connected"
          description="Sign in with Google and Shield scans your inbox for fake banks, prize scams and payment requests."
          footnote="Setup arrives in the next update."
        />
        {Platform.OS === 'ios' ? (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.xs,
              lineHeight: 18,
            }}>
            iPhone doesn't let apps read your texts. You can still paste a suspicious text below to check it.
          </Text>
        ) : null}
      </View>

      <Text accessibilityRole="header" style={sectionTitle}>
        Check a message
      </Text>
      <MessageChecker />
    </Screen>
  );
}
