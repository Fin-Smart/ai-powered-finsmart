import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatMoney } from '../../budget/money';
import { useTheme } from '../../theme/ThemeProvider';
import { SectionHeader } from './SectionHeader';

export type Slice = { label: string; cents: number; color: string };

const SIZE = 156;
const STROKE = 26;
const RADIUS = SIZE / 2 - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** A sliver of space between slices so neighbouring colours stay distinct. */
const SLICE_GAP = 3;

/** Spending by category as a multi-colour donut, total in the middle and a legend underneath. */
export function SpendingDonut({ slices, currency }: { slices: Slice[]; currency: string }) {
  const { colors, spacing, typography } = useTheme().theme;
  const total = slices.reduce((sum, slice) => sum + slice.cents, 0);
  let offset = 0;

  return (
    <View>
      <SectionHeader title="Where it goes" accessory="This period" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.fill} strokeWidth={STROKE} fill="none" />
            {slices.map((slice) => {
              const length = (slice.cents / total) * CIRCUMFERENCE;
              const visible = Math.max(length - (slices.length > 1 ? SLICE_GAP : 0), 0.5);
              const dashOffset = -offset;
              offset += length;
              return (
                <Circle
                  key={slice.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${visible} ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              );
            })}
          </Svg>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
            Spent
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              maxWidth: SIZE - STROKE * 2 - 8,
              color: colors.text,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.fontSize.lg,
            }}>
            {formatMoney(total, currency)}
          </Text>
        </View>

        <View style={{ flex: 1, gap: spacing.sm + 2 }}>
          {slices.map((slice) => (
            <View
              key={slice.label}
              accessible
              accessibilityLabel={`${slice.label}, ${formatMoney(slice.cents, currency)}, ${Math.round((slice.cents / total) * 100)} percent`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color }} />
              <Text
                numberOfLines={1}
                style={{ flex: 1, color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
                {slice.label}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
                {Math.round((slice.cents / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
