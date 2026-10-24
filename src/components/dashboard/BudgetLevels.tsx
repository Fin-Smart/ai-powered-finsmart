import type { ComponentType } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { formatMoney } from '../../budget/money';
import type { BudgetSummary } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import {
  BusinessIcon,
  EventIcon,
  HomeIcon,
  ProfileIcon,
  SavingsIcon,
  TravelIcon,
  WalletIcon,
  type IconProps,
} from '../icons';
import { ControlSlider } from './ControlSlider';
import { SectionHeader } from './SectionHeader';

const LABEL_ICONS: Record<string, ComponentType<IconProps>> = {
  Household: HomeIcon,
  Personal: ProfileIcon,
  Savings: SavingsIcon,
  Holiday: TravelIcon,
  Business: BusinessIcon,
  Event: EventIcon,
};

const MAX_WIDTH = 96;
const MIN_WIDTH = 72;
const HEIGHT = 176;

/** One Control Center–style level per budget, showing how much of it has been spent. */
export function BudgetLevels({ summaries }: { summaries: BudgetSummary[] }) {
  const { colors, spacing, typography } = useTheme().theme;
  const { width: screenWidth } = useWindowDimensions();
  const available = screenWidth - spacing.lg * 2;
  const width = Math.max(
    MIN_WIDTH,
    Math.min(MAX_WIDTH, (available - spacing.md * (summaries.length - 1)) / Math.max(summaries.length, 1)),
  );

  return (
    <View>
      <SectionHeader title="Budgets" accessory="Spent so far" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {summaries.map(({ budget, spentCents, receivedCents, remainingCents }) => {
          const total = budget.availableCents + receivedCents;
          const used = total > 0 ? spentCents / total : 0;
          const over = remainingCents < 0;
          const caption = over
            ? `${formatMoney(-remainingCents, budget.currency)} over`
            : `${formatMoney(remainingCents, budget.currency)} left`;

          return (
            <View key={budget.id} style={{ width, gap: spacing.sm }}>
              <ControlSlider
                value={used}
                width={width}
                height={HEIGHT}
                Icon={LABEL_ICONS[budget.label] ?? WalletIcon}
                tint={over ? colors.secondary : colors.primary}
                accessibilityLabel={`${budget.name}, ${Math.round(used * 100)} percent spent, ${caption}`}
              />
              <View style={{ alignItems: 'center' }}>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                  {budget.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: over ? colors.secondary : colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.xs,
                  }}>
                  {caption}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
