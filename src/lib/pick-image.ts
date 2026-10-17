import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ensureUploadableUri } from "@/lib/upload-file";

export type PickedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permission required",
      "Please allow photo library access to upload images."
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.uri) {
    return null;
  }

  let mimeType = asset.mimeType ?? "image/jpeg";
  let fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
  if (
    mimeType === "image/jpg" ||
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    mimeType === "image"
  ) {
    mimeType = "image/jpeg";
  }
  if (!/\.(jpe?g|png|gif)$/i.test(fileName)) {
    const ext =
      mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : "jpg";
    fileName = `image_${Date.now()}.${ext}`;
  }

  // Normalize content:// (and similar) to a local file:// URI before upload/preview.
  const uri =
    Platform.OS === "web"
      ? asset.uri
      : await ensureUploadableUri(asset.uri, fileName);

  return {
    uri,
    mimeType,
    fileName,
  };
}
