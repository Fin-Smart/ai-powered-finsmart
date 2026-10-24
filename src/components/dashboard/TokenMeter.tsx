import { Text, useWindowDimensions, View } from 'react-native';

import { PLAN_LABELS, useAiUsage } from '../../lib/aiUsage';
import { useTheme } from '../../theme/ThemeProvider';
import { SparkleIcon } from '../icons';
import { ControlSlider } from './ControlSlider';
import { SectionHeader } from './SectionHeader';

const HEIGHT = 64;
const LOW_SHARE = 0.15;
const numberFormat = new Intl.NumberFormat();

/** Smart Coach tokens left today, as a wide Control Center–style level. */
export function TokenMeter() {
  const { colors, spacing, typography } = useTheme().theme;
  const { width: screenWidth } = useWindowDimensions();
  const { plan, usedTokens, allowance, remaining } = useAiUsage();
  const share = allowance > 0 ? remaining / allowance : 0;
  const low = share < LOW_SHARE;

  const badge = (
    <View
      style={{
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: plan === 'pro' ? colors.primary : colors.fill,
      }}>
      <Text
        style={{
          color: plan === 'pro' ? colors.onPrimary : colors.text,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.xs,
        }}>
        {PLAN_LABELS[plan]} plan
      </Text>
    </View>
  );

  return (
    <View>
      <SectionHeader title="Smart Coach" accessory={badge} />
      <Text style={{ color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xl }}>
        {numberFormat.format(remaining)}
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
          {' '}
          tokens left today
        </Text>
      </Text>

      <View style={{ marginTop: spacing.sm + 4 }}>
        <ControlSlider
          value={share}
          width={screenWidth - spacing.lg * 2}
          height={HEIGHT}
          orientation="horizontal"
          Icon={SparkleIcon}
          tint={low ? colors.secondary : colors.primary}
          accessibilityLabel={`${numberFormat.format(remaining)} of ${numberFormat.format(allowance)} Smart Coach tokens left today`}
        />
      </View>

      <Text
        style={{
          marginTop: spacing.sm,
          color: low ? colors.secondary : colors.textMuted,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.xs,
        }}>
        {low
          ? `Running low: ${numberFormat.format(usedTokens)} of ${numberFormat.format(allowance)} used. Resets at midnight.`
          : `${numberFormat.format(usedTokens)} of ${numberFormat.format(allowance)} used today. Resets at midnight.`}
      </Text>
    </View>
  );
}
