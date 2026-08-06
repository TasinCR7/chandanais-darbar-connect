import { Moon } from "lucide-react";

const PremiumLoader = () => {
  return (
    <div className="min-h-[60dvh] flex flex-col items-center justify-center space-y-6">
      {/* Loader rings container */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Pulsing glow backdrop */}
        <div
          className="absolute inset-0 rounded-full animate-loader-glow"
          style={{
            background: "radial-gradient(circle, hsl(40 45% 56% / 0.12) 0%, transparent 70%)",
          }}
        />

        {/* Outer ring — slow rotation, dashed */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: "2px dashed hsl(40 45% 56% / 0.2)",
            animationDuration: "6s",
          }}
        />

        {/* Middle ring — medium speed, dotted */}
        <div
          className="absolute inset-2 rounded-full animate-spin"
          style={{
            border: "1.5px dotted hsl(40 45% 56% / 0.15)",
            animationDuration: "4s",
            animationDirection: "reverse",
          }}
        />

        {/* Inner ring — faster counter-rotation, solid */}
        <div
          className="absolute inset-4 rounded-full animate-spin"
          style={{
            border: "2px solid hsl(40 45% 56% / 0.5)",
            borderTopColor: "hsl(40 45% 56%)",
            borderRightColor: "transparent",
            animationDuration: "1.5s",
          }}
        />

        {/* Center Moon icon with scale pulse */}
        <div
          className="relative z-10 text-gold animate-loader-pulse"
        >
          <Moon size={22} strokeWidth={1.5} />
        </div>
      </div>

      {/* Text with letter-spacing animation */}
      <p
        className="text-gold font-heading text-sm uppercase animate-loader-letter"
      >
        লোড হচ্ছে...
      </p>
    </div>
  );
};

export default PremiumLoader;

