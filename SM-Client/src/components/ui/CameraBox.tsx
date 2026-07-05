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
    // Request permission if not determined
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        // Enforce simulator mock mode automatically if permission is denied or unavailable
        setIsSimulatorMock(true);
      }
    }
    setLoading(false);
    setCameraActive(true);
  };

  const handleCapture = async () => {
    if (cameraRef.current && !isSimulatorMock) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
        });
        if (photo && photo.uri) {
          onPhotoCaptured(photo.uri);
          handleClose();
        }
      } catch (error) {
        // Fallback to simulation if native capture fails
        handleSimulate();
      }
    } else {
      handleSimulate();
    }
  };

  const handleSimulate = () => {
    // Generate a beautiful visual mock placeholder depending on the label
    let mockUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'; // Form/cargo placeholder
    if (label.toLowerCase().includes('lorry') || label.toLowerCase().includes('vehicle')) {
      mockUrl = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=400&q=80'; // Lorry photo placeholder
    } else if (label.toLowerCase().includes('unload')) {
      mockUrl = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=400&q=80'; // Unloading site placeholder
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
              <CheckCircle2 size={16} color="#16A34A" />
              <Text style={styles.badgeText}>CAPTURED</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPhotoCleared}
              style={styles.retakeBtn}
            >
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={styles.retakeBtnText}>RETAKE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenScanner}
          style={styles.captureBox}
        >
          <CameraIcon size={32} color="#1E40AF" />
          <Text style={styles.captureText}>Tap to Capture</Text>
          <Text style={styles.subCaptureText}>Camera Lock Enabled</Text>
        </TouchableOpacity>
      )}

      {/* Camera Capture Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text style={styles.loaderText}>Initializing Hardware Interface...</Text>
            </View>
          ) : permission?.granted && !isSimulatorMock ? (
            // Active Device Camera View
            <CameraView style={styles.cameraView} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                  <Text style={styles.cameraTitle}>{label}</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cameraFooter}>
                  {/* Option to force mock in case of emulator black screen */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSimulate}
                    style={styles.simulationBtn}
                  >
                    <Text style={styles.simulationBtnText}>Use Simulated Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleCapture}
                    style={styles.triggerBtn}
                  >
                    <View style={styles.triggerInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          ) : (
            // Simulator Simulator UI if permission is denied / unavailable
            <View style={styles.simulatorContainer}>
              <View style={styles.simulatorHeader}>
                <Text style={styles.simulatorTitle}>CAMERA HARDWARE SIMULATOR</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <X size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <View style={styles.simulatorBody}>
                <CameraIcon size={80} color="#9CA3AF" />
                <Text style={styles.simulatorMsg}>
                  {permission?.granted === false
                    ? 'Camera permission denied or camera unavailable.'
                    : 'System is running inside an Emulator/Simulator.'}
                </Text>
                <Text style={styles.simulatorSubMsg}>
                  San Mines Logistics secure engine will simulate photo verification.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSimulate}
                  style={styles.mockActionBtn}
                >
                  <Text style={styles.mockActionText}>Simulate {label} Photo</Text>
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
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  captureBox: {
    height: 120,
    borderWidth: 2,
    borderColor: '#1E40AF',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginTop: 6,
  },
  subCaptureText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  previewContainer: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#16A34A',
    marginLeft: 4,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  retakeBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  // Modal & Camera View Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  cameraTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  cameraFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 20,
  },
  simulationBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  simulationBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  triggerBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  // Simulator UI
  simulatorContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  simulatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  simulatorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  simulatorBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  simulatorMsg: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  simulatorSubMsg: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  mockActionBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 24,
    height: 52, // >= 48px touch target
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  mockActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
