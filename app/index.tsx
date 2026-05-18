// app/index.tsx
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Platform, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function ParachiApp() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        // Request camera permission
        const cameraPermission =
          await ImagePicker.requestCameraPermissionsAsync();
        const mediaLibraryPermission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        // Request microphone permission
        const { status: audioStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraPermission.status === "granted") {
          setPermissionsGranted(true);
        } else {
          Alert.alert(
            "دسترسی لازم است",
            "برای استفاده از دوربین نیاز به دسترسی دارید",
            [
              { text: "لغو", style: "cancel" },
              {
                text: "تنظیمات",
                onPress: () => ImagePicker.launchImageLibraryAsync(),
              },
            ]
          );
        }
      } catch (error) {
        console.error("Error requesting permissions:", error);
      }
    } else {
      setPermissionsGranted(true);
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
      backAction
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  // Inject JavaScript to handle camera properly
  const injectCameraScript = `
    (function() {
      // Store original getUserMedia
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      // Override getUserMedia to ensure proper cleanup
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        try {
          // Stop any existing tracks
          if (window._activeStream) {
            window._activeStream.getTracks().forEach(track => track.stop());
          }
          
          const stream = await originalGetUserMedia(constraints);
          window._activeStream = stream;
          
          // Clean up when page unloads
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
      
      // Clean up on page hide
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

  if (!permissionsGranted && Platform.OS === "android") {
    return (
      <SafeAreaProvider style={styles.container}>
        <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
          <StatusBar style="auto" />
          {/* Show loading or permission screen */}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
        <StatusBar style="auto" />
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
