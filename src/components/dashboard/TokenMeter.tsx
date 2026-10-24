import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { FREE_DAILY_TOKENS, useTokens } from '../../lib/aiUsage';
import { useTheme } from '../../theme/ThemeProvider';
import { SparkleIcon } from '../icons';
import { ControlSlider } from './ControlSlider';
import { SectionHeader } from './SectionHeader';

const HEIGHT = 64;
const numberFormat = new Intl.NumberFormat();

/** Smart Coach tokens: today's free allowance as a wide Control Center–style level, plus the purchased balance. */
export function TokenMeter({ onGetTokens }: { onGetTokens: () => void }) {
  const { colors, spacing, typography } = useTheme().theme;
  const { width: screenWidth } = useWindowDimensions();
  const { freeLeft, balance, available } = useTokens();
  const empty = available <= 0;

  const getTokens = (
    <Pressable
      accessibilityRole="button"
      onPress={onGetTokens}
      hitSlop={8}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: colors.primary,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
        Get tokens
      </Text>
    </Pressable>
  );

  return (
    <View>
      <SectionHeader title="Smart Coach tokens" accessory={getTokens} />
      <Text style={{ color: empty ? colors.danger : colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xl }}>
        {numberFormat.format(available)}
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
          {' '}
          tokens available
        </Text>
      </Text>

      <View style={{ marginTop: spacing.sm + 4 }}>
        <ControlSlider
          value={freeLeft / FREE_DAILY_TOKENS}
          width={screenWidth - spacing.lg * 2}
          height={HEIGHT}
          orientation="horizontal"
          Icon={SparkleIcon}
          tint={freeLeft === 0 ? colors.danger : colors.primary}
          accessibilityLabel={`${freeLeft} of ${FREE_DAILY_TOKENS} free tokens left today`}
        />
      </View>

      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <Text style={{ flex: 1, color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          Free today: {freeLeft} of {FREE_DAILY_TOKENS} · resets at midnight
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
          Purchased: {numberFormat.format(balance)}
        </Text>
      </View>
    </View>
  );
}
