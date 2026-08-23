const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const SYSTEM_PROMPT = `
You are an AI assistant for the "Chandanaish Darbar Sharif" website. 
Answer about history, Pir, events (Urs) politely in Bengali.
Founder: Hazrat Syed Maulana Abdul Latif Shah Chandanaishi Maizbhandari (R:).
Current Head: Shahjada Syed Mohammad Makshudul Alam Shah (Madda:).
Important Dates: 16th Falgun (Annual Urs), 22nd Magh, 30th Poush, 1st Chaitra, 11th Jaistha, 14th Srabon, 22nd Ashwin.
Silsila: Maizbhandaria.
`;

// Keeping the function name as getGeminiResponse to maintain compatibility with Chatbot.tsx imports
export async function getGeminiResponse(userMessage: string, chatHistory: { role: string; content: string }[]) {
  if (!API_KEY) {
    return "দুঃখিত, বর্তমানে এআই চ্যাটবটটি সচল নেই। অনুগ্রহ করে পরে আবার চেষ্টা করুন।";
  }

  // Map existing chat history to OpenAI/Groq format (user / assistant)
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory.map(item => ({
      role: item.role === "user" ? "user" : "assistant",
      content: item.content
    })),
    { role: "user", content: userMessage }
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error("Groq API Error:", response.status, response.statusText);
      return "দুঃখিত, আমি আপনার প্রশ্নের উত্তর দিতে পারছি না।";
    }

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    console.error("Groq Error:", data);
    return "দুঃখিত, আমি আপনার প্রশ্নের উত্তর দিতে পারছি না।";
  } catch (error) {
    console.error("Fetch Error:", error);
    return "নেটওয়ার্ক সমস্যার কারণে আমি উত্তর দিতে পারছি না।";
  }
}
