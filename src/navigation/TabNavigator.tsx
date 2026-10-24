import { StatusBar } from 'expo-status-bar';
import { useState, type ComponentType } from 'react';
import { View } from 'react-native';

import { BottomNav, type TabKey } from '../components/BottomNav';
import { useAuthUser } from '../hooks/useAuthUser';
import { AIScreen } from '../screens/AIScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { useTheme } from '../theme/ThemeProvider';

const SCREENS: Record<TabKey, ComponentType> = {
  home: HomeScreen,
  reports: ReportsScreen,
  ai: AIScreen,
  profile: ProfileScreen,
};

export function TabNavigator() {
  const { colors } = useTheme().theme;
  const user = useAuthUser();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const ActiveScreen = SCREENS[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ActiveScreen />
      <BottomNav activeTab={activeTab} onTabPress={setActiveTab} avatarUri={user?.photoURL} />
      <StatusBar style={colors.statusBar} />
    </View>
  );
}
