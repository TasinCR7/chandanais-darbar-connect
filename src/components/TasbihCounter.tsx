import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Sparkles, RotateCcw, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

let sharedAudioCtx: AudioContext | null = null;

const unlockAudioContext = (ctx: AudioContext) => {
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

const getAudioCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedAudioCtx = new AudioContextClass();
      } catch (e) {
        console.error("Failed to create AudioContext", e);
        return null;
      }
    }
  }
  if (sharedAudioCtx) {
    unlockAudioContext(sharedAudioCtx);
  }
  return sharedAudioCtx;
};

const playClickSound = () => {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    unlockAudioContext(audioCtx);

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.06);
  } catch (e) {
    console.error("Audio error", e);
  }
};

const playChimeSound = () => {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      try {
        audioCtx.resume();
      } catch (e) {
        console.error("Failed to resume AudioContext", e);
      }
    }

    const playNote = (freq: number, delay: number, duration: number) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
      
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    playNote(523.25, 0, 0.4); // C5
    playNote(659.25, 0.1, 0.5); // E5
  } catch (e) {
    console.error("Audio error", e);
  }
};

const zikrOptions = [
  { bn: "সুবহানাল্লাহ", ar: "سُبْحَانَ ٱللَّٰهِ", trans: "আল্লাহ পবিত্র" },
  { bn: "আলহামদুলিল্লাহ", ar: "ٱلْحَمْدُ لِلَّٰهِ", trans: "সমস্ত প্রশংসা আল্লাহর" },
  { bn: "আল্লাহু আকবার", ar: "ٱللَّٰهُ أَكْبَرُ", trans: "আল্লাহ সবচেয়ে মহান" },
  { bn: "লা ইলাহা ইল্লাল্লাহ", ar: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", trans: "আল্লাহ ছাড়া কোনো উপাস্য নেই" },
  { bn: "আস্তাগফিরুল্লাহ", ar: "أَسْتَغْفِرُ ٱللَّٰهَ", trans: "আমি আল্লাহর কাছে ক্ষমা চাইছি" },
  { bn: "সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম", ar: "صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ", trans: "আল্লাহর শান্তি ও রহমত বর্ষিত হোক তাঁর ওপর" }
];

const TasbihCounter = () => {
  const [count, setCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tasbih_count");
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [zikrIndex, setZikrIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tasbih_zikr_index");
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [target, setTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tasbih_target");
      return saved ? parseInt(saved, 10) || 33 : 33;
    } catch {
      return 33;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tasbih_sound");
      return saved !== "false";
    } catch {
      return true;
    }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("tasbih_count", count.toString());
    } catch (e) { console.warn("localStorage error", e); }
  }, [count]);

  useEffect(() => {
    try {
      localStorage.setItem("tasbih_zikr_index", zikrIndex.toString());
    } catch (e) { console.warn("localStorage error", e); }
  }, [zikrIndex]);

  useEffect(() => {
    try {
      localStorage.setItem("tasbih_target", target.toString());
    } catch (e) { console.warn("localStorage error", e); }
  }, [target]);

  useEffect(() => {
    try {
      localStorage.setItem("tasbih_sound", soundEnabled.toString());
    } catch (e) { console.warn("localStorage error", e); }
  }, [soundEnabled]);

  const currentZikr = zikrOptions[zikrIndex];

  const handleIncrement = () => {
    const newCount = count + 1;
    
    if (soundEnabled) {
      if (target > 0 && newCount % target === 0) {
        playChimeSound();
      } else {
        playClickSound();
      }
    }

    setCount(newCount);
  };

  const handleReset = () => {
    if (soundEnabled) playClickSound();
    setCount(0);
  };

  const cycleTarget = () => {
    if (soundEnabled) playClickSound();
    if (target === 33) setTarget(100);
    else if (target === 100) setTarget(0);
    else setTarget(33);
  };

  const progress = target > 0 ? (count % target) / target : 0;

  return (
    <div className="bg-white/5 border border-gold/20 backdrop-blur-md rounded-3xl p-6 relative overflow-visible shadow-[0_8px_32px_rgba(212,175,55,0.05)] w-full max-w-sm mx-auto my-4 text-center">
      {/* Decorative patterns */}
      <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-gold/10 rounded-tr-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-gold/10 rounded-bl-3xl pointer-events-none" />

      {/* Header controls */}
      <div className="flex items-center justify-between mb-4 border-b border-gold/10 pb-3">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-muted-foreground hover:text-gold transition-colors p-2.5 min-w-[44px] min-h-[44px]"
          title={soundEnabled ? "শব্দ বন্ধ করুন" : "শব্দ চালু করুন"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <span className="text-[10px] text-gold font-heading tracking-widest uppercase flex items-center gap-1 font-semibold">
          <Sparkles className="h-3 w-3 animate-pulse" /> তাসবীহ কাউন্টার
        </span>

        <button
          onClick={handleReset}
          className="text-muted-foreground hover:text-rose-400 transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 text-[11px]"
          title="রিসেট করুন"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Zikr Selector */}
      <div ref={menuRef} className="relative mb-4">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full bg-black/40 border border-gold/10 hover:border-gold/30 rounded-xl px-4 py-2 flex items-center justify-between transition-all"
        >
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground font-bangla">বর্তমান যিকির</p>
            <p className="text-sm font-bold text-gold font-bangla">{currentZikr.bn}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gold transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMenuOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-[#121212] border border-gold/20 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto no-scrollbar py-1">
            {zikrOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  setZikrIndex(index);
                  setIsMenuOpen(false);
                  if (soundEnabled) playClickSound();
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gold/10 transition-colors ${
                  zikrIndex === index ? 'bg-gold/5 text-gold' : 'text-muted-foreground'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-bangla">{option.bn}</span>
                  <span className="text-[10px] opacity-60 font-serif" dir="rtl">{option.ar}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Arabic and translation display */}
      <div className="text-center min-h-[70px] flex flex-col justify-center mb-4">
        <p className="text-2xl font-serif text-white tracking-wide leading-relaxed" dir="rtl">
          {currentZikr.ar}
        </p>
        <p className="text-[11px] text-muted-foreground/80 mt-1 italic font-bangla">
          ({currentZikr.trans})
        </p>
      </div>

      {/* Target and counter circle button */}
      <div className="flex flex-col items-center justify-center my-4">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Progress ring background */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="64"
              className="stroke-white/5 fill-none"
              strokeWidth="6"
            />
            {target > 0 && (
              <motion.circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-gold fill-none"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ strokeDasharray: "402", strokeDashoffset: "402" }}
                animate={{ strokeDashoffset: 402 - 402 * progress }}
                transition={{ type: "spring", stiffness: 60, damping: 15 }}
              />
            )}
          </svg>

          {/* Touch button */}
          <button
            onClick={handleIncrement}
            className="w-[110px] h-[110px] rounded-full bg-gold-gradient hover:scale-[1.03] active:scale-[0.96] transition-transform duration-100 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.15)] focus:outline-none border border-white/10 z-10"
          >
            <span className="text-xs text-primary-foreground/75 font-bangla uppercase tracking-wider">জপুন</span>
            <span className="text-3xl font-heading font-black text-primary-foreground leading-none mt-1">
              {count}
            </span>
            {target > 0 && (
              <span className="text-[10px] text-primary-foreground/60 mt-1 font-heading font-medium">
                /{target}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex justify-center mt-2">
        <button
          onClick={cycleTarget}
          className="text-[11px] text-muted-foreground hover:text-gold transition-colors font-bangla bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-gold/10"
        >
          টার্গেট: {target === 0 ? "সীমাহীন" : `${target} বার`}
        </button>
      </div>
    </div>
  );
};

export default TasbihCounter;
