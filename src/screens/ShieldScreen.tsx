import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { ComposeIcon, MailIcon, MessageIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { ComposeSheet } from '../components/shield/ComposeSheet';
import { EmailSheet } from '../components/shield/EmailSheet';
import { InboxRow } from '../components/shield/InboxRow';
import { MessageChecker } from '../components/shield/MessageChecker';
import { SourceCard } from '../components/shield/SourceCard';
import { ThreadSheet } from '../components/shield/ThreadSheet';
import { assessConversation, assessEmail, isFlagged } from '../shield/assess';
import type { GmailMessage } from '../shield/gmail';
import { senderLogoUrl } from '../shield/senderLogo';
import { takePendingSmsAction, usePendingSmsAction } from '../shield/smsLaunch';
import { useGmailScan, type GmailStatus } from '../shield/useGmailScan';
import { useSmsInbox } from '../shield/useSmsInbox';
import { useTheme } from '../theme/ThemeProvider';

const PAGE_SIZE = 20;

type Filter = 'all' | 'flagged';

const GMAIL_STATUS_LABEL: Record<GmailStatus, string> = {
  unavailable: 'Unavailable',
  signedOut: 'Not connected',
  needsAccess: 'Not connected',
  paused: 'Off',
  loading: 'Checking…',
  ready: 'On',
  error: 'Not synced',
};

const UNAVAILABLE_NOTE = 'Update FinSmart to the latest version to turn this on.';

export function ShieldScreen() {
  const { colors, spacing, typography } = useTheme().theme;
  const sms = useSmsInbox();
  const gmail = useGmailScan();
  const pendingAction = usePendingSmsAction();

  const [filter, setFilter] = useState<Filter>('all');
  const [smsLimit, setSmsLimit] = useState(PAGE_SIZE);
  const [openThread, setOpenThread] = useState<{ threadId: string; address: string } | null>(null);
  const [composeDraft, setComposeDraft] = useState<{ address: string; body: string } | null>(null);
  const [openEmail, setOpenEmail] = useState<GmailMessage | null>(null);

  useEffect(() => {
    if (!pendingAction) return;
    const action = takePendingSmsAction();
    if (action?.type === 'thread') {
      const conversation = sms.conversations.find((item) => item.threadId === action.threadId);
      setOpenThread({ threadId: action.threadId, address: conversation?.address ?? 'Messages' });
    } else if (action?.type === 'compose') {
      setComposeDraft({ address: action.address, body: action.body });
    }
  }, [pendingAction, sms.conversations]);

  const assessedTexts = useMemo(
    () => sms.conversations.map((conversation) => ({ conversation, assessment: assessConversation(conversation) })),
    [sms.conversations],
  );
  const assessedEmails = useMemo(
    () => gmail.emails.map((email) => ({ email, assessment: assessEmail(email) })),
    [gmail.emails],
  );

  const visibleTexts = assessedTexts.filter((item) => filter === 'all' || isFlagged(item.assessment));
  const visibleEmails = assessedEmails.filter((item) => filter === 'all' || isFlagged(item.assessment));
  const flaggedCount =
    assessedTexts.filter((item) => isFlagged(item.assessment)).length +
    assessedEmails.filter((item) => isFlagged(item.assessment)).length;

  const showTexts = Platform.OS === 'android' && sms.isDefault;
  const showEmails = gmail.status === 'ready' || (gmail.status === 'loading' && gmail.emails.length > 0);

  const sectionTitle = {
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 2,
    color: colors.text,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
  } as const;

  const emptyText = {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    paddingVertical: spacing.sm,
  } as const;

  const smsCard = !sms.isSupported
    ? { status: 'Unavailable', footnote: UNAVAILABLE_NOTE }
    : sms.isDefault
      ? { status: 'On' }
      : {
          status: 'Off',
          action: { label: 'Set as SMS app', onPress: () => void sms.becomeDefault(), busy: sms.isRequesting },
          footnote: "Picture and group messages aren't supported. You can change your SMS app at any time in Settings.",
        };

  const gmailAction =
    gmail.status === 'signedOut'
      ? { label: 'Continue with Google', onPress: () => void gmail.connect(), busy: gmail.isConnecting }
      : gmail.status === 'needsAccess'
        ? { label: 'Connect Gmail', onPress: () => void gmail.connect(), busy: gmail.isConnecting }
        : gmail.status === 'error'
          ? { label: 'Retry', onPress: () => void gmail.refresh() }
          : undefined;

  return (
    <Screen title="Shield" subtitle="Scam protection for your texts and email.">
      <View style={{ gap: spacing.sm + 2, marginTop: spacing.lg }}>
        {Platform.OS === 'android' ? (
          <SourceCard
            Icon={MessageIcon}
            title="Text messages"
            description="Shield checks every text as it arrives and warns you before you act on a scam."
            {...smsCard}
          />
        ) : null}
        <SourceCard
          Icon={MailIcon}
          title="Gmail"
          status={GMAIL_STATUS_LABEL[gmail.status]}
          description="Shield checks your recent emails on this phone for fake banks, prize scams and payment requests."
          action={gmailAction}
          toggle={
            gmail.status === 'ready' || gmail.status === 'loading' || gmail.status === 'paused' || gmail.status === 'error'
              ? { value: gmail.enabled, onValueChange: (value) => void gmail.setEnabled(value) }
              : undefined
          }
          footnote={gmail.status === 'unavailable' ? UNAVAILABLE_NOTE : undefined}
        />
        {Platform.OS === 'ios' ? (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.xs,
              lineHeight: 18,
            }}>
            iPhone doesn't allow apps to read text messages. To check a text, copy it into Check a message below.
          </Text>
        ) : null}
      </View>

      {showTexts || showEmails ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          {(['all', 'flagged'] as const).map((option) => {
            const selected = filter === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(option)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 999,
                  backgroundColor: selected ? colors.text : colors.surface,
                }}>
                <Text
                  style={{
                    color: selected ? colors.background : colors.text,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: typography.fontSize.sm,
                  }}>
                  {option === 'all' ? 'All' : `Flagged${flaggedCount ? ` (${flaggedCount})` : ''}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {showTexts ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', ...sectionTitle }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
              Messages
            </Text>
            {sms.isLoading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New message"
              onPress={() => setComposeDraft({ address: '', body: '' })}
              hitSlop={10}
              style={({ pressed }) => ({ marginLeft: spacing.md, opacity: pressed ? 0.5 : 1 })}>
              <ComposeIcon size={24} color={colors.text} />
            </Pressable>
          </View>

          {visibleTexts.length === 0 ? (
            <Text style={emptyText}>{filter === 'flagged' ? 'No flagged texts.' : 'No texts yet.'}</Text>
          ) : (
            visibleTexts.slice(0, smsLimit).map(({ conversation, assessment }) => (
              <InboxRow
                key={conversation.threadId}
                title={conversation.address}
                preview={conversation.lastDirection === 'out' ? `You: ${conversation.snippet}` : conversation.snippet}
                date={conversation.date}
                unread={conversation.unreadCount > 0}
                level={assessment.level}
                onPress={() => setOpenThread({ threadId: conversation.threadId, address: conversation.address })}
              />
            ))
          )}
          {visibleTexts.length > smsLimit ? (
            <Pressable accessibilityRole="button" onPress={() => setSmsLimit((limit) => limit + PAGE_SIZE)} style={{ paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                Show more
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {showEmails ? (
        <>
          <Text accessibilityRole="header" style={sectionTitle}>
            Email
          </Text>
          {visibleEmails.length === 0 ? (
            <Text style={emptyText}>
              {filter === 'flagged' ? 'No flagged emails in the last 14 days.' : 'No emails in the last 14 days.'}
            </Text>
          ) : (
            visibleEmails.map(({ email, assessment }) => (
              <InboxRow
                key={email.id}
                title={email.fromName}
                preview={`${email.subject} · ${email.snippet}`}
                date={email.date}
                unread={email.unread}
                level={assessment.level}
                avatarUri={senderLogoUrl(email.fromAddress)}
                onPress={() => setOpenEmail(email)}
              />
            ))
          )}
        </>
      ) : null}

      <Text accessibilityRole="header" style={sectionTitle}>
        Check a message
      </Text>
      <MessageChecker />

      <ThreadSheet thread={openThread} onClose={() => setOpenThread(null)} />
      <ComposeSheet
        draft={composeDraft}
        onClose={() => setComposeDraft(null)}
        onSent={(thread) => {
          setComposeDraft(null);
          setOpenThread(thread);
        }}
      />
      <EmailSheet email={openEmail} onClose={() => setOpenEmail(null)} />
    </Screen>
  );
}
