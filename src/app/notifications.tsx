import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { notificationsApi, type AppNotification } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

function iconForType(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "ORDER_CONFIRMED":
      return "checkmark-circle-outline";
    case "ORDER_READY_FOR_PICKUP":
      return "bag-check-outline";
    case "NEW_OFFER_FROM_FAVORITE":
      return "heart-outline";
    case "NEW_ORDER":
      return "notifications-outline";
    case "ORDER_CANCELLED":
      return "close-circle-outline";
    default:
      return "notifications-outline";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading, isFetching, refetch } = useQuery({
    queryKey: ["notifications", page],
    queryFn: async () => {
      const data = await notificationsApi.list(page, 20);
      setItems((prev) => (page === 1 ? data.notifications : [...prev, ...data.notifications]));
      setHasMore(data.page < data.totalPages);
      return data;
    },
    enabled: isAuthenticated,
  });

  const markOne = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: (_data, id) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setPage(1);
    await refetch();
  }, [refetch]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={t("notifications.title") || "Notifications"}
          onBack={() => router.push("/(client)/profile")}
        />
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t("auth.signInRequired") || "Sign in required"}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signin")}>
            <Text style={styles.primaryButtonText}>{t("common.signIn") || "Sign In"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("notifications.title") || "Notifications"}
        onBack={() => router.push("/(client)/profile")}
        right={
          items.some((n) => !n.read) ? (
            <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending}>
              <Text style={styles.markAll}>{t("notifications.markAllRead") || "Mark all read"}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isFetching && page === 1} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={40} color={theme.muted} />
              <Text style={styles.emptyTitle}>{t("notifications.empty") || "No notifications yet"}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => {
                if (!item.read) markOne.mutate(item.id);
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
                <Ionicons name={iconForType(item.type)} size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage}>{item.message}</Text>
                <Text style={styles.cardTime}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </TouchableOpacity>
          )}
          onEndReached={() => {
            if (hasMore && !isFetching) setPage((p) => p + 1);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  list: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: theme.muted, textAlign: "center" },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  markAll: { color: theme.primary, fontWeight: "700", fontSize: 13 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  cardUnread: { borderColor: theme.primaryBorder, backgroundColor: "#f0fdf4" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: { backgroundColor: "#dcfce7" },
  cardTitle: { fontWeight: "700", fontSize: 14, color: theme.foreground, marginBottom: 2 },
  cardMessage: { fontSize: 13, color: theme.muted, lineHeight: 18 },
  cardTime: { fontSize: 11, color: "#9ca3af", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 6 },
});
