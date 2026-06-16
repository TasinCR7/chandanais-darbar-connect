const PremiumLoader = () => {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-14 h-14 rounded-full border-[3px] border-gold/20 border-t-gold animate-spin" />
      <p className="text-gold font-heading animate-pulse tracking-widest text-sm uppercase">লোড হচ্ছে...</p>
    </div>
  );
};

export default PremiumLoader;
