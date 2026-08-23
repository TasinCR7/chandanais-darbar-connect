/**
 * Telegram Notification Utility
 * Supports sending messages to multiple chat IDs simultaneously with HTML parse mode and fallback.
 */

// Helper to escape HTML characters in dynamic user content
export const escapeTelegramHtml = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export const sendTelegramNotification = async (message: string): Promise<boolean> => {
  try {
    const botToken = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
    const chatIdsString = (import.meta.env.VITE_TELEGRAM_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_IDS || "").trim();

    if (!botToken || !chatIdsString) {
      console.warn("⚠️ Telegram Error: VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID missing");
      return false;
    }

    const chatIds = chatIdsString
      .split(",")
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);

    if (chatIds.length === 0) {
      console.warn("⚠️ Telegram Error: No valid Chat IDs found");
      return false;
    }

    // Convert *bold* text per line to <b>bold</b> safely for Telegram HTML parse_mode
    const htmlLines = message.split("\n").map((line) => {
      return line.replace(/\*([^*]+)\*/g, "<b>$1</b>");
    });
    const htmlMessage = htmlLines.join("\n");

    // Clean plain text version without Markdown formatting
    const plainMessage = message.replace(/\*/g, "").replace(/`/g, "");

    const sendPromises = chatIds.map(async (chatId: string) => {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

      // 1. First Attempt: POST with HTML parse_mode
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: htmlMessage,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });

        if (response.ok) {
          console.log(`✅ Telegram notification sent (HTML) to ${chatId}`);
          return true;
        }

        const errorBody = await response.json().catch(() => ({}));
        console.warn(`⚠️ HTML parse failed for Chat ID ${chatId}:`, errorBody);
      } catch (postErr) {
        console.warn(`⚠️ POST HTML network error for Chat ID ${chatId}:`, postErr);
      }

      // 2. Second Attempt: POST Plain Text fallback
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainMessage,
            disable_web_page_preview: true,
          }),
        });

        if (response.ok) {
          console.log(`✅ Telegram notification sent (Plain Text) to ${chatId}`);
          return true;
        }
      } catch (postPlainErr) {
        console.warn(`⚠️ POST Plain network error for Chat ID ${chatId}:`, postPlainErr);
      }

      // 3. Third Attempt: GET query params fallback
      try {
        const getUrl = `${url}?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(plainMessage)}`;
        const response = await fetch(getUrl);
        if (response.ok) {
          console.log(`✅ Telegram notification sent (GET) to ${chatId}`);
          return true;
        }
      } catch (getErr) {
        console.warn(`⚠️ GET fallback network error for Chat ID ${chatId}:`, getErr);
      }

      return false;
    });

    const results = await Promise.all(sendPromises);
    const hasSuccess = results.some((res) => res === true);

    if (!hasSuccess) {
      console.error("❌ Telegram Notification Failed: All attempts failed.");
    }
    return hasSuccess;

  } catch (error) {
    console.error("❌ Unexpected error in sendTelegramNotification:", error);
    return false;
  }
};
