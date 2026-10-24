import AiMagicIcon from '@hugeicons/core-free-icons/AiMagicIcon';
import Home11Icon from '@hugeicons/core-free-icons/Home11Icon';
import LeftToRightListBulletIcon from '@hugeicons/core-free-icons/LeftToRightListBulletIcon';
import UserIcon from '@hugeicons/core-free-icons/UserIcon';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useState, type ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

export type TabKey = 'home' | 'reports' | 'ai' | 'profile';

const LEFT_TABS = [
  { key: 'home', label: 'Home', icon: Home11Icon },
  { key: 'reports', label: 'Reports', icon: LeftToRightListBulletIcon },
  { key: 'ai', label: 'AI', icon: AiMagicIcon },
] as const;

const BAR_HEIGHT = 56;
const ITEM_HEIGHT = 46;
const ITEM_WIDTH = 64;
const ICON_SIZE = 24;
const AVATAR_SIZE = 32;
const HORIZONTAL_MARGIN = 20;

export const isLiquidGlassEnabled =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

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
  const containerStyle = [styles.container, { bottom }];

  const content = (
    <>
      <NavSurface style={styles.group}>
        {LEFT_TABS.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}>
            {(color) => (
              <HugeiconsIcon icon={tab.icon} size={ICON_SIZE} color={color} strokeWidth={1.8} />
            )}
          </TabButton>
        ))}
      </NavSurface>

      <NavSurface style={styles.single}>
        <ProfileButton
          active={activeTab === 'profile'}
          avatarUri={avatarUri}
          onPress={() => onTabPress('profile')}
        />
      </NavSurface>
    </>
  );

  if (isLiquidGlassEnabled) {
    return (
      <GlassContainer accessibilityRole="tablist" spacing={12} style={containerStyle}>
        {content}
      </GlassContainer>
    );
  }

  return (
    <View accessibilityRole="tablist" style={containerStyle}>
      {content}
    </View>
  );
}

function NavSurface({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  const { theme } = useTheme();

  if (isLiquidGlassEnabled) {
    return (
      <GlassView isInteractive colorScheme={theme.scheme} style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        style,
        styles.fallbackSurface,
        { backgroundColor: theme.colors.navSurface, borderColor: theme.colors.navBorder },
      ]}>
      {children}
    </View>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  width?: number;
  children: (color: string) => ReactNode;
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
        active && { backgroundColor: colors.navActive },
        pressed && !isLiquidGlassEnabled && styles.pressed,
      ]}>
      {children(active ? colors.primary : colors.text)}
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
        {(color) => <HugeiconsIcon icon={UserIcon} size={ICON_SIZE} color={color} strokeWidth={1.8} />}
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
        { borderColor: active ? colors.primary : 'transparent' },
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
  fallbackSurface: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
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
