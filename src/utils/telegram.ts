/**
 * Telegram Notification Utility
 * Supports sending messages to multiple chat IDs simultaneously.
 */

export const sendTelegramNotification = async (message: string) => {
  try {
    console.log("Initiating Telegram notification...");
    
    // Get credentials from Vite environment or use hardcoded fallbacks
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatIdsString = import.meta.env.VITE_TELEGRAM_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_IDS;

    if (!botToken || botToken === "undefined" || botToken.trim() === "") {
      console.error("❌ Telegram Error: VITE_TELEGRAM_BOT_TOKEN is missing or empty in .env file");
      return false;
    }

    if (!chatIdsString || chatIdsString === "undefined" || chatIdsString.trim() === "") {
      console.error("❌ Telegram Error: VITE_TELEGRAM_CHAT_ID is missing or empty in .env file");
      return false;
    }

    const chatIds = chatIdsString.split(",").map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    
    if (chatIds.length === 0) {
      console.error("❌ Telegram Error: No valid Chat IDs found after parsing.");
      return false;
    }

    console.log(`Sending message to ${chatIds.length} Telegram chats:`, chatIds);

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
            text: message,
            parse_mode: "Markdown",
          }),
        });

        // Attempt 2: If Markdown fails (HTTP 400 Bad Request due to parsing), fallback to plain text immediately
        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`⚠️ Markdown parsing failed for ${chatId}. Retrying with plain text. Error:`, errorData);
          
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: message, // No parse_mode sent
            }),
          });
          
          if (!response.ok) {
            const fallbackError = await response.json();
            console.error(`❌ Plain text fallback also failed for ${chatId}:`, fallbackError);
            return false;
          }
        }

        console.log(`✅ Successfully sent to Telegram Chat ID: ${chatId}`);
        return true;
      } catch (err) {
        console.error(`❌ Network or fetch error for Telegram Chat ID ${chatId}:`, err);
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    return results.some(res => res === true); // Return true if at least one succeeded

  } catch (error) {
    console.error("❌ Unexpected error in sendTelegramNotification:", error);
    return false;
  }
};
