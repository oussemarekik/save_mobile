import React, { useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { buildImageUrl } from "@/lib/api-client";

type ProfileImageProps = {
  /** Raw `profileImage` value from the API, or a local URI from the image picker. */
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  /** Shown when there is no image, or when it fails to load. */
  fallback: React.ReactNode;
};

export function ProfileImage({ uri, style, fallback }: ProfileImageProps) {
  const resolved = buildImageUrl(uri);
  // Track which URL failed rather than a boolean, so a new photo gets a fresh attempt.
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!resolved || failedUri === resolved) return <>{fallback}</>;

  return (
    <Image
      source={{ uri: resolved }}
      style={style}
      resizeMode="cover"
      onError={() => setFailedUri(resolved)}
    />
  );
}
