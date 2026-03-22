const TRONLINK_EXTENSION_ID = "ibnejdfjmmkpcnlpebklmnkoeoihofec";
const ERROR_GUARD_FLAG = "__lovableGlobalErrorGuardsInstalled__";
const EXTENSION_ERROR_SIGNATURES = [
  "tronlinkparams",
  "tronlink",
  "'set' on proxy: trap returned falsish for property 'tronlinkparams'",
  `chrome-extension://${TRONLINK_EXTENSION_ID}`,
];

const collectMessages = (value: unknown, seen = new WeakSet<object>()): string[] => {
  if (value == null) {
    return [];
  }

  if (value instanceof Error) {
    return [value.name, value.message, value.stack ?? ""];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return [];
    }

    seen.add(value);

    const record = value as Record<string, unknown>;
    const nestedFields = ["message", "reason", "error", "stack", "filename", "sourceURL", "name"];
    const nestedMessages = nestedFields.flatMap((field) => collectMessages(record[field], seen));

    try {
      nestedMessages.push(JSON.stringify(value));
    } catch {
      nestedMessages.push(String(value));
    }

    return nestedMessages;
  }

  return [String(value)];
};

const isIgnorableExtensionError = (...values: unknown[]) => {
  const message = values
    .flatMap((value) => collectMessages(value))
    .join("\n")
    .toLowerCase();

  return EXTENSION_ERROR_SIGNATURES.some((signature) => message.includes(signature));
};

const suppressBrowserEvent = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
};

export const installGlobalErrorGuards = () => {
  if (typeof window === "undefined") {
    return;
  }

  const guardedWindow = window as Window & typeof globalThis & Record<string, boolean | undefined>;

  if (guardedWindow[ERROR_GUARD_FLAG]) {
    return;
  }

  guardedWindow[ERROR_GUARD_FLAG] = true;

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (isIgnorableExtensionError(event.reason)) {
        suppressBrowserEvent(event);
        console.warn("Ignored external browser extension rejection:", event.reason);
      }
    },
    { capture: true }
  );

  window.addEventListener(
    "error",
    (event) => {
      if (isIgnorableExtensionError(event.error, event.message, event.filename)) {
        suppressBrowserEvent(event);
        console.warn("Ignored external browser extension error:", event.error ?? event.message);
      }
    },
    { capture: true }
  );
};
