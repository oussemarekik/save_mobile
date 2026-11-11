import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

type UploadFileInput = string | { uri: string; mimeType?: string; fileName?: string };

export function normalizeUploadFile(file: UploadFileInput, index: number) {
  const uri = typeof file === "string" ? file : file.uri;
  let fileName =
    (typeof file === "string" ? uri.split("/").pop()?.split("?")[0] : file.fileName) ||
    `image_${Date.now()}_${index}.jpg`;

  let mimeType = (typeof file === "object" && file.mimeType) || "image/jpeg";
  if (
    mimeType === "image/jpg" ||
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    mimeType === "image/webp" ||
    mimeType === "image"
  ) {
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

function pathFileName(uri: string): string {
  return uri.split("/").pop()?.split("?")[0] ?? "";
}

/**
 * Pickers often return content://, ph://, or a file whose name is .heic / .webp
 * or has no extension. The API only accepts jpg, png and gif filenames, so copy
 * into the cache under a safe name before upload.
 */
export async function ensureUploadableUri(
  uri: string,
  fileName: string
): Promise<string> {
  if (Platform.OS === "web" || !uri) {
    return uri;
  }

  let from = uri;
  if (from.startsWith("/") && Platform.OS === "android") {
    from = `file://${from}`;
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (from.startsWith("file://") && pathFileName(from) === safeName) {
    return from;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return from;
  }

  const dest = `${cacheDir}upload_${Date.now()}_${safeName}`;

  try {
    await FileSystem.copyAsync({ from, to: dest });
    return dest;
  } catch {
    try {
      const base64 = await FileSystem.readAsStringAsync(from, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(dest, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return dest;
    } catch {
      return from;
    }
  }
}
