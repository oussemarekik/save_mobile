import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { getPostAuthRedirect } from "@/lib/redirect-utils";
import { readAuthIntentRole, writeAuthIntentRole } from "@/lib/authIntent";
import { theme } from "@/lib/theme";
import { FloatingFoods } from "@/components/FloatingFoods";

const LOGO = require("@/assets/images/logo.png");
const WELCOME_TITLE = require("@/assets/images/welcome.png");
/** Intrinsic size of welcome.png */
const TITLE_ASPECT = 696 / 358;

const INK = "#111111";
const CREAM = "#FEFBF6";
const CONTENT_MAX = 420;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const pillShadow =
  Platform.OS === "web"
    ? { boxShadow: "3px 4px 0 rgba(0,0,0,0.22)" }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 0,
        elevation: 4,
      };

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t, language, setLanguage } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);

  const topPad = Math.max(insets.top, 12);
  const bottomPad = Math.max(insets.bottom, 16) + 8;

  const layout = useMemo(() => {
    const horizontalPad = clamp(windowWidth * 0.07, 20, 32);
    const contentWidth = Math.min(windowWidth - horizontalPad * 2, CONTENT_MAX);
    const available = Math.max(windowHeight - topPad - bottomPad, 320);

    // Single scale factor so logo + title + copy + 3 CTAs always fit the viewport.
    const scale = clamp(available / 720, 0.62, 1);

    const logoSize = Math.round(112 * scale);
    const titleWidth = Math.round(Math.min(windowWidth - 24, 560) * scale);
    const titleHeight = Math.round(titleWidth / TITLE_ASPECT);
    const taglineSize = Math.round(16 * scale);
    const mainGap = Math.round(12 * scale);
    const actionGap = Math.round(8 * scale);
    const btnMinHeight = Math.round(38 * scale);
    const btnPadV = Math.round(8 * scale);
    const btnPadH = Math.round(20 * scale);
    const btnFontSize = clamp(13 * scale, 12, 14);
    const btnWidth = Math.round(contentWidth * 0.72);
    const stackHeight =
      logoSize +
      titleHeight +
      taglineSize * 1.35 +
      mainGap * 3 +
      btnMinHeight * 3 +
      actionGap * 2;
    const heroLift = Math.round(
      clamp((available - stackHeight) / 2 - 8, 0, 36)
    );

    return {
      horizontalPad,
      contentWidth,
      logoSize,
      titleWidth,
      titleHeight,
      taglineSize,
      mainGap,
      actionGap,
      btnMinHeight,
      btnPadV,
      btnPadH,
      btnFontSize,
      btnWidth,
      heroLift,
    };
  }, [windowWidth, windowHeight, topPad, bottomPad]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.role || user.role === "NONE") {
      setPostAuthRedirect(null);
      return;
    }
    let cancelled = false;
    readAuthIntentRole().then((intentRole) => {
      if (cancelled) return;
      const dest = getPostAuthRedirect(user, intentRole);
      if (dest !== "/(auth)/signin" && dest !== "/(auth)/welcome") {
        setPostAuthRedirect(dest);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, user?.id, user?.role]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primaryDark} />
      </View>
    );
  }

  if (postAuthRedirect) {
    return <Redirect href={postAuthRedirect as any} />;
  }

  const goSignIn = () => router.push("/(auth)/signin");
  const goSignUp = async () => {
    await writeAuthIntentRole("CLIENT");
    router.push("/(auth)/signin?mode=signup");
  };
  const goBusiness = async () => {
    await writeAuthIntentRole("PROVIDER");
    router.push("/(auth)/ProviderSignup");
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: topPad,
          paddingBottom: bottomPad,
          paddingHorizontal: layout.horizontalPad,
        },
      ]}
    >
      <FloatingFoods />

      <View
        style={[
          styles.topRow,
          { top: topPad, right: layout.horizontalPad },
        ]}
      >
        <Pressable
          onPress={() => setLanguage(language === "fr" ? "en" : "fr")}
          style={styles.langBtn}
          accessibilityRole="button"
          accessibilityLabel={language === "fr" ? "English" : "Français"}
        >
          <Ionicons name="language-outline" size={18} color={INK} />
          <Text style={styles.langLabel}>{language.toUpperCase()}</Text>
        </Pressable>
      </View>

      <View style={[styles.centerStack, { gap: layout.mainGap }]}>
        <View
          style={[
            styles.hero,
            {
              maxWidth: Math.max(layout.contentWidth, layout.titleWidth),
              gap: layout.mainGap,
              transform: [{ translateY: -layout.heroLift }],
            },
          ]}
        >
          <Image
            source={LOGO}
            style={{
              width: layout.logoSize,
              height: layout.logoSize,
              borderRadius: layout.logoSize * 0.25,
            }}
            resizeMode="contain"
          />
          <Image
            source={WELCOME_TITLE}
            style={{
              width: layout.titleWidth,
              height: layout.titleHeight,
            }}
            resizeMode="contain"
            accessibilityLabel="SaveThePlate"
          />
          <Text
            style={[
              styles.tagline,
              {
                fontSize: layout.taglineSize,
                lineHeight: layout.taglineSize * 1.35,
              },
            ]}
          >
            {t("landing.badge_text") ||
              "Save food. Save money. Save the planet."}
          </Text>
        </View>

        <View
          style={[
            styles.actions,
            {
              width: layout.btnWidth,
              gap: layout.actionGap,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.pillBtn,
              {
                minHeight: layout.btnMinHeight,
                paddingVertical: layout.btnPadV,
                paddingHorizontal: layout.btnPadH,
              },
            ]}
            onPress={goSignUp}
            activeOpacity={0.88}
          >
            <Text style={[styles.pillBtnText, { fontSize: layout.btnFontSize }]}>
              {t("landing.get_started") || "Get Started"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillBtn,
              {
                minHeight: layout.btnMinHeight,
                paddingVertical: layout.btnPadV,
                paddingHorizontal: layout.btnPadH,
              },
            ]}
            onPress={goSignIn}
            activeOpacity={0.88}
          >
            <Text style={[styles.pillBtnText, { fontSize: layout.btnFontSize }]}>
              {t("landing.sign_in") || "Sign In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillBtn,
              {
                minHeight: layout.btnMinHeight,
                paddingVertical: layout.btnPadV,
                paddingHorizontal: layout.btnPadH,
              },
            ]}
            onPress={goBusiness}
            activeOpacity={0.88}
          >
            <Text style={[styles.pillBtnText, { fontSize: layout.btnFontSize }]}>
              {t("landing.register_business") || "Register Your Business"} 🤝
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.hero,
    overflow: "hidden",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.hero,
  },
  topRow: {
    position: "absolute",
    alignItems: "flex-end",
    zIndex: 3,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    ...pillShadow,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: INK,
  },
  centerStack: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    minHeight: 0,
  },
  hero: {
    width: "100%",
    alignItems: "center",
  },
  tagline: {
    fontWeight: "700",
    color: theme.foreground,
    textAlign: "center",
    letterSpacing: -0.3,
    maxWidth: 280,
  },
  actions: {
    alignItems: "stretch",
    alignSelf: "center",
    zIndex: 2,
  },
  /** Cream pill + black border + hard offset shadow (Framer partner CTA) */
  pillBtn: {
    backgroundColor: CREAM,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: INK,
    ...pillShadow,
  },
  pillBtnText: {
    color: INK,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },
});
