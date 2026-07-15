import { useEffect } from "react";
import { useRouter } from "expo-router";

/** Redirects to offers screen with create form open — matches web /provider/addOffer flow */
export default function AddOffer() {
  const router = useRouter();
  useEffect(() => {
    router.replace({ pathname: "/(provider)/offers", params: { create: "true" } } as any);
  }, [router]);
  return null;
}
