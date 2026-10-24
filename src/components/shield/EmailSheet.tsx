import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatWhen } from '../../lib/formatWhen';
import { assessEmail, emailInput } from '../../shield/assess';
import type { GmailMessage } from '../../shield/gmail';
import { senderLogoUrl } from '../../shield/senderLogo';
import { useTheme } from '../../theme/ThemeProvider';
import { AlertIcon, CheckIcon, MailIcon } from '../icons';
import { Sheet } from '../Sheet';
import { toast } from '../toast/toastStore';
import { Bullet, CoachSecondOpinion } from './ScamVerdict';
import { SenderAvatar } from './SenderAvatar';

export function EmailSheet({ email, onClose }: { email: GmailMessage | null; onClose: () => void }) {
  return (
    <Sheet visible={email !== null} title="" onClose={onClose}>
      {email ? <EmailView key={email.id} email={email} /> : null}
    </Sheet>
  );
}

function EmailView({ email }: { email: GmailMessage }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const assessment = assessEmail(email);
  const input = emailInput(email);
  const flagged = assessment.level !== 'safe';

  const openInGmail = () => {
    Linking.openURL(`https://mail.google.com/mail/u/0/#all/${email.id}`).catch(() =>
      toast.error("Couldn't open Gmail on this device."),
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
      }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: spacing.xs }}>
        <Text
          selectable
          accessibilityRole="header"
          style={{
            flexShrink: 1,
            color: colors.text,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.xl,
            lineHeight: 30,
          }}>
          {email.subject}
        </Text>
        <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.fill }}>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 11 }}>Inbox</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginTop: spacing.lg }}>
        <SenderAvatar name={email.fromName} level={assessment.level} logoUri={senderLogoUrl(email.fromAddress)} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
              {email.fromName}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
              {formatWhen(email.date)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            selectable
            style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
            {email.fromAddress} · to me
          </Text>
        </View>
      </View>

      {flagged ? (
        <View
          style={{
            marginTop: spacing.lg,
            padding: spacing.md,
            gap: spacing.sm + 2,
            borderRadius: radius.lg,
            backgroundColor: colors.secondaryMuted,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AlertIcon size={20} color={colors.secondary} strokeWidth={2} />
            <Text style={{ flex: 1, color: colors.secondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
              {assessment.level === 'scam' ? 'This looks like a scam' : 'Be careful with this email'}
            </Text>
          </View>
          {assessment.reasons.map((reason) => (
            <Bullet key={reason} text={reason} />
          ))}
          <CoachSecondOpinion input={input} />
        </View>
      ) : (
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.primaryMuted,
            }}>
            <CheckIcon size={18} color={colors.primary} strokeWidth={2} />
            <Text style={{ flex: 1, color: colors.primary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
              No scam signs found
            </Text>
          </View>
          <CoachSecondOpinion input={input} />
        </View>
      )}

      <View style={{ height: 0.5, backgroundColor: colors.border, marginVertical: spacing.lg }} />

      <Text
        selectable
        style={{
          color: colors.text,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.md,
          lineHeight: 24,
        }}>
        {email.body || email.snippet}
      </Text>

      <Pressable
        accessibilityRole="link"
        onPress={openInGmail}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          marginTop: spacing.xl,
          paddingVertical: spacing.sm + 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        })}>
        <MailIcon size={18} color={colors.text} />
        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
          Open in Gmail
        </Text>
      </Pressable>
    </ScrollView>
  );
}
