import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { Camera as CameraIcon, RefreshCw, X, CheckCircle2 } from 'lucide-react-native';
import { colors, radius, spacing } from '../../theme';

interface CameraBoxProps {
  label: string;
  photoUri: string | undefined;
  onPhotoCaptured: (uri: string) => void;
  onPhotoCleared: () => void;
}

export const CameraBox: React.FC<CameraBoxProps> = ({
  label,
  photoUri,
  onPhotoCaptured,
  onPhotoCleared,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSimulatorMock, setIsSimulatorMock] = useState(false);

  const cameraRef = React.useRef<any>(null);

  const handleOpenScanner = async () => {
    setModalVisible(true);
    setLoading(true);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) setIsSimulatorMock(true);
    }
    setLoading(false);
    setCameraActive(true);
  };

  const handleCapture = async () => {
    if (cameraRef.current && !isSimulatorMock) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
        if (photo?.uri) {
          onPhotoCaptured(photo.uri);
          handleClose();
        }
      } catch {
        handleSimulate();
      }
    } else {
      handleSimulate();
    }
  };

  const handleSimulate = () => {
    let mockUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80';
    if (label.toLowerCase().includes('vehicle')) {
      mockUrl = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=400&q=80';
    } else if (label.toLowerCase().includes('unload')) {
      mockUrl = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=400&q=80';
    }
    onPhotoCaptured(mockUrl);
    handleClose();
  };

  const handleClose = () => {
    setCameraActive(false);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          <View style={styles.overlay}>
            <View style={styles.badge}>
              <CheckCircle2 size={14} color={colors.success.default} />
              <Text style={styles.badgeText}>CAPTURED</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={onPhotoCleared} style={styles.retakeBtn}>
              <RefreshCw size={14} color={colors.white} />
              <Text style={styles.retakeBtnText}>RETAKE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity activeOpacity={0.7} onPress={handleOpenScanner} style={styles.captureBox}>
          <CameraIcon size={24} color="#818CF8" />
          <Text style={styles.captureText}>Take Photo</Text>
        </TouchableOpacity>
      )}

      <Modal animationType="slide" transparent={false} visible={modalVisible} onRequestClose={handleClose}>
        <View style={styles.modalContainer}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loaderText}>Opening Camera...</Text>
            </View>
          ) : permission?.granted && !isSimulatorMock ? (
            <CameraView style={styles.cameraView} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                  <Text style={styles.cameraTitle}>{label}</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <X size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cameraFooter}>
                  <TouchableOpacity activeOpacity={0.8} onPress={handleSimulate} style={styles.simulationBtn}>
                    <Text style={styles.simulationBtnText}>Use Sample Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleCapture} style={styles.triggerBtn}>
                    <View style={styles.triggerInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          ) : (
            <View style={styles.simulatorContainer}>
              <View style={styles.simulatorHeader}>
                <Text style={styles.simulatorTitle}>CAMERA PREVIEW</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <X size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.simulatorBody}>
                <CameraIcon size={64} color="#64748B" />
                <Text style={styles.simulatorMsg}>
                  {permission?.granted === false
                    ? 'Camera permission denied.'
                    : 'Running in Simulator mode.'}
                </Text>
                <Text style={styles.simulatorSubMsg}>
                  Tap below to attach a sample verification photo.
                </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={handleSimulate} style={styles.mockActionBtn}>
                  <Text style={styles.mockActionText}>Take {label}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  captureBox: {
    height: 120,
    borderWidth: 2,
    borderColor: colors.primary.default,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary.light,
    marginTop: 6,
  },
  subCaptureText: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  previewContainer: {
    height: 120,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.success.default,
    marginLeft: 4,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.white,
  },
  retakeBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.screen,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  cameraView: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: colors.transparent,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
  },
  cameraTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
  },
  cameraFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 20,
  },
  simulationBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  simulationBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  triggerBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  simulatorContainer: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  simulatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  simulatorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  simulatorBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  simulatorMsg: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  simulatorSubMsg: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  mockActionBtn: {
    backgroundColor: colors.primary.default,
    paddingHorizontal: spacing.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    width: '100%',
  },
  mockActionText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
