import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View } from 'react-native';

import { planBudget, type BudgetPlan } from '../../budget/budgetPlanner';
import { formatMoney } from '../../budget/money';
import type { BudgetKind } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { CoachAvatar } from '../coach/CoachAvatar';
import { Bullet } from '../shield/ScamVerdict';
import { errorMessage, toast } from '../toast/toastStore';
import { TextField } from './fields';

type PlannerPanelProps = {
  kind: BudgetKind;
  label: string;
  name: string;
  currency: string;
  availableCents: number;
  current: { name: string; limitCents: number; spentCents: number }[];
  onApply: (plan: BudgetPlan) => void;
};

/** Asks Smart Coach to split the available money into categories, then lets the user apply it. */
export function PlannerPanel({ onApply, ...request }: PlannerPanelProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const [goals, setGoals] = useState('');
  const [plan, setPlan] = useState<BudgetPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const createPlan = async () => {
    if (request.availableCents <= 0) {
      toast.error('Enter how much money is available first.');
      return;
    }
    Keyboard.dismiss();
    setIsPlanning(true);
    try {
      setPlan(await planBudget({ ...request, goals }));
    } catch (error) {
      toast.error(errorMessage(error), { action: { label: 'Retry', onPress: () => void createPlan() } });
    } finally {
      setIsPlanning(false);
    }
  };

  const plannedTotal = plan?.categories.reduce((total, item) => total + item.limitCents, 0) ?? 0;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 }}>
        <CoachAvatar size={36} />
        <Text style={{ flex: 1, color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, lineHeight: 20 }}>
          Smart Coach will split {formatMoney(request.availableCents, request.currency)} into categories you can edit.
        </Text>
      </View>

      <TextField
        label="What matters to you? (optional)"
        value={goals}
        onChangeText={setGoals}
        placeholder="e.g. pay off my credit card, save for a car"
        multiline
        textAlignVertical="top"
        style={{ minHeight: 84 }}
      />

      <Pressable
        accessibilityRole="button"
        disabled={isPlanning}
        onPress={createPlan}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 6,
          borderRadius: 999,
          backgroundColor: colors.primary,
          opacity: pressed || isPlanning ? 0.8 : 1,
        })}>
        {isPlanning ? <ActivityIndicator size="small" color={colors.onPrimary} /> : null}
        <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {isPlanning ? 'Planning…' : plan ? 'Try again' : 'Create plan'}
        </Text>
      </Pressable>

      {plan ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm + 2 }}>
          {plan.categories.map((item) => (
            <View key={item.name} style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={{ flexShrink: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                  {formatMoney(item.limitCents, request.currency)}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, lineHeight: 17 }}>
                {item.reason}
              </Text>
            </View>
          ))}
          <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
            {formatMoney(plannedTotal, request.currency)} of {formatMoney(request.availableCents, request.currency)} planned
          </Text>
          {plan.tips.map((tip) => (
            <Bullet key={tip} text={tip} />
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => onApply(plan)}
            style={({ pressed }) => ({
              alignItems: 'center',
              marginTop: spacing.xs,
              paddingVertical: spacing.sm + 4,
              borderRadius: 999,
              backgroundColor: colors.text,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: colors.background, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              Use this plan
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
