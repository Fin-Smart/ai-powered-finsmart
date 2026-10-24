import { Text, View } from 'react-native';

import { formatMoney } from '../../budget/money';
import { useTheme } from '../../theme/ThemeProvider';
import { SectionHeader } from './SectionHeader';

export type UnpaidItem = { id: string; name: string; budgetName: string; leftCents: number; currency: string; color: string };

/** The biggest budget items not yet ticked as paid this period. */
export function StillToPay({ items, totalCount }: { items: UnpaidItem[]; totalCount: number }) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  return (
    <View>
      <SectionHeader title="Still to pay" accessory={`${totalCount} ${totalCount === 1 ? 'item' : 'items'}`} />
      <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
        {items.map((item, index) => (
          <View
            key={item.id}
            accessible
            accessibilityLabel={`${item.name} in ${item.budgetName}, ${formatMoney(item.leftCents, item.currency)} left`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm + 4,
              paddingVertical: spacing.sm + 4,
              borderTopWidth: index === 0 ? 0 : 0.5,
              borderTopColor: colors.border,
            }}>
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
          </View>
        ))}
      </View>
    </View>
  );
}
