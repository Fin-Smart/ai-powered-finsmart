import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney } from '../../budget/money';
import {
  FREE_DAILY_TOKENS,
  purchaseTokens,
  subscribePurchases,
  TOKEN_CURRENCY,
  TOKEN_PACKS,
  useTokens,
  type Purchase,
  type TokenPack,
} from '../../lib/aiUsage';
import { formatDay } from '../../budget/period';
import { useTheme } from '../../theme/ThemeProvider';
import { useChartColors, withAlpha } from '../dashboard/palette';
import { dialog } from '../dialog/dialogStore';
import { SparkleIcon } from '../icons';
import { Sheet } from '../Sheet';
import { errorMessage, toast } from '../toast/toastStore';

const numberFormat = new Intl.NumberFormat();

export function TokenStoreSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const chart = useChartColors();
  const insets = useSafeAreaInsets();
  const tokens = useTokens();
  const [buying, setBuying] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const packColors = [chart.blue, chart.purple, chart.orange, chart.green];

  useEffect(() => {
    if (!visible || !tokens.uid) return;
    return subscribePurchases(tokens.uid, setPurchases, () =>
      toast.error("Couldn't load your purchases. Please try again."),
    );
  }, [tokens.uid, visible]);

  const buy = async (pack: TokenPack) => {
    const confirmed = await dialog.confirm({
      title: `Buy ${numberFormat.format(pack.tokens)} tokens?`,
      message: `${formatMoney(pack.priceCents, TOKEN_CURRENCY)}. This is a test purchase, so no money will be charged.`,
      confirmLabel: 'Buy',
    });
    if (!confirmed) return;
    setBuying(pack.tokens);
    try {
      await purchaseTokens(pack);
      toast.success(`${numberFormat.format(pack.tokens)} tokens added`);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't complete the purchase. Please try again."));
    } finally {
      setBuying(null);
    }
  };

  return (
    <Sheet visible={visible} title="Smart Coach tokens" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
              Available now
            </Text>
            {tokens.isLoading ? (
              <ActivityIndicator color={colors.textMuted} style={{ alignSelf: 'flex-start', marginVertical: spacing.sm }} />
            ) : (
              <Text style={{ color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: 34, letterSpacing: -1 }}>
                {numberFormat.format(tokens.available)}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                Purchased balance
              </Text>
              <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
                {numberFormat.format(tokens.balance)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                Free today
              </Text>
              <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
                {tokens.freeLeft} of {FREE_DAILY_TOKENS}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, lineHeight: 17 }}>
            Your {FREE_DAILY_TOKENS} free tokens are used first each day. Purchased tokens never expire.
          </Text>
        </View>

        <View style={{ gap: spacing.sm + 2 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
            Buy tokens
          </Text>
          {TOKEN_PACKS.map((pack, index) => {
            const color = packColors[index % packColors.length];
            const isBuying = buying === pack.tokens;
            return (
              <Pressable
                key={pack.tokens}
                accessibilityRole="button"
                accessibilityLabel={`${numberFormat.format(pack.tokens)} tokens for ${formatMoney(pack.priceCents, TOKEN_CURRENCY)}`}
                disabled={buying !== null}
                onPress={() => void buy(pack)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm + 4,
                  padding: spacing.md,
                  borderRadius: radius.xl,
                  backgroundColor: pressed ? colors.fill : colors.surface,
                  opacity: buying !== null && !isBuying ? 0.5 : 1,
                })}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: withAlpha(color, 0.16),
                  }}>
                  <SparkleIcon size={22} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
                    {numberFormat.format(pack.tokens)} tokens
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                    About {Math.round(pack.tokens / 1000)} Smart Coach chats
                  </Text>
                </View>
                <View
                  style={{
                    minWidth: 76,
                    alignItems: 'center',
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: 999,
                    backgroundColor: color,
                  }}>
                  {isBuying ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                      {formatMoney(pack.priceCents, TOKEN_CURRENCY)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
          <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
            R10 per 1,000 tokens. Test mode: purchases add tokens without charging you.
          </Text>
        </View>

        {purchases.length > 0 ? (
          <View style={{ gap: spacing.sm + 2 }}>
            <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
              Recent purchases
            </Text>
            <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
              {purchases.map((purchase, index) => (
                <View
                  key={purchase.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.sm + 4,
                    borderTopWidth: index === 0 ? 0 : 0.5,
                    borderTopColor: colors.border,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
                      {numberFormat.format(purchase.tokens)} tokens
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                      {formatDay(purchase.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                    {formatMoney(purchase.priceCents, purchase.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
