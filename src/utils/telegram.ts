/**
 * Telegram Notification Utility
 * Supports sending messages to multiple chat IDs simultaneously.
 * Uses environment variables VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID (or VITE_TELEGRAM_CHAT_IDS).
 */

export const sendTelegramNotification = async (message: string) => {
  // Load from environment variables (Secrets are managed in Supabase/Vite .env)
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatIdsString = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  // Diagnostic Log for User (Safe for production)
  console.log("Telegram Service Diagnostic:", {
    hasToken: !!botToken,
    hasChatIds: !!chatIdsString,
    chatIdCount: chatIdsString ? chatIdsString.split(",").length : 0,
    vitePrefixOk: true 
  });


  if (!botToken) {
    console.error("Telegram Bot Token is missing. Ensure VITE_TELEGRAM_BOT_TOKEN is defined in .env and vite.config.ts.");
    return;
  }
  
  if (!chatIdsString) {
    console.error("Telegram Chat ID is missing. Ensure VITE_TELEGRAM_CHAT_ID is defined in .env and vite.config.ts.");
    return;
  }

  const chatIds = chatIdsString.split(",").map(id => id.trim()).filter(id => id.length > 0);
  if (chatIds.length === 0) {
    console.error("No valid Telegram Chat IDs found in VITE_TELEGRAM_CHAT_ID.");
    return;
  }
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
