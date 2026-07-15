import Toast from "react-native-toast-message";

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast({ title, description, variant }: ToastOptions) {
  Toast.show({
    type: variant === "destructive" ? "error" : "success",
    text1: title,
    text2: description,
  });
}

export function useToast() {
  return { toast };
}
