/**
 * Telegram Notification Utility
 * Supports sending messages to multiple chat IDs simultaneously.
 * Uses environment variables VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID (or VITE_TELEGRAM_CHAT_IDS).
 */

export const sendTelegramNotification = async (message: string) => {
  // Hardcoded Fallbacks (for when .env fails to load in Vite)
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "8577916741:AAHku7Xh3YpFn3Y2aF4L7swaJcOjKsoZwyg";
  const chatIdsString = import.meta.env.VITE_TELEGRAM_CHAT_ID || "7484314831,-1003880816949";

  if (!botToken) {
    console.error("Telegram Bot Token is missing.");
    return;
  }
  
  if (!chatIdsString) {
    console.error("Telegram Chat ID is missing.");
    return;
  }

  const chatIds = chatIdsString.split(",").map(id => id.trim()).filter(id => id.length > 0);
  console.log("Broadcasting to Telegram Chat IDs:", chatIds);

  const sendPromises = chatIds.map(chatId => 
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown", // Changed from HTML to Markdown to match message formatting
      }),
    })
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json();
        console.error(`Telegram API Error for ${chatId}:`, errorData);
        // Fallback: Try sending without Markdown if it fails
        if (errorData.description?.includes("can't parse entities")) {
           console.log("Retrying without Markdown parsing...");
           return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               chat_id: chatId,
               text: message,
             }),
           });
        }
      } else {
        console.log(`Telegram message sent successfully to ${chatId}`);
      }
      return res;
    })
    .catch(err => {
      console.error(`Telegram fetch error to ${chatId}:`, err);
      return null;
    })
  );

  return Promise.all(sendPromises);
};
