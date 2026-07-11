import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";

const SplashScreen = ({ onFinish }) => {
  const [phase, setPhase] = useState("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("title"), 500);
    const t2 = setTimeout(() => setPhase("dots"), 900);
    const t3 = setTimeout(() => setPhase("fadeout"), 2200);
    const t4 = setTimeout(() => onFinish(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        phase === "fadeout" ? "opacity-0 scale-105" : "opacity-100"
      }`}
      style={{ background: "linear-gradient(135deg, #6C3DE8 0%, #8B5CF6 50%, #C026D3 100%)" }}
    >
      <div
        className={`transition-all duration-500 ease-out ${
          phase === "logo" ? "scale-50 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="h-20 w-20 rounded-[20px] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
      </div>

      <div
        className={`mt-6 transition-all duration-500 ease-out ${
          phase === "logo" || phase === "title" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">WorkHub</h1>
        <p className="text-white/70 text-sm text-center mt-1 font-medium">Your workspace, unified.</p>
      </div>

      <div
        className={`flex gap-2 mt-10 transition-all duration-500 ${
          phase === "dots" || phase === "fadeout" ? "opacity-100" : "opacity-0"
        }`}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
          />
        ))}
      </div>

      <div className="absolute bottom-10">
        <p className="text-white/30 text-xs tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
};

export default SplashScreen;
