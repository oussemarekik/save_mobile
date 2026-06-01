import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={s.container}>
      <Text style={s.title}>Page Not Found</Text>
      <TouchableOpacity onPress={() => router.replace("/")}>
        <Text style={s.link}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 16 },
  link: { fontSize: 16, color: "#16a34a", fontWeight: "600" },
});