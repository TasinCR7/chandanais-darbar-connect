const botToken = "8577916741:AAHku7Xh3YpFn3Y2aF4L7swaJcOjKsoZwyg";
const chatIds = ["7484314831", "-1003880816949"];
const message = "Test message from API";

async function test() {
  for (const chatId of chatIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });
      const data = await res.json();
      console.log(`Response for ${chatId}:`, data);
    } catch (e) {
      console.error(e);
    }
  }
}
test();
