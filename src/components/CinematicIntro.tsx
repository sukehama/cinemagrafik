import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Sparkles, Volume2 } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
  show?: boolean;
  forceShow?: boolean;
}

export default function CinematicIntro({ onComplete, show = true, forceShow = false }: CinematicIntroProps) {
  const [stage, setStage] = useState<'initial' | 'sliding' | 'revealed' | 'fading'>('initial');

  useEffect(() => {
    if (!show && !forceShow) return;
    setStage('initial');

    // Web Audio Synthesizer for 2 futuristic cinematic blip sounds
    const playTwoBlips = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        // Helper function to play a single blip tone
        const playBlip = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gain.gain.setValueAtTime(0.15, ctx.currentTime + startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        // First blip (lower tone)
        playBlip(440, 0.1, 0.12);
        // Second blip (higher harmonic tone)
        playBlip(880, 0.35, 0.18);
      } catch (err) {
        console.warn('Web Audio Playback disabled by browser policy or unsupported:', err);
      }
    };

    // Sequence timer triggers
    playTwoBlips();

    const timer1 = setTimeout(() => {
      setStage('sliding');
    }, 350);

    const timer2 = setTimeout(() => {
      setStage('revealed');
    }, 900);

    const timer3 = setTimeout(() => {
      setStage('fading');
    }, 2200);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete, show, forceShow]);

  if (!show && !forceShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-intro-overlay"
        initial={{ opacity: 1 }}
        animate={{ opacity: stage === 'fading' ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        onClick={() => onComplete()}
        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
      >
        {/* Subtle background dark grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Skip button top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="absolute top-6 right-6 z-30 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-mono font-bold text-zinc-400 hover:text-yellow-400 hover:border-yellow-400/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
        >
          <span>Preskoči</span>
          <span className="text-[10px] text-zinc-500 font-sans">✕</span>
        </button>

        {/* Center Intro Block & Title reveal Container */}
        <div className="relative flex items-center justify-center gap-4 sm:gap-6 px-6 py-12">
          
          {/* Moving Yellow Block */}
          <motion.div
            layout
            initial={{ scale: 0.8, x: 0, width: 72, height: 72 }}
            animate={{
              scale: 1,
              x: stage === 'initial' ? 0 : stage === 'sliding' || stage === 'revealed' ? -20 : 0,
              width: stage === 'initial' ? 72 : 64,
              height: stage === 'initial' ? 72 : 64,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="shrink-0 bg-yellow-400 text-zinc-950 rounded-2xl flex items-center justify-center shadow-[0_0_35px_rgba(250,204,21,0.45)] relative z-20"
          >
            <Film className="w-8 h-8 sm:w-9 sm:h-9 text-zinc-950 stroke-[2.5]" />
          </motion.div>

          {/* Text Title Revealed as Block Moves to the side */}
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
            animate={{
              opacity: stage === 'sliding' || stage === 'revealed' || stage === 'fading' ? 1 : 0,
              x: stage === 'sliding' || stage === 'revealed' || stage === 'fading' ? 0 : -30,
              filter: stage === 'sliding' || stage === 'revealed' || stage === 'fading' ? 'blur(0px)' : 'blur(10px)',
            }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
            className="flex flex-col text-left space-y-1 z-10"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-yellow-400 tracking-[0.25em] bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                PRO CINEMA
              </span>
              <Sparkles size={12} className="text-yellow-400 animate-spin-slow" />
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-[0.18em] sm:tracking-[0.28em] drop-shadow-md">
              CINEMA <span className="text-yellow-400">GRAFIK</span>
            </h1>

            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-widest uppercase">
              Baza Ocjena & Katalog Franšiza
            </p>
          </motion.div>

        </div>

        {/* Bottom progress bar & skip notice */}
        <div className="absolute bottom-10 flex flex-col items-center gap-3">
          <div className="w-48 h-1 bg-zinc-850 rounded-full overflow-hidden border border-zinc-800">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: 'linear' }}
              className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]"
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-1.5">
            <Volume2 size={12} className="text-yellow-400/80" /> Kliknite bilo gdje za preskočiti
          </span>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
