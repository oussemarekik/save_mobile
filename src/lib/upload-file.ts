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
