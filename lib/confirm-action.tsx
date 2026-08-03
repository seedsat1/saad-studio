"use client";

import { createRoot } from "react-dom/client";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

type ConfirmActionOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function confirmAction(options: ConfirmActionOptions = {}): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const finish = (confirmed: boolean) => {
      root.unmount();
      container.remove();
      resolve(confirmed);
    };

    root.render(
      <ConfirmActionDialog
        open
        title={options.title}
        description={options.description}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        destructive={options.destructive}
        onCancel={() => finish(false)}
        onConfirm={() => finish(true)}
      />,
    );
  });
}