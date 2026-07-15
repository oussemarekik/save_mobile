import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { contactApi } from "@/lib/api-client";
import { ScreenHeader } from "@/components/ScreenHeader";
import { theme } from "@/lib/theme";
import Toast from "react-native-toast-message";

export default function ContactScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        email: user.email,
        name: user.username || f.name,
      }));
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setLoading(true);
    try {
      await contactApi.send({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || t("contact.email_subject_default"),
        message: form.message.trim(),
        userRole: user?.role || "GUEST",
        userId: user?.id,
      });
      Toast.show({ type: "success", text1: t("contact.success") || "Message sent!" });
      setForm({ name: "", email: user?.email || "", subject: "", message: "" });
    } catch {
      const subject = encodeURIComponent(form.subject || t("contact.email_subject_default"));
      const body = encodeURIComponent(form.message);
      Linking.openURL(`mailto:savetheplatetunisia@gmail.com?subject=${subject}&body=${body}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("contact.title")} subtitle={t("contact.subtitle")} onBack={() => router.push("/(client)/profile")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t("contact.name")} value={form.name} onChangeText={(name: string) => setForm((f) => ({ ...f, name }))} required />
        <Field label={t("contact.email")} value={form.email} onChangeText={(email: string) => setForm((f) => ({ ...f, email }))} keyboardType="email-address" required />
        <Field label={t("contact.subject")} value={form.subject} onChangeText={(subject: string) => setForm((f) => ({ ...f, subject }))} />
        <Field label={t("contact.message")} value={form.message} onChangeText={(message: string) => setForm((f) => ({ ...f, message }))} multiline required />
        <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t("contact.send_message_button")}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType, required }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? " *" : ""}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 120, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={theme.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.backgroundGradient },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontWeight: "600", color: theme.foreground, fontSize: 14 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, fontSize: 15, color: theme.foreground },
  submit: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
