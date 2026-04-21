import { Globe, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative z-10 flex flex-col md:flex-row items-end justify-between px-6 md:px-10 py-12 w-full max-w-7xl mx-auto">
      <div className="hidden md:flex flex-col items-start gap-1">
        <span className="text-white/40 text-[10px] tracking-widest uppercase">About Us</span>
        <p className="font-serif italic text-white/60 text-xl leading-tight">
          Expert courses in one subject<br/>for practical, real results.
        </p>
      </div>
      <div className="flex gap-4 w-full md:w-auto justify-center md:justify-end">
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white transition-all">
          <Instagram className="w-5 h-5 flex-shrink-0" />
        </button>
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white transition-all">
          <Twitter className="w-5 h-5 flex-shrink-0" />
        </button>
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white transition-all">
          <Globe className="w-5 h-5 flex-shrink-0" />
        </button>
      </div>
    </footer>
  );
}
