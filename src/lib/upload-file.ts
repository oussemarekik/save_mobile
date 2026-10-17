import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

type UploadFileInput = string | { uri: string; mimeType?: string; fileName?: string };

export function normalizeUploadFile(file: UploadFileInput, index: number) {
  const uri = typeof file === "string" ? file : file.uri;
  let fileName =
    (typeof file === "string" ? uri.split("/").pop()?.split("?")[0] : file.fileName) ||
    `image_${Date.now()}_${index}.jpg`;

  let mimeType = (typeof file === "object" && file.mimeType) || "image/jpeg";
  if (mimeType === "image/jpg" || mimeType === "image/heic" || mimeType === "image/heif") {
    mimeType = "image/jpeg";
  }
  // Android pickers sometimes return a generic "image" type.
  if (mimeType === "image") {
    mimeType = "image/jpeg";
  }

  if (!/\.(jpe?g|png|gif)$/i.test(fileName)) {
    const ext =
      mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : "jpg";
    fileName = `image_${Date.now()}_${index}.${ext}`;
  } else if (mimeType === "image/jpeg" && /\.png$/i.test(fileName)) {
    mimeType = "image/png";
  } else if (mimeType === "image/jpeg" && /\.gif$/i.test(fileName)) {
    mimeType = "image/gif";
  }

  return { uri, fileName, mimeType };
}

/**
 * Android image pickers often return content:// URIs that FormData/fetch cannot
 * read. Copy into the app cache so uploads always use a file:// path.
 */
export async function ensureUploadableUri(
  uri: string,
  fileName: string
): Promise<string> {
  if (Platform.OS === "web" || !uri) {
    return uri;
  }

  if (uri.startsWith("file://")) {
    return uri;
  }

  // Absolute filesystem path without scheme (some Android builds)
  if (uri.startsWith("/") && Platform.OS === "android") {
    return `file://${uri}`;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return uri;
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = `${cacheDir}upload_${Date.now()}_${safeName}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    // Last resort: try reading as base64 and rewriting as a local file
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(dest, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return dest;
    } catch {
      return uri;
    }
  }
}
