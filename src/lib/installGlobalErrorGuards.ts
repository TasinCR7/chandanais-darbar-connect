const TRONLINK_EXTENSION_ID = "ibnejdfjmmkpcnlpebklmnkoeoihofec";

const toMessage = (value: unknown) => {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ""}`;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const isIgnorableExtensionError = (value: unknown) => {
  const message = toMessage(value).toLowerCase();

  return (
    message.includes("tronlinkparams") ||
    message.includes("tronlink") ||
    message.includes(`chrome-extension://${TRONLINK_EXTENSION_ID}`)
  );
};

export const installGlobalErrorGuards = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("unhandledrejection", (event) => {
    if (isIgnorableExtensionError(event.reason)) {
      event.preventDefault();
      console.warn("Ignored external browser extension rejection:", event.reason);
    }
  });

  window.addEventListener("error", (event) => {
    if (
      isIgnorableExtensionError(event.error) ||
      isIgnorableExtensionError(event.message) ||
      isIgnorableExtensionError(event.filename)
    ) {
      event.preventDefault();
      console.warn("Ignored external browser extension error:", event.error ?? event.message);
    }
  });
};
