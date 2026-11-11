import { AppState, Platform } from "react-native";
import { QueryClient, focusManager } from "@tanstack/react-query";

// React Query does not observe AppState by default on native — wire it so
// refetchOnWindowFocus works when returning to the app.
if (Platform.OS !== "web") {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (status) => {
      handleFocus(status === "active");
    });
    return () => subscription.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 2, // 2 minutes — offers/orders stay reasonably fresh
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
