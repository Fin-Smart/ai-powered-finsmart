import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { ToastViewport } from './toast/ToastViewport';

type SheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Native page sheet on iOS, full-screen modal on Android, with a title row and Done button. */
export function Sheet({ visible, title, subtitle, onClose, children }: SheetProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md + 4,
            paddingBottom: spacing.md,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
            <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
              Done
            </Text>
          </Pressable>
        </View>
        {children}
        <ToastViewport topOffset={Platform.OS === 'android' ? insets.top + spacing.sm : spacing.sm + 4} />
      </View>
    </Modal>
  );
}
