import { ScrollView, Text, View } from 'react-native';

import { formatWhen } from '../../lib/formatWhen';
import { assessEmail, emailInput } from '../../shield/assess';
import type { GmailMessage } from '../../shield/gmail';
import { useTheme } from '../../theme/ThemeProvider';
import { Sheet } from '../Sheet';
import { ScamVerdict } from './ScamVerdict';

export function EmailSheet({ email, onClose }: { email: GmailMessage | null; onClose: () => void }) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <Sheet visible={email !== null} title={email?.subject ?? ''} subtitle={email?.fromName} onClose={onClose}>
      {email ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <ScamVerdict key={email.id} input={emailInput(email)} assessment={assessEmail(email)} />

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
              From {email.fromAddress} · {formatWhen(email.date)}
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.sm,
                lineHeight: 21,
              }}>
              {email.body || email.snippet}
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </Sheet>
  );
}
