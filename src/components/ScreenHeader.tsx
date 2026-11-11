import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { safeGoBack } from "@/lib/navigation";
import { useHeaderTopPadding } from "@/lib/screen-insets";

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const paddingTop = useHeaderTopPadding();
  return (
    <View style={[styles.header, { paddingTop }]}>
      <TouchableOpacity style={styles.backButton} onPress={onBack ?? (() => safeGoBack(router, "/"))}>
        <Ionicons name="arrow-back" size={20} color={theme.foreground} />
      </TouchableOpacity>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** Sticky title bar for tab roots (no back button). Keeps page content below the status bar. */
export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const paddingTop = useHeaderTopPadding();
  return (
    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", color: theme.foreground },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 2 },
  right: { marginLeft: 8 },
});
