import { Moon } from "lucide-react";

const PremiumLoader = () => {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-6">
      {/* Loader rings container */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Pulsing glow backdrop */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(40 45% 56% / 0.12) 0%, transparent 70%)",
            animation: "loaderGlow 2.5s ease-in-out infinite",
          }}
        />

        {/* Outer ring — slow rotation, dashed */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px dashed hsl(40 45% 56% / 0.2)",
            animation: "spin 6s linear infinite",
          }}
        />

        {/* Middle ring — medium speed, dotted */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            border: "1.5px dotted hsl(40 45% 56% / 0.15)",
            animation: "spin 4s linear infinite reverse",
          }}
        />

        {/* Inner ring — faster counter-rotation, solid */}
        <div
          className="absolute inset-4 rounded-full"
          style={{
            border: "2px solid hsl(40 45% 56% / 0.5)",
            borderTopColor: "hsl(40 45% 56%)",
            borderRightColor: "transparent",
            animation: "spin 1.5s linear infinite",
          }}
        />

        {/* Center Moon icon with scale pulse */}
        <div
          className="relative z-10 text-gold"
          style={{ animation: "loaderPulse 2s ease-in-out infinite" }}
        >
          <Moon size={22} strokeWidth={1.5} />
        </div>
      </div>

      {/* Text with letter-spacing animation */}
      <p
        className="text-gold font-heading text-sm uppercase"
        style={{ animation: "loaderLetterSpace 2s ease-in-out infinite" }}
      >
        লোড হচ্ছে...
      </p>

      {/* Inline keyframes — lightweight CSS-only */}
      <style>{`
        @keyframes loaderGlow {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes loaderPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes loaderLetterSpace {
          0%, 100% { letter-spacing: 0.15em; opacity: 0.6; }
          50% { letter-spacing: 0.35em; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PremiumLoader;
