import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ComponentType } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import FinsmartSms from '../../modules/finsmart-sms';
import { BudgetsProvider } from '../budget/BudgetsProvider';
import { BottomNav, type TabKey } from '../components/BottomNav';
import { useAuthUser } from '../hooks/useAuthUser';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { restoreGoogleSession } from '../lib/googleAuth';
import { setPendingSmsAction, usePendingSmsAction } from '../shield/smsLaunch';
import { AIScreen } from '../screens/AIScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ShieldScreen } from '../screens/ShieldScreen';
import { useTheme } from '../theme/ThemeProvider';

const SCREENS: Record<TabKey, ComponentType> = {
  home: HomeScreen,
  shield: ShieldScreen,
  ai: AIScreen,
  profile: ProfileScreen,
};

const TAB_ORDER: TabKey[] = ['home', 'shield', 'ai', 'profile'];
/** Long enough for the first screen to finish loading before Smart Coach starts its work. */
const AI_PRELOAD_DELAY_MS = 2500;

export function TabNavigator() {
  const { colors } = useTheme().theme;
  const user = useAuthUser();
  const keyboardVisible = useKeyboardVisible();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<TabKey>>(() => new Set(['home']));

  const pendingSmsAction = usePendingSmsAction();

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

  useEffect(() => {
    void restoreGoogleSession();
    if (!FinsmartSms) return;

    const launchAction = FinsmartSms.consumeLaunchAction();
    if (launchAction) setPendingSmsAction(launchAction);
    const subscription = FinsmartSms.addListener('onLaunchAction', setPendingSmsAction);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (pendingSmsAction) selectTab('shield');
  }, [pendingSmsAction]);

  // Mount Smart Coach in the background once the app has settled, so today's lesson and quiz
  // are prepared before the tab is opened.
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisitedTabs((prev) => (prev.has('ai') ? prev : new Set(prev).add('ai')));
    }, AI_PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'home') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setActiveTab('home');
      return true;
    });

    return () => subscription.remove();
  }, [activeTab]);

  return (
    <BudgetsProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {TAB_ORDER.filter((tab) => visitedTabs.has(tab)).map((tab) => {
          const Screen = SCREENS[tab];
          return (
            <View key={tab} style={[StyleSheet.absoluteFill, tab !== activeTab && styles.hidden]}>
              <Screen />
            </View>
          );
        })}

        {keyboardVisible ? null : (
          <BottomNav activeTab={activeTab} onTabPress={selectTab} avatarUri={user?.photoURL} />
        )}
        <StatusBar style={colors.statusBar} />
      </View>
    </BudgetsProvider>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: 'none',
  },
});
