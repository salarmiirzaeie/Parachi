// app/index.tsx
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import CustomPermissionModal from "../components/CustomPermissionModal";

export default function ParachiApp() {
  const webViewRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // iOS: your WebView flow is different; keep it simple
    if (Platform.OS !== "android") {
      setPermissionsGranted(true);
      setPermissionModalVisible(false);
      return;
    }

    try {
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();

      const mediaLibraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      const ok =
        cameraPermission.status === "granted" &&
        mediaLibraryPermission.status === "granted";

      setPermissionsGranted(ok);

      // If user rejected => show modal
      setPermissionModalVisible(!ok);
    } catch (error) {
      console.error("Error requesting permissions:", error);
      setPermissionsGranted(false);
      setPermissionModalVisible(true);
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  // Inject JavaScript to handle camera properly
  const injectCameraScript = `
    (function() {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

      navigator.mediaDevices.getUserMedia = async function(constraints) {
        try {
          if (window._activeStream) {
            window._activeStream.getTracks().forEach(track => track.stop());
          }

          const stream = await originalGetUserMedia(constraints);
          window._activeStream = stream;

          stream.oninactive = () => {
            if (window._activeStream === stream) {
              window._activeStream = null;
            }
          };

          return stream;
        } catch (error) {
          console.error('getUserMedia error:', error);
          throw error;
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && window._activeStream) {
          window._activeStream.getTracks().forEach(track => track.stop());
          window._activeStream = null;
        }
      });

      console.log('Camera script injected successfully');
    })();
    true;
  `;

  return (
    <SafeAreaProvider style={styles.container}>
      <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
        <StatusBar style="auto" />

        <CustomPermissionModal
          visible={permissionModalVisible}
          onCancel={() => setPermissionModalVisible(false)} // close modal
          onRetry={() => requestPermissions()} // ask permissions again
        />

        <WebView
          ref={webViewRef}
          source={{ uri: "https://app.parachi.com" }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsBackForwardNavigationGestures={true}
          allowFileAccess={true}
          mediaCapturePermissionGrantType="grant"
          allowsInlineMediaPlayback={true}
          allowsAirPlayForMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          injectedJavaScriptBeforeContentLoaded={injectCameraScript}
          onLoadStart={() => console.log("WebView loading started")}
          onLoadEnd={() => console.log("WebView loading finished")}
          onError={(error) =>
            console.error("WebView error:", error.nativeEvent)
          }
          onHttpError={(error) =>
            console.error("HTTP error:", error.nativeEvent)
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
