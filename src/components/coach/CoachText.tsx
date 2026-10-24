import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*(\d+[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;

type CoachTextProps = {
  text: string;
  color: string;
};

/** Renders the small markdown subset Smart Coach is instructed to use: **bold** and "- " lists. */
export function CoachText({ text, color }: CoachTextProps) {
  const { typography, spacing } = useTheme().theme;
  const lines = text.trim().split('\n');

  const textStyle = {
    color,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
  };

  return (
    <View style={{ gap: spacing.xs }}>
      {lines.map((rawLine, index) => {
        if (!rawLine.trim()) {
          return <View key={index} style={{ height: spacing.xs }} />;
        }

        const isHeading = HEADING.test(rawLine);
        const numbered = rawLine.match(NUMBERED);
        const isBullet = !numbered && BULLET.test(rawLine);
        const line = rawLine.replace(HEADING, '').replace(NUMBERED, '').replace(BULLET, '');
        const marker = numbered ? numbered[1] : isBullet ? '•' : null;

        const content = (
          <Text
            selectable
            style={[textStyle, { flex: marker ? 1 : undefined }, isHeading && { fontFamily: typography.fontFamily.semiBold }]}>
            {renderInline(line, typography.fontFamily.semiBold)}
          </Text>
        );

        if (!marker) {
          return <Fragment key={index}>{content}</Fragment>;
        }

        return (
          <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.xs }}>
            <Text style={[textStyle, { minWidth: 12 }]}>{marker}</Text>
            {content}
          </View>
        );
      })}
    </View>
  );
}

function renderInline(line: string, boldFamily: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <Text key={index} style={{ fontFamily: boldFamily }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    ),
  );
}
