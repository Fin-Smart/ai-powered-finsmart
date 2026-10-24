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
type ShieldTab = 'email' | 'sms';

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

  const [tab, setTab] = useState<ShieldTab>('email');
  const [emailFilter, setEmailFilter] = useState<Filter>('all');
  const [smsFilter, setSmsFilter] = useState<Filter>('all');
  const [smsLimit, setSmsLimit] = useState(PAGE_SIZE);
  const [openThread, setOpenThread] = useState<{ threadId: string; address: string } | null>(null);
  const [composeDraft, setComposeDraft] = useState<{ address: string; body: string } | null>(null);
  const [openEmail, setOpenEmail] = useState<GmailMessage | null>(null);

  useEffect(() => {
    if (!pendingAction) return;
    const action = takePendingSmsAction();
    if (!action) return;
    setTab('sms');
    if (action.type === 'thread') {
      const conversation = sms.conversations.find((item) => item.threadId === action.threadId);
      setOpenThread({ threadId: action.threadId, address: conversation?.address ?? 'Messages' });
    } else {
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

  const flaggedTexts = assessedTexts.filter((item) => isFlagged(item.assessment)).length;
  const flaggedEmails = assessedEmails.filter((item) => isFlagged(item.assessment)).length;
  const visibleTexts = smsFilter === 'all' ? assessedTexts : assessedTexts.filter((item) => isFlagged(item.assessment));
  const visibleEmails =
    emailFilter === 'all' ? assessedEmails : assessedEmails.filter((item) => isFlagged(item.assessment));

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
      <TabSwitcher
        value={tab}
        onChange={setTab}
        options={[
          { key: 'email', label: 'Email', flagged: flaggedEmails },
          { key: 'sms', label: 'SMS', flagged: flaggedTexts },
        ]}
      />

      <View style={{ display: tab === 'email' ? 'flex' : 'none' }}>
        <View style={{ marginTop: spacing.lg }}>
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
        </View>

        {showEmails ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', ...sectionTitle }}>
              <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
                Inbox
              </Text>
              {gmail.status === 'loading' ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
            </View>
            <FilterPills value={emailFilter} onChange={setEmailFilter} flagged={flaggedEmails} />

            {visibleEmails.length === 0 ? (
              <Text style={emptyText}>
                {emailFilter === 'flagged' ? 'No flagged emails in the last 14 days.' : 'No emails in the last 14 days.'}
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
          Check an email
        </Text>
        <MessageChecker channel="email" />
      </View>

      <View style={{ display: tab === 'sms' ? 'flex' : 'none' }}>
        <View style={{ marginTop: spacing.lg }}>
          {Platform.OS === 'android' ? (
            <SourceCard
              Icon={MessageIcon}
              title="Text messages"
              description="Shield checks every text as it arrives and warns you before you act on a scam."
              {...smsCard}
            />
          ) : (
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.xs,
                lineHeight: 18,
              }}>
              iPhone doesn't allow apps to read text messages. To check a text, paste it into Check a text below.
            </Text>
          )}
        </View>

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
            <FilterPills value={smsFilter} onChange={setSmsFilter} flagged={flaggedTexts} />

            {visibleTexts.length === 0 ? (
              <Text style={emptyText}>{smsFilter === 'flagged' ? 'No flagged texts.' : 'No texts yet.'}</Text>
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

        <Text accessibilityRole="header" style={sectionTitle}>
          Check a text
        </Text>
        <MessageChecker channel="sms" />
      </View>

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

type TabSwitcherProps = {
  value: ShieldTab;
  onChange: (tab: ShieldTab) => void;
  options: { key: ShieldTab; label: string; flagged: number }[];
};

function TabSwitcher({ value, onChange, options }: TabSwitcherProps) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', marginTop: spacing.lg, padding: 4, borderRadius: 999, backgroundColor: colors.surface }}>
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.flagged ? `${option.label}, ${option.flagged} flagged` : option.label}
            onPress={() => onChange(option.key)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs + 2,
              paddingVertical: spacing.sm + 2,
              borderRadius: 999,
              backgroundColor: selected ? colors.text : 'transparent',
            }}>
            <Text
              style={{
                color: selected ? colors.background : colors.text,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.sm,
              }}>
              {option.label}
            </Text>
            {option.flagged ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.secondary,
                }}>
                <Text style={{ color: colors.onSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: 11 }}>
                  {option.flagged}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function FilterPills({ value, onChange, flagged }: { value: Filter; onChange: (filter: Filter) => void; flagged: number }) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
      {(['all', 'flagged'] as const).map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={{
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.md,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? colors.text : colors.border,
              backgroundColor: selected ? colors.text : 'transparent',
            }}>
            <Text
              style={{
                color: selected ? colors.background : colors.text,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.fontSize.xs,
              }}>
              {option === 'all' ? 'All' : `Flagged${flagged ? ` (${flagged})` : ''}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
