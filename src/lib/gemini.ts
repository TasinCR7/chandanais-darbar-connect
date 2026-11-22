import { getApiBase } from "@/lib/apiBase";

// Keeping the function name as getGeminiResponse to maintain compatibility with Chatbot.tsx imports
export async function getGeminiResponse(
  userMessage: string,
  chatHistory: { role: string; content: string }[]
) {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return "অনুগ্রহ করে আপনার প্রশ্নটি লিখুন।";
  }

  const sanitizedHistory = chatHistory.slice(-10).map((item) => ({
    role: item.role === "user" ? "user" : "assistant",
    content: String(item.content || "").slice(0, 1500),
  }));

  try {
    const response = await fetch(`${getApiBase()}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed.slice(0, 1500),
        history: sanitizedHistory,
      }),
    });

    const data = (await response.json().catch(() => null)) as { reply?: string } | null;
    if (data?.reply) {
      return data.reply;
    }

    if (!response.ok) {
      return "দুঃখিত, আমি আপনার প্রশ্নের উত্তর দিতে পারছি না।";
    }

    return "দুঃখিত, আমি আপনার প্রশ্নের উত্তর দিতে পারছি না।";
  } catch (error) {
    console.error("Chat API fetch error:", error);
    return "নেটওয়ার্ক সমস্যার কারণে আমি উত্তর দিতে পারছি না।";
  }
}
