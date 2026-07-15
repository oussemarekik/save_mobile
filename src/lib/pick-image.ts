import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

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
  if (mimeType === "image/jpg" || mimeType === "image/heic" || mimeType === "image/heif") {
    mimeType = "image/jpeg";
  }
  if (!/\.(jpe?g|png|gif)$/i.test(fileName)) {
    fileName = `image_${Date.now()}.jpg`;
  }

  return {
    uri: asset.uri,
    mimeType,
    fileName,
  };
}
