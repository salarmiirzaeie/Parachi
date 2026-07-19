// app/index.tsx
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import CustomPermissionModal from "../components/CustomPermissionModal";

type DownloadMessage = {
  type: "DOWNLOAD_FILE";
  payload: {
    url: string;
    filename: string;
    mimeType: string;
  };
};

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

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const message: DownloadMessage = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case "DOWNLOAD_FILE":
          console.log("Download request received:");
          console.log(message.payload);

          const { url, filename } = message.payload;

          try {
            console.log("Downloading:", url);

            const safeFilename = filename.replace(/[^\w.-]/g, "_");

            const destination = FileSystem.cacheDirectory + safeFilename;
            const result = await FileSystem.downloadAsync(url, destination);

            console.log(result.uri);

            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(result.uri);
            } else {
              console.log("Sharing not available");
            }
          } catch (error) {
            console.error("Download failed", error);

            webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(
                 new CustomEvent('native-download-error', {
                 detail: ${JSON.stringify(String(error))}
                })
              );
            true;
            `);
          }

          break;

        default:
          console.log("Unknown message", message);
      }
    } catch (error) {
      console.error("Invalid WebView message:", error);
    }
  };

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
          console.error("getUserMedia error:", error);
          throw error;
        }
      };

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && window._activeStream) {
          window._activeStream.getTracks().forEach(track => track.stop());
          window._activeStream = null;
        }
      });

      console.log("Camera script injected successfully");
    })();

    true;
  `;

  return (
    <SafeAreaProvider style={styles.container}>
      <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
        <StatusBar style="auto" />

        <CustomPermissionModal
          visible={permissionModalVisible}
          onCancel={() => setPermissionModalVisible(false)}
          onRetry={() => requestPermissions()}
        />

        <WebView
          ref={webViewRef}
          source={{ uri: "https://app.parachi.com" }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowsInlineMediaPlayback
          allowsAirPlayForMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          allowsBackForwardNavigationGestures
          injectedJavaScriptBeforeContentLoaded={injectCameraScript}
          onMessage={handleMessage}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
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
