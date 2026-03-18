import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildWorkOrderPrintHtml, printWorkOrderReceipt, shareWorkOrderReceipt } from './workOrderReceipt';

type Props = {
  visible: boolean;
  order: Record<string, unknown> | null;
  storeSettings?: Record<string, unknown> | null;
  onClose: () => void;
};

export default function WorkOrderPreviewModal({ visible, order, storeSettings, onClose }: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const mergedOrder = useMemo(() => {
    if (!order) return null;
    return {
      ...order,
      ...(storeSettings || {}),
    } as Record<string, unknown>;
  }, [order, storeSettings]);

  const html = useMemo(() => {
    if (!mergedOrder) return '<html><body></body></html>';
    return buildWorkOrderPrintHtml(mergedOrder as any);
  }, [mergedOrder]);

  const handleShare = async () => {
    if (!mergedOrder || isSharing) return;
    try {
      await shareWorkOrderReceipt(mergedOrder as any, { onProcessingChange: setIsSharing });
    } catch {
      setIsSharing(false);
    }
  };

  const handlePrint = async () => {
    if (!mergedOrder || isPrinting) return;
    setIsPrinting(true);
    try {
      await printWorkOrderReceipt(mergedOrder as any);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Xem trước phiếu</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.shareBtn, isSharing && styles.disabledBtn]}
              onPress={handleShare}
              disabled={isSharing}
            >
              {isSharing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Chia sẻ</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.printBtn, isPrinting && styles.disabledBtn]}
              onPress={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>In</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.closeBtn]} onPress={onClose}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>
        </View>

        <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    backgroundColor: '#4caf50',
  },
  printBtn: {
    backgroundColor: '#3b82f6',
  },
  closeBtn: {
    backgroundColor: '#e5e7eb',
    width: 44,
    paddingHorizontal: 0,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    color: '#6b7280',
    fontSize: 20,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  webview: {
    flex: 1,
    backgroundColor: '#d1d5db',
  },
});
