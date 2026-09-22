import { Image, Platform } from "react-native";

const REMOTE_FALLBACK =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

/**
 * `Image.resolveAssetSource` is missing on Expo web (and some bundlers
 * expose Image as a module with `.default`). `require()` of a png is a
 * URL string on web and a numeric asset id on native.
 */
export function resolveAssetUri(asset: unknown): string {
  if (typeof asset === "string" && asset.length > 0) return asset;
  if (asset && typeof asset === "object") {
    const record = asset as { uri?: unknown; default?: unknown };
    if (typeof record.uri === "string" && record.uri.length > 0) return record.uri;
    if (record.default !== undefined && record.default !== asset) {
      return resolveAssetUri(record.default);
    }
  }

  if (Platform.OS !== "web") {
    const resolve =
      typeof Image.resolveAssetSource === "function"
        ? Image.resolveAssetSource.bind(Image)
        : undefined;
    if (resolve) {
      try {
        const source = resolve(asset as number);
        if (source?.uri) return source.uri;
      } catch {
        // fall through
      }
    }
  }

  return REMOTE_FALLBACK;
}

export const FALLBACK_IMAGE = resolveAssetUri(
  require("@/assets/images/defaultBag.png"),
);
