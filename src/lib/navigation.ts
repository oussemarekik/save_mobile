type BackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: any) => void;
};

export function safeGoBack(router: BackRouter, fallback: string = "/") {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
