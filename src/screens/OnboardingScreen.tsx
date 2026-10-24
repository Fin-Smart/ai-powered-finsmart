import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ComponentType } from 'react';
import { Animated, Image, Pressable, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextLink } from '../components/auth/AuthButtons';
import { GlassSurface } from '../components/GlassSurface';
import {
  AlertIcon,
  CheckIcon,
  CoachIcon,
  type IconProps,
  MailIcon,
  MicIcon,
  SavingsIcon,
  ShieldIcon,
  SparkleIcon,
  WalletIcon,
} from '../components/icons';
import { useTheme } from '../theme/ThemeProvider';

const mascot = require('../../assets/icon-dark.png');

const DOT = 8;
/** The active dot stretches to fill its slot, so neighbours never overlap. */
const DOT_SLOT = 22;

export type OnboardingExit = 'login' | 'register';

type Chip = { Icon: ComponentType<IconProps>; label: string; tone?: 'danger' | 'primary' | 'secondary' };

type Slide = {
  title: string;
  body: string;
  /** Feature icon in the middle of the art; the welcome slide shows the owl instead. */
  Icon?: ComponentType<IconProps>;
  chips: [Chip, Chip];
};

const SLIDES: Slide[] = [
  {
    title: 'Money made simple',
    body: 'FinSmart helps you plan your spending, learn the basics and stay one step ahead of scammers.',
    chips: [
      { Icon: SparkleIcon, label: 'Learn as you go', tone: 'secondary' },
      { Icon: CheckIcon, label: 'Made for beginners', tone: 'primary' },
    ],
  },
  {
    title: 'Know where your money goes',
    body: 'Set budgets, log what you spend and see what is still to pay before the month runs out.',
    Icon: WalletIcon,
    chips: [
      { Icon: CheckIcon, label: 'Rent paid', tone: 'primary' },
      { Icon: SavingsIcon, label: 'On track to save', tone: 'secondary' },
    ],
  },
  {
    title: 'Spot scams before they cost you',
    body: 'Shield checks your emails and texts for warning signs and explains what to look out for.',
    Icon: ShieldIcon,
    chips: [
      { Icon: AlertIcon, label: 'Likely scam', tone: 'danger' },
      { Icon: MailIcon, label: 'Inbox checked', tone: 'primary' },
    ],
  },
  {
    title: 'Ask Smart Coach anything',
    body: 'Budgeting, saving, debt or investing. Type or talk, then test yourself with quick quizzes.',
    Icon: CoachIcon,
    chips: [
      { Icon: MicIcon, label: 'Ask by voice', tone: 'primary' },
      { Icon: SparkleIcon, label: 'Quiz streak', tone: 'secondary' },
    ],
  },
];

export function OnboardingScreen({ onDone }: { onDone: (next: OnboardingExit) => void }) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }}>
      <View style={{ height: 44, flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg }}>
        {last ? null : (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => goTo(SLIDES.length - 1)} style={{ justifyContent: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              Skip
            </Text>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        {SLIDES.map((slide, i) => (
          <SlideView key={slide.title} slide={slide} index={i} width={width} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        <View
          accessible
          accessibilityLabel={`Page ${index + 1} of ${SLIDES.length}`}
          style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          {SLIDES.map((slide, i) => {
            const range = [(i - 1) * width, i * width, (i + 1) * width];
            return (
              <View key={slide.title} style={{ width: DOT_SLOT, alignItems: 'center' }}>
                <Animated.View
                  style={{
                    width: DOT,
                    height: DOT,
                    borderRadius: DOT / 2,
                    backgroundColor: colors.primary,
                    opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' }),
                    transform: [
                      { scaleX: scrollX.interpolate({ inputRange: range, outputRange: [1, DOT_SLOT / DOT, 1], extrapolate: 'clamp' }) },
                    ],
                  }}
                />
              </View>
            );
          })}
        </View>

        <PrimaryButton label={last ? 'Get started' : 'Next'} onPress={() => (last ? onDone('register') : goTo(index + 1))} />
        <TextLink prompt="Already have an account?" label="Log in" onPress={() => onDone('login')} />
      </View>

      <StatusBar style={colors.statusBar} />
    </View>
  );
}

type SlideViewProps = { slide: Slide; index: number; width: number; scrollX: Animated.Value };

function SlideView({ slide, index, width, scrollX }: SlideViewProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const fade = scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const drift = (distance: number) =>
    scrollX.interpolate({ inputRange: range, outputRange: [distance, 0, -distance], extrapolate: 'clamp' });

  const art = Math.min(width * 0.62, 260);

  return (
    <View style={{ width, paddingHorizontal: spacing.lg, justifyContent: 'center', gap: spacing.xl }}>
      <View style={{ height: art + spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: art,
            height: art,
            borderRadius: art / 2,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {slide.Icon ? (
            <GlassSurface
              interactive={false}
              style={{ width: art * 0.46, height: art * 0.46, borderRadius: art * 0.23, alignItems: 'center', justifyContent: 'center' }}>
              <slide.Icon size={art * 0.2} color={colors.primary} strokeWidth={1.8} />
            </GlassSurface>
          ) : (
            <Image
              source={mascot}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: art * 1.05, height: art * 1.05, marginTop: -art * 0.08 }}
            />
          )}
        </View>

        <Animated.View style={{ position: 'absolute', top: spacing.md, left: 0, opacity: fade, transform: [{ translateX: drift(width * 0.35) }] }}>
          <ChipView chip={slide.chips[0]} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', bottom: spacing.md, right: 0, opacity: fade, transform: [{ translateX: drift(width * 0.55) }] }}>
          <ChipView chip={slide.chips[1]} />
        </Animated.View>
      </View>

      <Animated.View style={{ gap: spacing.sm, opacity: fade, transform: [{ translateX: drift(width * 0.15) }] }}>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.xxl,
            lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
            textAlign: 'center',
            letterSpacing: -0.3,
          }}>
          {slide.title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.md,
            lineHeight: typography.fontSize.md * typography.lineHeight.normal,
            textAlign: 'center',
          }}>
          {slide.body}
        </Text>
      </Animated.View>
    </View>
  );
}

function ChipView({ chip }: { chip: Chip }) {
  const { colors, spacing, typography } = useTheme().theme;
  const tint = chip.tone === 'danger' ? colors.danger : chip.tone === 'secondary' ? colors.secondary : colors.primary;

  return (
    <GlassSurface interactive={false} style={{ borderRadius: 999 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md }}>
        <chip.Icon size={18} color={tint} strokeWidth={2} />
        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>{chip.label}</Text>
      </View>
    </GlassSurface>
  );
}
