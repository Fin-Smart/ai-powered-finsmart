import { useState, type ComponentType, type Ref } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { EyeIcon, EyeOffIcon, type IconProps } from '../icons';

const HEIGHT = 54;

type AuthFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  ref?: Ref<TextInputInstance>;
  label: string;
  Icon: ComponentType<IconProps>;
  error?: string | null;
  hint?: string;
  /** Renders a show/hide toggle and starts hidden. */
  password?: boolean;
};

export function AuthField({ ref, label, Icon, error, hint, password, onFocus, onBlur, ...inputProps }: AuthFieldProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 2,
          height: HEIGHT,
          borderRadius: HEIGHT / 2,
          paddingLeft: spacing.md,
          paddingRight: password ? spacing.xs : spacing.md,
          backgroundColor: colors.fill,
          borderWidth: 1.5,
          borderColor: error ? colors.secondary : focused ? colors.primary : 'transparent',
        }}>
        <Icon size={20} color={focused ? colors.primary : colors.textMuted} />
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            flex: 1,
            height: '100%',
            paddingVertical: 0,
            color: colors.text,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.md,
          }}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((value) => !value)}
            hitSlop={6}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            {revealed ? (
              <EyeOffIcon size={20} color={colors.textMuted} />
            ) : (
              <EyeIcon size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error || hint ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={{
            paddingHorizontal: spacing.sm,
            color: error ? colors.secondary : colors.textMuted,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.xs,
          }}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}
