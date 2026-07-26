import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '../../theme';

interface BottomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: import('react-native').DimensionValue;
  contentStyle?: ViewStyle;
}

export const BottomModal: React.FC<BottomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  maxHeight = '90%',
  contentStyle,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kbWrapper}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { maxHeight }, contentStyle]}>
            {/* Drag handle */}
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'flex-end',
  },
  kbWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadow.modal,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
});
