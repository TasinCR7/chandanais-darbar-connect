/**
 * Telegram Notification Utility
 * Supports sending messages to multiple chat IDs simultaneously.
 */

export const sendTelegramNotification = async (message: string) => {
  try {
    // Get credentials from Vite environment (hardcoded fallbacks are set in vite.config.ts)
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
    const chatIdsString = import.meta.env.VITE_TELEGRAM_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_IDS || "";

    if (!botToken || botToken.trim() === "") {
      console.error("❌ Telegram Error: VITE_TELEGRAM_BOT_TOKEN is missing or empty");
      return false;
    }

    if (!chatIdsString || chatIdsString.trim() === "") {
      console.error("❌ Telegram Error: VITE_TELEGRAM_CHAT_ID is missing or empty");
      return false;
    }

    const chatIds = chatIdsString.split(",").map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    
    if (chatIds.length === 0) {
      console.error("❌ Telegram Error: No valid Chat IDs found after parsing.");
      return false;
    }

    // Clean the message: remove problematic Markdown characters that cause Telegram parse errors
    const cleanMessage = message
      .replace(/`/g, "'")   // Replace backticks with single quotes (backticks break Markdown)
      .replace(/\\/g, "");   // Remove backslashes

    // Send to all chats concurrently
    const sendPromises = chatIds.map(async (chatId: string) => {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        // Attempt 1: Try with Markdown parse_mode
        let response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: cleanMessage,
            parse_mode: "Markdown",
          }),
        });

        // Attempt 2: If Markdown fails, fallback to plain text immediately
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`⚠️ Markdown parsing failed for ${chatId}. Retrying with plain text. Error:`, errorData);
          
          // Remove all Markdown formatting for plain text fallback
          const plainMessage = cleanMessage.replace(/\*/g, "");
          
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainMessage,
            }),
          });
          
          if (!response.ok) {
            const fallbackError = await response.json().catch(() => ({}));
            console.error(`❌ Plain text fallback also failed for ${chatId}:`, fallbackError);
            return false;
          }
        }

        console.log(`✅ Telegram notification sent to ${chatId}`);
        return true;
      } catch (err) {
        console.error(`❌ Network or fetch error for Telegram Chat ID ${chatId}:`, err);
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const success = results.some(res => res === true);
    if (!success) {
      console.error("❌ All Telegram notifications failed. This may be due to adblocker or network issues.");
    }
    return success;

  } catch (error) {
    console.error("❌ Unexpected error in sendTelegramNotification:", error);
    return false;
  }
};

