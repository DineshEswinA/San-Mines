import { StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from './tokens';

export const typography = StyleSheet.create({
  heading1: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  heading2: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  heading3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.regular,
    color: colors.text.primary,
  },
  bodyBold: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.text.muted,
  },
  captionBold: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text.muted,
  },
  mono: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  error: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.danger.light,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
