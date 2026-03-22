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

export const isIgnorableExtensionError = (...values: unknown[]) => {
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

const handleIgnorableError = (event: Event, ...values: unknown[]) => {
  if (!isIgnorableExtensionError(...values)) {
    return false;
  }

  suppressBrowserEvent(event);
  return true;
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

  const previousOnError = window.onerror;
  const previousOnUnhandledRejection = window.onunhandledrejection;

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (handleIgnorableError(event, event.reason)) {
        console.warn("Ignored external browser extension rejection:", event.reason);
      }
    },
    { capture: true }
  );

  window.addEventListener(
    "error",
    (event) => {
      if (handleIgnorableError(event, event.error, event.message, event.filename)) {
        console.warn("Ignored external browser extension error:", event.error ?? event.message);
      }
    },
    { capture: true }
  );

  window.onunhandledrejection = (event) => {
    if (handleIgnorableError(event, event.reason)) {
      console.warn("Ignored external browser extension rejection:", event.reason);
      return true;
    }

    return previousOnUnhandledRejection?.call(window, event);
  };

  window.onerror = (message, source, lineno, colno, error) => {
    if (isIgnorableExtensionError(error, message, source)) {
      console.warn("Ignored external browser extension error:", error ?? message);
      return true;
    }

    return previousOnError?.call(window, message, source, lineno, colno, error) ?? false;
  };
};
