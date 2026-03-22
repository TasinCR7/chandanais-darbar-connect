import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Vote } from "lucide-react";

interface VoteTopic {
  id: string;
  title: string;
  description: string | null;
  type: string;
  options?: string[] | null;
  is_active: boolean;
  created_at: string;
}

const VoteTopicManager = () => {
  const [topics, setTopics] = useState<VoteTopic[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"monthly" | "yearly">("monthly");
  const [optionsStr, setOptionsStr] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTopics = async () => {
    const { data } = await supabase.from("vote_topics").select("*").order("created_at", { ascending: false });
    if (data) setTopics(data as VoteTopic[]);
  };

  useEffect(() => { fetchTopics(); }, []);

  const addTopic = async () => {
    if (!title.trim()) return;
    setLoading(true);
    
    // Fallback: Encode options into description if provided
    let finalDescription = description.trim() || null;
    if (optionsStr.trim()) {
      const sanitizedOptions = optionsStr.split(",").map(o => o.trim()).filter(o => o !== "").join(", ");
      if (sanitizedOptions) {
        finalDescription = `[POLL_OPTIONS: ${sanitizedOptions}] ${finalDescription || ""}`.trim();
      }
    }

    const { error } = await supabase.from("vote_topics").insert({
      title: title.trim(),
      description: finalDescription,
      type,
    });

    if (!error) {
      toast({ title: "সফল", description: "ভোটের বিষয় যোগ করা হয়েছে।" });
      setTitle("");
      setDescription("");
      setOptionsStr("");
      fetchTopics();
    } else {
      console.error(error);
      toast({ title: "ব্যর্থ", description: "ভোট যোগ করা সম্ভব হয়নি।", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("vote_topics").update({ is_active: !current }).eq("id", id);
    fetchTopics();
  };

  const deleteTopic = async (id: string) => {
    await supabase.from("vote_topics").delete().eq("id", id);
    fetchTopics();
    toast({ title: "মুছে ফেলা হয়েছে" });
  };

  const parseTopicData = (topic: VoteTopic) => {
    const desc = topic.description || "";
    const match = desc.match(/^\[POLL_OPTIONS: (.*?)\]\s*(.*)/s);
    if (match) {
      return {
        options: match[1].split(",").map(o => o.trim()),
        displayDescription: match[2] || null
      };
    }
    return {
      options: topic.options || null,
      displayDescription: topic.description
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-2xl p-6">
        <h3 className="text-lg font-heading font-bold text-gold mb-4 flex items-center gap-2">
          <Vote size={20} /> নতুন ভোটের বিষয় যোগ করুন
        </h3>
        <div className="space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="বিষয়ের শিরোনাম"
            className="bg-black/20 border-gold/20 h-11 rounded-xl text-cream" />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="বিবরণ (ঐচ্ছিক)"
            className="bg-black/20 border-gold/20 rounded-xl text-cream min-h-[60px]" />
          
          <div className="space-y-1">
            <label className="text-xs text-gold/60 ml-2">পোল অপশন (কমা দিয়ে আলাদা করুন)</label>
            <Input 
              value={optionsStr} 
              onChange={e => setOptionsStr(e.target.value)} 
              placeholder="যেমন: অপশন ১, অপশন ২, অপশন ৩ (ফাঁকা রাখলে ডিফল্ট অপশন থাকবে)"
              className="bg-black/20 border-gold/20 h-11 rounded-xl text-cream" 
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setType("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === "monthly" ? "bg-gold-gradient text-primary-foreground" : "bg-black/20 text-gold/60 border border-gold/20"}`}>
              মাসিক
            </button>
            <button onClick={() => setType("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === "yearly" ? "bg-gold-gradient text-primary-foreground" : "bg-black/20 text-gold/60 border border-gold/20"}`}>
              বার্ষিক
            </button>
          </div>
          <Button onClick={addTopic} disabled={loading || !title.trim()} className="bg-gold-gradient text-primary-foreground font-bold rounded-xl">
            <Plus size={16} className="mr-2" /> যোগ করুন
          </Button>
        </div>
      </div>

      {/* Topics list */}
      <div className="space-y-3">
        {topics.map(topic => {
          const { options, displayDescription } = parseTopicData(topic);
          return (
            <div key={topic.id} className="bg-card/30 border border-gold/10 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-cream truncate">{topic.title}</h4>
                {displayDescription && <p className="text-xs text-muted-foreground truncate">{displayDescription}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] uppercase font-bold text-gold/50 bg-gold/10 px-2 py-0.5 rounded">
                    {topic.type === "monthly" ? "মাসিক" : "বার্ষিক"}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${topic.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {topic.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </span>
                  {options && options.length > 0 && (
                    <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      পোল: {options.length} টি অপশন
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => toggleActive(topic.id, topic.is_active)}
                  className="border-gold/20 text-gold text-xs rounded-lg">
                  {topic.is_active ? "বন্ধ" : "চালু"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteTopic(topic.id)}
                  className="border-destructive/20 text-destructive text-xs rounded-lg hover:bg-destructive/10">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VoteTopicManager;
