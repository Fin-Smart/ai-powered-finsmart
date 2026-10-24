import type { ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { currencySymbol } from '../../budget/money';
import { useTheme } from '../../theme/ThemeProvider';

export function FieldLabel({ children }: { children: ReactNode }) {
  const { colors, typography } = useTheme().theme;
  return (
    <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
      {children}
    </Text>
  );
}

export function useInputStyle() {
  const { colors, spacing, typography, radius } = useTheme().theme;
  return {
    backgroundColor: colors.fill,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
  } as const;
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  const { colors, spacing } = useTheme().theme;
  const inputStyle = useInputStyle();
  return (
    <View style={{ gap: spacing.xs }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput placeholderTextColor={colors.textMuted} accessibilityLabel={label} {...props} style={[inputStyle, props.style]} />
    </View>
  );
}

/** Amount input with the currency symbol in front; values are parsed with `parseMoney`. */
export function MoneyField({
  label,
  currency,
  large,
  ...props
}: TextInputProps & { label?: string; currency: string; large?: boolean }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const fontSize = large ? typography.fontSize.xxl : typography.fontSize.md;

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          backgroundColor: colors.fill,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
        }}>
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize }}>{currencySymbol(currency)}</Text>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          {...props}
          style={[
            {
              flex: 1,
              paddingVertical: large ? spacing.md : spacing.sm + 4,
              color: colors.text,
              fontFamily: large ? typography.fontFamily.semiBold : typography.fontFamily.regular,
              fontSize,
            },
            props.style,
          ]}
        />
      </View>
    </View>
  );
}

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const { colors, spacing, typography } = useTheme().theme;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Text
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            suppressHighlighting
            style={{
              overflow: 'hidden',
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.md,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? colors.text : colors.border,
              backgroundColor: selected ? colors.text : 'transparent',
              color: selected ? colors.background : colors.text,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.sm,
            }}>
            {option.label}
          </Text>
        );
      })}
    </View>
  );
}
