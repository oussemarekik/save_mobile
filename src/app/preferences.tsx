import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import {
  notificationsApi,
  type NotificationSettings,
} from "@/lib/api-client";
import Toast from "react-native-toast-message";
import {
  isNativePushSupported,
  registerForPushNotifications,
  unregisterPushNotifications,
} from "@/lib/push-notifications";
import { sanitizeErrorMessage } from "@/utils/errorUtils";

const LANGUAGES = [
  { code: "en" as const, name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "fr" as const, name: "French", nativeName: "Français", flag: "🇫🇷" },
];

const DEFAULT_SETTINGS: NotificationSettings = {
  orderConfirmed: true,
  orderReadyForPickup: true,
  newOffersFromFavorites: true,
  orderPending: true,
  orderCancelled: true,
  newOrder: true,
  pushEnabled: false,
  inAppEnabled: true,
};

export default function Preferences() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  const isProvider = user?.role === "PROVIDER" || user?.role === "PENDING_PROVIDER";
  const pushSupported = isNativePushSupported();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoadingSettings(true);
      try {
        const data = await notificationsApi.getSettings();
        if (!cancelled) setSettings((prev) => ({ ...prev, ...data }));
      } catch {
        // Keep defaults if settings cannot be loaded
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const previous = settings;
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavingKey(key);
    try {
      const updated = await notificationsApi.updateSettings({ [key]: value });
      setSettings((prev) => ({ ...prev, ...updated }));
      Toast.show({
        type: "success",
        text1: t("notification_settings.toast_updated") || "Settings updated",
      });
    } catch {
      setSettings(previous);
      Toast.show({
        type: "error",
        text1: t("notification_settings.toast_update_error") || "Failed to update settings",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    const previous = settings;
    setSettings((prev) => ({ ...prev, pushEnabled: enabled }));
    setSavingKey("pushEnabled");
    try {
      if (enabled) {
        if (!pushSupported) {
          throw new Error(
            Platform.OS === "web"
              ? "Push notifications require the iOS or Android app"
              : "Push notifications require a physical device"
          );
        }
        await registerForPushNotifications();
        const updated = await notificationsApi.getSettings();
        setSettings((prev) => ({ ...prev, ...updated, pushEnabled: true }));
        Toast.show({
          type: "success",
          text1: t("notification_settings.toast_push_enabled") || "Push notifications enabled",
        });
      } else {
        await unregisterPushNotifications();
        const updated = await notificationsApi.updateSettings({ pushEnabled: false });
        setSettings((prev) => ({ ...prev, ...updated }));
        Toast.show({
          type: "success",
          text1: t("notification_settings.toast_updated") || "Settings updated",
        });
      }
    } catch (error) {
      setSettings(previous);
      Toast.show({
        type: "error",
        text1: t("notification_settings.toast_push_error") || "Failed to enable push notifications",
        text2: sanitizeErrorMessage(error, {
          defaultMessage: t("notification_settings.toast_update_error") || "Failed to update settings",
        }),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      await notificationsApi.testPush();
      Toast.show({
        type: "success",
        text1: t("notification_settings.toast_test_sent") || "Test notification sent",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t("notification_settings.toast_test_failed") || "Failed to send test notification",
        text2: sanitizeErrorMessage(error, {
          defaultMessage: t("notification_settings.toast_test_error") || "Error sending test notification",
        }),
      });
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("preferences.title") || "Preferences"} onBack={() => router.push("/(client)/profile")} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.globeIcon}>
              <Ionicons name="globe-outline" size={20} color={theme.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>{t("preferences.language") || "Language"}</Text>
              <Text style={styles.sectionDesc}>{t("preferences.chooseLanguage") || "Choose your preferred language"}</Text>
            </View>
          </View>
          {LANGUAGES.map((lang) => {
            const selected = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langRow, selected && styles.langRowSelected]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.nativeName}</Text>
                </View>
                {selected && (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isAuthenticated && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.globeIcon, { backgroundColor: theme.blueBg }]}>
                <Ionicons name="notifications-outline" size={20} color={theme.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  {t("notification_settings.title") || "Notification Settings"}
                </Text>
                <Text style={styles.sectionDesc}>
                  {t("notification_settings.in_app_description") || "Choose which alerts you want to receive"}
                </Text>
              </View>
            </View>

            {loadingSettings ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 12 }} />
            ) : (
              <>
                <ToggleRow
                  label={t("notification_settings.push_enable") || "Enable push notifications"}
                  description={t("notification_settings.push_enable_desc") || "Get alerts on your device"}
                  value={settings.pushEnabled}
                  disabled={savingKey === "pushEnabled"}
                  onValueChange={handlePushToggle}
                />

                {settings.pushEnabled && pushSupported && (
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={handleTestPush}
                    disabled={testingPush}
                    activeOpacity={0.85}
                  >
                    {testingPush ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="notifications-outline" size={16} color="#fff" />
                        <Text style={styles.testButtonText}>
                          {t("notification_settings.push_test") || "Send a test notification"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {!pushSupported && (
                  <View style={styles.pushNote}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.amber} />
                    <Text style={styles.pushNoteText}>
                      {Platform.OS === "web"
                        ? (t("notification_settings.push_unsupported") ||
                          "Push notifications require the iOS or Android app on a physical device.")
                        : "Push notifications require a physical device (not a simulator)."}
                    </Text>
                  </View>
                )}

                <ToggleRow
                  label={t("notification_settings.in_app_enable") || "In-app notifications"}
                  description={t("notification_settings.in_app_enable_desc") || "Show notifications in the app"}
                  value={settings.inAppEnabled}
                  disabled={savingKey === "inAppEnabled"}
                  onValueChange={(v) => updateSetting("inAppEnabled", v)}
                />
                <ToggleRow
                  label={t("notification_settings.order_confirmed") || "Order confirmed"}
                  description={
                    isProvider
                      ? t("notification_settings.order_confirmed_desc_provider")
                      : t("notification_settings.order_confirmed_desc_client")
                  }
                  value={settings.orderConfirmed}
                  disabled={savingKey === "orderConfirmed"}
                  onValueChange={(v) => updateSetting("orderConfirmed", v)}
                />
                {!isProvider && (
                  <ToggleRow
                    label={t("notification_settings.order_ready") || "Order ready"}
                    description={t("notification_settings.order_ready_desc") || "When your order is ready for pickup"}
                    value={settings.orderReadyForPickup}
                    disabled={savingKey === "orderReadyForPickup"}
                    onValueChange={(v) => updateSetting("orderReadyForPickup", v)}
                  />
                )}
                {!isProvider && (
                  <ToggleRow
                    label={t("notification_settings.favorites_offers") || "New offers"}
                    description={t("notification_settings.favorites_offers_desc") || "New offers from favorite businesses"}
                    value={settings.newOffersFromFavorites}
                    disabled={savingKey === "newOffersFromFavorites"}
                    onValueChange={(v) => updateSetting("newOffersFromFavorites", v)}
                  />
                )}
                {isProvider && (
                  <>
                    <ToggleRow
                      label={t("notification_settings.new_order") || "New order"}
                      description={t("notification_settings.new_order_desc") || "When a customer places an order"}
                      value={settings.newOrder}
                      disabled={savingKey === "newOrder"}
                      onValueChange={(v) => updateSetting("newOrder", v)}
                    />
                    <ToggleRow
                      label={t("notification_settings.order_pending") || "Pending order"}
                      description={t("notification_settings.order_pending_desc") || "When an order awaits confirmation"}
                      value={settings.orderPending}
                      disabled={savingKey === "orderPending"}
                      onValueChange={(v) => updateSetting("orderPending", v)}
                    />
                    <ToggleRow
                      label={t("notification_settings.order_cancelled") || "Order cancelled"}
                      description={t("notification_settings.order_cancelled_desc") || "When an order is cancelled"}
                      value={settings.orderCancelled}
                      disabled={savingKey === "orderCancelled"}
                      onValueChange={(v) => updateSetting("orderCancelled", v)}
                    />
                  </>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!description && <Text style={styles.toggleDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#e5e7eb", true: theme.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { flexDirection: "row", gap: 12, marginBottom: 16 },
  globeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontWeight: "700", fontSize: 16, color: theme.foreground },
  sectionDesc: { fontSize: 13, color: theme.muted },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  langRowSelected: { borderColor: theme.primary, backgroundColor: theme.primaryBg },
  flag: { fontSize: 24 },
  langName: { fontWeight: "600", color: theme.foreground },
  langNative: { fontSize: 13, color: theme.muted },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  toggleDesc: { fontSize: 12, color: theme.muted, marginTop: 2, lineHeight: 16 },
  pushNote: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.amberBg,
  },
  pushNoteText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 16 },
  testButton: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: theme.blue,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  testButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
