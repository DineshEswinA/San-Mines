import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface ScreenShellProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  contentPaddingBottom?: number;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  children,
  scrollable = true,
  keyboardAvoiding = true,
  contentPaddingBottom = 40,
  style,
  contentStyle,
}) => {
  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: contentPaddingBottom }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentStyle]}>{children}</View>
  );

  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : inner;

  return (
    <SafeAreaView style={[styles.safe, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.screen} />
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
});
