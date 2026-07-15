import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { ConfirmDialogProps } from "@/components/ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: ConfirmDialogProps["icon"];
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    visible: boolean;
    options: ConfirmOptions | null;
    loading: boolean;
  }>({ visible: false, options: null, loading: false });

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({ visible: true, options, loading: false });
  }, []);

  const close = useCallback(() => {
    setState({ visible: false, options: null, loading: false });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!state.options) return;
    try {
      setState((prev) => ({ ...prev, loading: true }));
      await state.options.onConfirm();
      close();
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.options, close]);

  const dialog = (
    <ConfirmDialog
      visible={state.visible}
      title={state.options?.title ?? ""}
      message={state.options?.message ?? ""}
      confirmLabel={state.options?.confirmLabel}
      cancelLabel={state.options?.cancelLabel}
      destructive={state.options?.destructive}
      icon={state.options?.icon}
      loading={state.loading}
      onConfirm={handleConfirm}
      onCancel={close}
    />
  );

  return { confirm, dialog, close };
}
