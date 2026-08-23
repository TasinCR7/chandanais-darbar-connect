import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { getGeminiResponse } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

const MAX_DISPLAY_MESSAGES = 50;
const MAX_API_CONTEXT = 20;

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "msg-0", role: "ai", content: "আসসালামু আলাইকুম! আমি চন্দনাইশ দরবার শরীফের এআই এসিস্ট্যান্ট। আমি আপনাকে কীভাবে সাহায্য করতে পারি?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const msgIdRef = useRef(0);
  const nextMsgId = () => `msg-${++msgIdRef.current}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => {
      const updated = [...prev, { id: nextMsgId(), role: "user" as const, content: userMsg }];
      return updated.length > MAX_DISPLAY_MESSAGES ? updated.slice(-MAX_DISPLAY_MESSAGES) : updated;
    });
    setIsLoading(true);

    try {
      // Build history including the new user message for context
      const history = [...messages.slice(-MAX_API_CONTEXT), { role: "user" as const, content: userMsg }].map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await getGeminiResponse(userMsg, history);
      setMessages(prev => {
        const updated = [...prev, { id: nextMsgId(), role: "ai" as const, content: aiResponse }];
        return updated.length > MAX_DISPLAY_MESSAGES ? updated.slice(-MAX_DISPLAY_MESSAGES) : updated;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: nextMsgId(), role: "ai", content: "দুঃখিত, সংযোগ বিচ্ছিন্ন হয়েছে। আবার চেষ্টা করুন।" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-2 left-2 md:left-auto md:right-6 z-[100] flex flex-col items-end md:w-[350px] pointer-events-none">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="এআই সাহায্যকারী"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? "60px" : "min(500px, 65dvh)",
              width: "100%"
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`bg-background/80 backdrop-blur-xl border border-gold/30 rounded-2xl shadow-2xl overflow-hidden mb-4 flex flex-col w-full pointer-events-auto`}
          >
            {/* Header */}
            <div className="bg-gold-gradient p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg ring-1 ring-white/30">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-heading font-bold text-sm leading-none">দরবার শরীফ এআই</h3>
                  <span className="text-white/70 text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> অনলাইনে আছে
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? "উইন্ডো বড় করুন" : "উইন্ডো ছোট করুন"}
                  aria-label={isMinimized ? "উইন্ডো বড় করুন" : "উইন্ডো ছোট করুন"}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  title="বন্ধ করুন"
                  aria-label="বন্ধ করুন"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gold/20"
                >
                  {messages.map((msg) => (
                    <motion.div
                      initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border border-gold/20 ${msg.role === "user" ? "bg-gold/10" : "bg-primary/10"}`}>
                          {msg.role === "user" ? <User size={14} className="text-gold" /> : <Bot size={14} className="text-primary" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user" 
                          ? "bg-gold text-white rounded-tr-none shadow-lg shadow-gold/10" 
                          : "bg-card border border-gold/10 rounded-tl-none text-foreground shadow-sm"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[85%]">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 border border-gold/20">
                          <Bot size={14} className="text-primary" />
                        </div>
                        <div className="bg-card border border-gold/10 p-3 rounded-2xl rounded-tl-none">
                          <Loader2 size={16} className="animate-spin text-gold" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background/50 border-t border-gold/10 backdrop-blur-md">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="আপনার প্রশ্ন লিখুন..."
                      className="border-gold/20 focus-visible:ring-gold bg-background/30 backdrop-blur-sm rounded-xl py-5"
                      style={{ fontSize: 16 }}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !input.trim()}
                      className="bg-gold-gradient hover:opacity-90 rounded-xl w-12 h-[42px] p-0 shrink-0 gold-glow-hover transition-all"
                    >
                      <Send size={18} />
                    </Button>
                  </form>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    AI ভুল করতে পারে। সঠিক তথ্যের জন্য দরবারের ওয়েবসাইটে খোঁজ করুন।
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        title="এআই চ্যাট ওপেন করুন"
        aria-label="এআই চ্যাট ওপেন করুন"
        className={`bg-gold-gradient p-3.5 rounded-full shadow-2xl gold-glow-hover transition-all duration-300 ring-2 ring-gold/20 pointer-events-auto min-w-[50px] min-h-[50px] flex items-center justify-center touch-manipulation select-none cursor-pointer ${isOpen ? 'rotate-90 hidden' : ''}`}
      >
        <MessageSquare className="text-white w-6 h-6 sm:w-7 sm:h-7" />
      </motion.button>
    </div>
  );
};

export default Chatbot;
