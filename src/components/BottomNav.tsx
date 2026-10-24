import { useState, type ComponentType, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { GlassGroup, GlassSurface, isLiquidGlassEnabled } from './GlassSurface';
import { CoachIcon, HomeIcon, ProfileIcon, ShieldIcon, type IconProps } from './icons';

export type TabKey = 'home' | 'shield' | 'ai' | 'profile';

const LEFT_TABS: { key: TabKey; label: string; Icon: ComponentType<IconProps> }[] = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'shield', label: 'Shield', Icon: ShieldIcon },
  { key: 'ai', label: 'AI', Icon: CoachIcon },
];

const BAR_HEIGHT = 56;
const ITEM_HEIGHT = 46;
const ITEM_WIDTH = 64;
const ICON_SIZE = 25;
const AVATAR_SIZE = 32;
const HORIZONTAL_MARGIN = 20;

function useNavBottomOffset() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 8, 12);
}

/** Bottom padding screens need so their content can scroll clear of the floating nav. */
export function useBottomNavInset() {
  return useNavBottomOffset() + BAR_HEIGHT + 16;
}

type BottomNavProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  avatarUri?: string | null;
};

export function BottomNav({ activeTab, onTabPress, avatarUri }: BottomNavProps) {
  const bottom = useNavBottomOffset();

  return (
    <GlassGroup accessibilityRole="tablist" spacing={12} style={[styles.container, { bottom }]}>
      <GlassSurface style={styles.group}>
        {LEFT_TABS.map(({ key, label, Icon }) => (
          <TabButton
            key={key}
            label={label}
            active={activeTab === key}
            onPress={() => onTabPress(key)}>
            {(color, active) => <Icon size={ICON_SIZE} color={color} active={active} />}
          </TabButton>
        ))}
      </GlassSurface>

      <GlassSurface style={styles.single}>
        <ProfileButton
          active={activeTab === 'profile'}
          avatarUri={avatarUri}
          onPress={() => onTabPress('profile')}
        />
      </GlassSurface>
    </GlassGroup>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  width?: number;
  children: (color: string, active: boolean) => ReactNode;
};

function TabButton({ label, active, onPress, width = ITEM_WIDTH, children }: TabButtonProps) {
  const { colors } = useTheme().theme;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.item,
        { width },
        active && { backgroundColor: colors.floatingActive },
        pressed && !isLiquidGlassEnabled && styles.pressed,
      ]}>
      {children(colors.text, active)}
    </Pressable>
  );
}

type ProfileButtonProps = {
  active: boolean;
  avatarUri?: string | null;
  onPress: () => void;
};

function ProfileButton({ active, avatarUri, onPress }: ProfileButtonProps) {
  const { colors } = useTheme().theme;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showAvatar = !!avatarUri && avatarUri !== failedUri;

  if (!showAvatar) {
    return (
      <TabButton label="Profile" active={active} onPress={onPress} width={ITEM_HEIGHT}>
        {(color, isActive) => <ProfileIcon size={ICON_SIZE} color={color} active={isActive} />}
      </TabButton>
    );
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel="Profile"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.avatarRing,
        { borderColor: active ? colors.text : 'transparent' },
        pressed && !isLiquidGlassEnabled && styles.pressed,
      ]}>
      <Image
        source={{ uri: avatarUri }}
        onError={() => setFailedUri(avatarUri)}
        style={[styles.avatar, { backgroundColor: colors.surface }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: HORIZONTAL_MARGIN,
    right: HORIZONTAL_MARGIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  group: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    paddingHorizontal: (BAR_HEIGHT - ITEM_HEIGHT) / 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  single: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    height: ITEM_HEIGHT,
    borderRadius: ITEM_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  avatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
});
