import { Bell } from 'lucide-react';

export const NoticeBar = () => (
  <div className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border-b border-primary/30">
    <div className="container flex items-center gap-3 py-2 text-sm text-foreground/90">
      <Bell className="h-4 w-4 text-primary shrink-0 animate-pulse" />
      <p className="font-bangla">
        ওয়েবসাইট প্রকাশ করা হয়েছে — সবাই এটি প্রচার করবেন, কোনো ভুল থাকলে Admin কে বলুন
      </p>
    </div>
  </div>
);
