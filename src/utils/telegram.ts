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

const DEFAULT_BOT_TOKEN = "8577916741:AAHku7Xh3YpFn3Y2aF4L7swaJcOjKsoZwyg";
const DEFAULT_CHAT_IDS = "7484314831,-1003880816949";

export const sendTelegramNotification = async (message: string) => {
  try {
    const envToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
    const envChatIds = import.meta.env.VITE_TELEGRAM_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_IDS || "";

    const botToken = envToken.trim() !== "" ? envToken.trim() : DEFAULT_BOT_TOKEN;
    const chatIdsString = envChatIds.trim() !== "" ? envChatIds.trim() : DEFAULT_CHAT_IDS;

    if (!botToken || botToken.trim() === "") {
      console.error("❌ Telegram Error: VITE_TELEGRAM_BOT_TOKEN is missing or empty");
      return false;
    }

    if (!chatIdsString || chatIdsString.trim() === "") {
      console.error("❌ Telegram Error: VITE_TELEGRAM_CHAT_ID is missing or empty");
      return false;
    }

    const chatIds = chatIdsString
      .split(",")
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);
    
    if (chatIds.length === 0) {
      console.error("❌ Telegram Error: No valid Chat IDs found after parsing.");
      return false;
    }

    // Convert Markdown *bold* tags into HTML <b>bold</b> tags safely
    const htmlMessage = message
      .replace(/\*(.*?)\*/g, "<b>$1</b>")
      .replace(/`/g, "'");

    // Create a plain text fallback version without any formatting tags
    const plainMessage = message.replace(/[*`_]/g, "");

    const sendPromises = chatIds.map(async (chatId: string) => {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        // Attempt 1: Send with HTML parse_mode
        let response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: htmlMessage,
            parse_mode: "HTML",
          }),
        });

        // Attempt 2: If HTML mode fails, retry with Plain Text POST
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`⚠️ HTML parse failed for Chat ID ${chatId}. Retrying plain text. Error:`, errorData);
          
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainMessage,
            }),
          });
        }

        // Attempt 3: If POST fails, attempt GET fallback query params
        if (!response.ok) {
          console.warn(`⚠️ POST failed for ${chatId}. Trying GET fallback...`);
          const getUrl = `${url}?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(plainMessage)}`;
          response = await fetch(getUrl);
        }

        if (response.ok) {
          console.log(`✅ Telegram notification sent successfully to ${chatId}`);
          return true;
        } else {
          const finalError = await response.json().catch(() => ({}));
          console.error(`❌ Telegram send failed for Chat ID ${chatId}:`, finalError);
          return false;
        }
      } catch (err) {
        console.error(`❌ Fetch/Network error sending Telegram notification to ${chatId}:`, err);
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const success = results.some((res) => res === true);
    if (!success) {
      console.error("❌ All Telegram notifications failed. Please check network/AdBlocker settings.");
    }
    return success;

  } catch (error) {
    console.error("❌ Unexpected error in sendTelegramNotification:", error);
    return false;
  }
};

