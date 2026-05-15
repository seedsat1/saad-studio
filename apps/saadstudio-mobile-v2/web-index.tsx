import { Platform, Text, View } from "react-native";

export default function WebHome() {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          🎬 Saad Studio
        </Text>
        <Text style={{ fontSize: 16, color: "#999", textAlign: "center" }}>
          Mobile app on web (experimental)
        </Text>
      </View>
    );
  }

  // Import mobile version only for native
  const HomeScreen = require("@/app/index").default;
  return <HomeScreen />;
}
