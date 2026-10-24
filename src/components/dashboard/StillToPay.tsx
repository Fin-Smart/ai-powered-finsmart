import { Pressable, Text, View } from 'react-native';

import { formatMoney } from '../../budget/money';
import { navigate } from '../../navigation/quickNav';
import { useTheme } from '../../theme/ThemeProvider';
import { ChevronRightIcon } from '../icons';
import { SectionHeader } from './SectionHeader';

export type UnpaidItem = {
  id: string;
  name: string;
  budgetId: string;
  budgetName: string;
  leftCents: number;
  currency: string;
  color: string;
};

/** The biggest budget items not yet ticked as paid this period; each opens its budget. */
export function StillToPay({ items, totalCount }: { items: UnpaidItem[]; totalCount: number }) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  return (
    <View>
      <SectionHeader title="Still to pay" accessory={`${totalCount} ${totalCount === 1 ? 'item' : 'items'}`} />
      <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, overflow: 'hidden' }}>
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} in ${item.budgetName}, ${formatMoney(item.leftCents, item.currency)} left`}
            accessibilityHint="Opens the budget so you can tick it as paid"
            onPress={() => navigate({ tab: 'profile', open: { type: 'budget', budgetId: item.budgetId } })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm + 4,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 4,
              borderTopWidth: index === 0 ? 0 : 0.5,
              borderTopColor: colors.border,
              backgroundColor: pressed ? colors.fill : 'transparent',
            })}>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: item.color }} />
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.md }}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                {item.budgetName}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              {formatMoney(item.leftCents, item.currency)}
            </Text>
            <ChevronRightIcon size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
