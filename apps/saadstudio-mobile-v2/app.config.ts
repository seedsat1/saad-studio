import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Saad Studio",
  slug: "saadstudio-mobile-v2",
  version: "0.2.0",
  orientation: "portrait",
  scheme: "saadstudio",
  userInterfaceStyle: "dark",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "cover",
    backgroundColor: "#050711"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "app.saadstudio.mobile"
  },
  android: {
    package: "app.saadstudio.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#050711"
    }
  },
  plugins: ["expo-secure-store"]
};

export default config;
