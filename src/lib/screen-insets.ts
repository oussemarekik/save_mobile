import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Approx. Expo/React Navigation tab bar height excluding the system nav inset. */
const TAB_BAR_CONTENT_HEIGHT = Platform.OS === "android" ? 72 : 64;

/**
 * Android 3-button / gesture nav often reports 0 or a tiny inset when the bar
 * is translucent. Keep a floor so content never sits under the system menu.
 */
const ANDROID_SYSTEM_NAV_FLOOR = 48;

/** Breathing room around page content (above first block / below last block). */
export const SCREEN_CONTENT_GAP = Platform.OS === "android" ? 28 : 20;

/** Space between the status bar and header content, same idea as the tab bar inset. */
export function useHeaderTopPadding(extra = 12) {
  const insets = useSafeAreaInsets();
  return insets.top + extra;
}

/** Safe bottom inset for the Android/iOS system navigation area. */
export function useSystemBottomInset() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "android") {
    return Math.max(insets.bottom, ANDROID_SYSTEM_NAV_FLOOR);
  }
  return Math.max(insets.bottom, 0);
}

/**
 * Bottom padding for stack screens (no tab bar): clears the system nav bar
 * with a little breathing room under the last content.
 */
export function useScreenBottomPadding(extra = SCREEN_CONTENT_GAP) {
  return useSystemBottomInset() + extra;
}

/**
 * Bottom padding so ScrollView content clears the tab bar + system nav,
 * with extra space under the last item.
 */
export function useTabBarBottomPadding(extra = SCREEN_CONTENT_GAP) {
  return TAB_BAR_CONTENT_HEIGHT + useSystemBottomInset() + extra;
}

/**
 * Vertical padding for tab-screen scroll content: space above the first block
 * and enough room below so nothing sits under the footer / Android menu.
 */
export function useTabScreenContentInsets(extra = SCREEN_CONTENT_GAP) {
  const bottom = useTabBarBottomPadding(extra);
  return {
    paddingTop: extra,
    paddingBottom: bottom,
  };
}
