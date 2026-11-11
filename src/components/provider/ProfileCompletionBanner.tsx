import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileData {
  location?: string;
  profileImage?: string;
}

export function ProfileCompletionBanner({
  profile,
  onEditProfile,
}: {
  profile: ProfileData | null;
  onEditProfile: () => void;
}) {
  const { t } = useLanguage();

  const missingItems = useMemo(() => {
    const items: { key: string; title: string }[] = [];
    if (!profile?.location?.trim()) {
      items.push({ key: "location", title: t("profile_completion.missing_location") || "Add your business address" });
    }
    if (!profile?.profileImage) {
      items.push({ key: "image", title: t("profile_completion.missing_image") || "Upload a profile image" });
    }
    return items;
  }, [profile, t]);

  if (missingItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={20} color="#b45309" />
      <View style={styles.content}>
        <Text style={styles.title}>{t("profile_completion.title") || "Complete your profile"}</Text>
        {missingItems.map((item) => (
          <Text key={item.key} style={styles.missingItem}>
            • {item.title}
          </Text>
        ))}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onEditProfile}>
            <Text style={styles.primaryBtnText}>
              {t("profile_completion.complete_now") || "Complete now"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: "#92400e", marginBottom: 6 },
  missingItem: { fontSize: 13, color: "#b45309", marginBottom: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  primaryBtn: {
    backgroundColor: "#d97706",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
