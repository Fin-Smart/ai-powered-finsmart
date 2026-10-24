import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import type { RiskLevel } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';

type SenderAvatarProps = {
  name: string;
  level: RiskLevel;
  /** Sender logo; ignored for flagged messages so a spoofed sender never borrows a real brand's logo. */
  logoUri?: string | null;
  size?: number;
};

export function SenderAvatar({ name, level, logoUri, size = 44 }: SenderAvatarProps) {
  const { colors, typography } = useTheme().theme;
  const [logoFailed, setLogoFailed] = useState(false);
  const initial = name.match(/[A-Za-z0-9]/)?.[0].toUpperCase() ?? '#';
  const showLogo = Boolean(logoUri) && level === 'safe' && !logoFailed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: level === 'scam' ? colors.secondaryMuted : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      {showLogo && logoUri ? (
        <Image
          source={{ uri: logoUri }}
          onError={() => setLogoFailed(true)}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ width: size * 0.62, height: size * 0.62 }}
        />
      ) : (
        <Text
          style={{
            color: level === 'scam' ? colors.secondary : colors.text,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: size * 0.38,
          }}>
          {initial}
        </Text>
      )}
    </View>
  );
}
