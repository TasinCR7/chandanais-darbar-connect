/**
 * Telegram Notification Utility
 * Supports sending messages to multiple chat IDs simultaneously.
 * Uses environment variables VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID (or VITE_TELEGRAM_CHAT_IDS).
 */

export const sendTelegramNotification = async (message: string) => {
  // Load from environment variables (Secrets are managed in Supabase/Vite .env)
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatIdsString = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  // Detailed Diagnostic Log for User
  console.log("DEBUG: Telegram Integration Check", {
    tokenStatus: botToken ? `Present (ends in ...${botToken.slice(-4)})` : "MISSING",
    chatIdsStatus: chatIdsString ? `Present (length ${chatIdsString.length})` : "MISSING",
    environment: import.meta.env.MODE,
    hasGlobalVite: !!import.meta.env.VITE_TELEGRAM_BOT_TOKEN
  });

  if (!botToken || botToken === "undefined") {
    console.error("Telegram API Error: VITE_TELEGRAM_BOT_TOKEN is missing or invalid in environment.");
    return;
  }
  
  if (!chatIdsString || chatIdsString === "undefined") {
    console.error("Telegram API Error: VITE_TELEGRAM_CHAT_ID is missing or invalid in environment.");
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
