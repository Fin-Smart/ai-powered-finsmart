import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatDay, startOfDay } from '../../budget/period';
import { useTheme } from '../../theme/ThemeProvider';
import { BackIcon } from '../icons';
import { FieldLabel } from './fields';

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type DateFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minimum?: number;
};

/** Date picker with an inline month calendar; values are start-of-day timestamps. */
export function DateField({ label, value, onChange, minimum }: DateFieldProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const today = startOfDay(Date.now());
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array<null>(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  const shiftMonth = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <View style={{ gap: spacing.xs }}>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDay(value)}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={{ backgroundColor: colors.fill, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 }}>
        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.md }}>
          {value === today ? `Today · ${formatDay(value)}` : formatDay(value)}
        </Text>
      </Pressable>

      {open ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm + 4, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} hitSlop={10} style={{ padding: spacing.xs }}>
              <BackIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              {monthFormat.format(month)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => shiftMonth(1)}
              hitSlop={10}
              style={{ padding: spacing.xs, transform: [{ scaleX: -1 }] }}>
              <BackIcon size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((day, index) => (
              <Text
                key={`${day}-${index}`}
                style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
                {day}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, index) => {
              if (day === null) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
              const time = new Date(year, monthIndex, day).getTime();
              const selected = time === value;
              const disabled = minimum !== undefined && time < minimum;
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={formatDay(time)}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => {
                    onChange(time);
                    setOpen(false);
                  }}
                  style={{ width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.primary : 'transparent',
                      borderWidth: time === today && !selected ? 1 : 0,
                      borderColor: colors.primary,
                    }}>
                    <Text
                      style={{
                        color: selected ? colors.onPrimary : disabled ? colors.textMuted : colors.text,
                        fontFamily: selected ? typography.fontFamily.semiBold : typography.fontFamily.regular,
                        fontSize: typography.fontSize.sm,
                      }}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
