import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import type { IconProps } from '../icons';
import { withAlpha } from './palette';

export type QuickAction = {
  label: string;
  Icon: ComponentType<IconProps>;
  color: string;
  onPress: () => void;
};

const BUTTON = 62;
const COLUMNS = 3;

/** Round Control Center–style shortcut buttons, three to a row. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={{ width: `${100 / COLUMNS}%`, alignItems: 'center', gap: spacing.sm }}>
          {({ pressed }) => (
            <>
              <View
                style={{
                  width: BUTTON,
                  height: BUTTON,
                  borderRadius: BUTTON / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? action.color : withAlpha(action.color, 0.14),
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                }}>
                <action.Icon size={26} color={pressed ? colors.onPrimary : action.color} strokeWidth={2} />
              </View>
              <Text
                numberOfLines={1}
                style={{ color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
                {action.label}
              </Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}
