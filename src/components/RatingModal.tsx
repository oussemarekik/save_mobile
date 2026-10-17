import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ratingsApi } from "@/lib/api-client";
import { useLanguage } from "@/context/LanguageContext";
import { theme } from "@/lib/theme";
import Toast from "react-native-toast-message";
import { sanitizeErrorMessage } from "@/utils/errorUtils";

const FEEDBACK_TAGS = [
  "great_value",
  "fresh_food",
  "friendly_staff",
  "good_quantity",
  "excellent_quality",
  "fast_pickup",
  "well_packaged",
] as const;

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  providerId: number;
  providerName?: string;
  onSubmitted?: () => void;
}

export function RatingModal({
  visible,
  onClose,
  orderId,
  providerId,
  providerName,
  onSubmitted,
}: RatingModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const submitMutation = useMutation({
    mutationFn: () =>
      ratingsApi.create({
        orderId,
        providerId,
        rating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      queryClient.invalidateQueries({ queryKey: ["rating", orderId] });
      queryClient.invalidateQueries({ queryKey: ["provider-rating", providerId] });
      Toast.show({
        type: "success",
        text1: t("rating.submitted_success") || "Thank you for your rating!",
      });
      resetAndClose();
      onSubmitted?.();
    },
    onError: (error: unknown) => {
      Toast.show({
        type: "error",
        text1: t("common.error") || "Error",
        text2: sanitizeErrorMessage(error, {
          defaultMessage: t("rating.submit_failed") || "Failed to submit rating.",
        }),
      });
    },
  });

  const resetAndClose = () => {
    setRating(0);
    setSelectedTags([]);
    setComment("");
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Toast.show({
        type: "error",
        text1: t("rating.select_rating") || "Please select a rating",
      });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <Pressable style={styles.overlay} onPress={resetAndClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t("rating.title") || "Rate Your Experience"}</Text>
            <Text style={styles.subtitle}>
              {providerName
                ? (t("rating.description_with_name") || `How was your experience with ${providerName}?`).replace(
                    "{name}",
                    providerName
                  )
                : t("rating.description") || "How was your experience with this food provider?"}
            </Text>

            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color={star <= rating ? "#f97316" : "#d1d5db"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>
              {t("rating.quick_feedback") || "What did you like? (Optional)"}
            </Text>
            <View style={styles.tags}>
              {FEEDBACK_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, selected && styles.tagSelected]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                      {t(`rating.tag.${tag}`) || tag.replace(/_/g, " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>
              {t("rating.comment_label") || "Additional comments (Optional)"}
            </Text>
            <TextInput
              style={styles.comment}
              value={comment}
              onChangeText={setComment}
              placeholder={t("rating.comment_placeholder") || "Share your experience..."}
              placeholderTextColor={theme.muted}
              multiline
              maxLength={500}
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.skip}
                onPress={resetAndClose}
                disabled={submitMutation.isPending}
              >
                <Text style={styles.skipText}>{t("rating.skip") || "Skip"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submit, submitMutation.isPending && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t("rating.submit") || "Submit Rating"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: theme.foreground, marginBottom: 6 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 20, lineHeight: 20 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: theme.foreground, marginBottom: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#fff",
  },
  tagSelected: { backgroundColor: theme.primaryBg, borderColor: theme.primary },
  tagText: { fontSize: 13, color: theme.muted, fontWeight: "500" },
  tagTextSelected: { color: theme.primary, fontWeight: "700" },
  comment: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
    color: theme.foreground,
    marginBottom: 20,
  },
  actions: { flexDirection: "row", gap: 10 },
  skip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  skipText: { fontWeight: "600", color: theme.muted },
  submit: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: theme.primary,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontWeight: "700", color: "#fff" },
});
