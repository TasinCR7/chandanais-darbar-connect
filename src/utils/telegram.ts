import { getApiBase } from "@/lib/apiBase";

export type NotificationPayload =
  | {
      type: "doa";
      name: string;
      phone?: string;
      subject: string;
      address?: string;
      details: string;
    }
  | {
      type: "question" | "complaint";
      trackingNumber: string;
      name: string;
      phone?: string;
      subject: string;
      details: string;
    }
  | {
      type: "donation";
      donorName: string;
      donorPhone: string;
      categoryLabel: string;
      amount: number | string;
      paymentMethod: string;
      transactionId: string;
    };

export const escapeTelegramHtml = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export const sendStructuredTelegramNotification = async (
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBase()}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return false;
    const data = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return Boolean(data?.ok);
  } catch (error) {
    console.warn("Notification request error:", error);
    return false;
  }
};
