import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '../../theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = true,
}) => {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <TouchableOpacity activeOpacity={1} onPress={onCancel} style={styles.overlay}>
        <TouchableOpacity activeOpacity={1} style={styles.dialog}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={28} color={destructive ? colors.danger.light : colors.warning.light} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.cancelBtn]}>
              <Text style={[styles.btnText, { color: colors.text.secondary }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.btn, { backgroundColor: destructive ? colors.danger.default : colors.primary.default }]}
            >
              <Text style={styles.btnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: 'center',
    ...shadow.modal,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.bg.elevated,
  },
  btnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
