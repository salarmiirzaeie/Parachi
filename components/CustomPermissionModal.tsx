import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onCancel?: () => void;
  onRetry?: () => void;
};

export default function CustomPermissionModal({
  visible,
  title = "دسترسی لازم است",
  message = "برای استفاده از دوربین نیاز به دسترسی دارید. لطفاً از بخش تنظیمات دسترسی های مورد نیاز را فعال کنید.",
  onCancel,
  onRetry,
}: Props) {
  const openSettings = async () => {
    try {
      // RN 0.71+ usually supports this on both Android/iOS
      if (Linking.openSettings) {
        await Linking.openSettings();
        return;
      }

      // Fallback for older iOS
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      }
    } catch (e) {
      // If it fails, there's not much we can do besides not crashing
      console.warn("Could not open settings:", e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={openSettings}
            >
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                تنظیمات
              </Text>
            </Pressable>
             <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                لغو
              </Text>
            </Pressable>
          </View>
          {onRetry ? (
            <Pressable style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>تلاش مجدد</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 18,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,

    // RTL
    alignItems: "stretch",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
    color: "#111827",
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    textAlign: "right",
    color: "#374151",
    lineHeight: 22,
    marginBottom: 14,
  },

  actionsRow: {
    flexDirection: "row", // RTL button order
    gap: 10,
  },

  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPrimary: {
    backgroundColor: "#fcd500",
  },

  buttonSecondary: {
      backgroundColor: "#f4f3f3",
  },

  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  buttonTextPrimary: {
    color: "#464900",
  },

  buttonTextSecondary: {
    color: "#111827",
  },

   // NEW: full-width centered retry button
  retryButton: {
    marginTop: 12,
    width: "100%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161C2A",
  },

  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
