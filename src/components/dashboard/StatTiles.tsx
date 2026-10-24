import type { ComponentType } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import type { IconProps } from '../icons';
import { withAlpha } from './palette';

export type StatTile = {
  Icon: ComponentType<IconProps>;
  color: string;
  label: string;
  value: string;
  detail?: string;
};

/** A two-column grid of Control Center–style tiles: tinted icon, big value, short caption. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 }}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          accessible
          accessibilityLabel={[tile.label, tile.value, tile.detail].filter(Boolean).join(', ')}
          style={{
            flexBasis: '47%',
            flexGrow: 1,
            gap: spacing.sm + 2,
            padding: spacing.md,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
          }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(tile.color, 0.16),
            }}>
            <tile.Icon size={20} color={tile.color} strokeWidth={2} />
          </View>
          <View style={{ gap: 1 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xl }}>
              {tile.value}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
              {tile.label}
            </Text>
            {tile.detail ? (
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: 11 }}>
                {tile.detail}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
