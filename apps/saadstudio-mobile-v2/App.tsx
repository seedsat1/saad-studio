import { Platform, View, Text } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        {Platform.OS === "web" ? "🎬 Web Version" : "🎬 Mobile Version"}
      </Text>
      <Text style={{ fontSize: 14, marginTop: 10, color: "#666" }}>
        Saad Studio is loading...
      </Text>
    </View>
  );
}
