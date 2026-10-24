import { Image } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

const avatarSource = require('../../../assets/images/smart-coach.png');

export function CoachAvatar({ size = 40 }: { size?: number }) {
  const { colors } = useTheme().theme;

  return (
    <Image
      source={avatarSource}
      accessibilityIgnoresInvertColors
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
      }}
    />
  );
}
