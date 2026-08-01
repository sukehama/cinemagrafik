import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ShieldAlert, X } from 'lucide-react';

export const VEDO_IMAGE_SRC = 'vedo_foot.jpg';

interface VedoPhysicsOverlayProps {
  isActive: boolean;
  onCloseRequested?: () => void;
  onBossDefeated?: () => void;
}

interface ExplosionParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export default function VedoPhysicsOverlay({ isActive, onCloseRequested, onBossDefeated }: VedoPhysicsOverlayProps) {
  const [bossHp, setBossHp] = useState<number>(100);
  const [showVictoryTrophy, setShowVictoryTrophy] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  const [bossPos, setBossPos] = useState({ x: 50, y: 50 });
  const [isVulnerable, setIsVulnerable] = useState(false);
  const [explosions, setExplosions] = useState<ExplosionParticle[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'hit' | 'vulnerable' | 'explosion') => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'vulnerable') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.21);
      } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'explosion') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.81);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isActive) {
      setBossHp(100);
      setShowVictoryTrophy(false);
      setIsVulnerable(false);
    }
  }, [isActive]);

  // Brzo nasumično kretanje
  useEffect(() => {
    if (!isActive || showVictoryTrophy) return;

    const moveInterval = setInterval(() => {
      const nextX = 15 + Math.random() * 70;
      const nextY = 20 + Math.random() * 60;
      setBossPos({ x: nextX, y: nextY });
    }, 600);

    return () => clearInterval(moveInterval);
  }, [isActive, showVictoryTrophy]);

  // Ranjivi interval (svakih 7-10 sekundi)
  useEffect(() => {
    if (!isActive || showVictoryTrophy) return;

    let timer: NodeJS.Timeout;
    const scheduleVulnerablePhase = () => {
      const delay = 7000 + Math.random() * 3000;
      timer = setTimeout(() => {
        setIsVulnerable(true);
        playSound('vulnerable');

        setTimeout(() => {
          setIsVulnerable(false);
          scheduleVulnerablePhase();
        }, 2200);
      }, delay);
    };

    scheduleVulnerablePhase();
    return () => clearTimeout(timer);
  }, [isActive, showVictoryTrophy]);

  const handleBossClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    const clickX = e.clientX;
    const clickY = e.clientY;

    const newParticles: ExplosionParticle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i,
      x: clickX,
      y: clickY,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      size: 6 + Math.random() * 12,
      color: ['#ef4444', '#f59e0b', '#ffffff', '#dc2626'][Math.floor(Math.random() * 4)]
    }));
    setExplosions(prev => [...prev, ...newParticles]);

    if (isVulnerable) {
      playSound('explosion');
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
      setIsVulnerable(false);

      corruptAppDOM();

      setBossHp(prev => {
        const nextHp = Math.max(0, prev - 25);
        if (nextHp === 0) {
          setShowVictoryTrophy(true);
          if (onBossDefeated) onBossDefeated();
        }
        return nextHp;
      });
    } else {
      playSound('hit');
    }
  };

  const corruptAppDOM = () => {
    try {
      const allTextNodes = document.querySelectorAll('h1, h2, h3, p, span');
      const allImages = document.querySelectorAll('img');

      for (let i = 0; i < 15; i++) {
        const randIndex = Math.floor(Math.random() * allTextNodes.length);
        if (allTextNodes[randIndex]) {
          allTextNodes[randIndex].textContent = 'Vedo Dela 👹';
        }
      }

      for (let i = 0; i < 5; i++) {
        const randIndex = Math.floor(Math.random() * allImages.length);
        if (allImages[randIndex]) {
          (allImages[randIndex] as HTMLImageElement).src = VEDO_IMAGE_SRC;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseEntirely = () => {
    setShowVictoryTrophy(false);
    if (onCloseRequested) {
      onCloseRequested();
    }
  };

  if (!isActive) return null;

  return (
    <div className={`fixed inset-0 z-[99999] overflow-hidden ${screenShake ? 'animate-bounce' : ''}`}>
      
      {/* GUMB ZA IZLAZ */}
      <button
        onClick={handleCloseEntirely}
        className="fixed top-4 right-4 z-[100010] w-10 h-10 rounded-full bg-zinc-950/90 text-zinc-300 hover:text-white border border-yellow-400/50 flex items-center justify-center cursor-pointer shadow-xl"
      >
        <X size={20} />
      </button>

      {/* CISTI BIJELI EKRAN S POBJEDNIČKIM TROFEJOM (NEMA BOSS-A I NEMA HEALTH BARA DOK JE OVO OTVORENO) */}
      <AnimatePresence>
        {showVictoryTrophy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100005] flex flex-col items-center justify-center pointer-events-auto p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-950 text-white p-8 md:p-12 rounded-3xl border-4 border-yellow-400 text-center max-w-lg shadow-[0_0_100px_rgba(250,204,21,0.8)] space-y-6"
            >
              {/* KRUG SA ŽUTIM OUTLINE-OM I SLIKOM VELIKOG ZLATNOG PEHARA UNUTRA */}
              <div className="relative w-32 h-32 rounded-full bg-zinc-950 border-4 border-yellow-400 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(250,204,21,0.6)] animate-bounce">
                <Trophy size={64} className="text-yellow-400 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black uppercase text-yellow-400 tracking-tight">
                  Kup Pobjede Vedo Dele 🏆
                </h2>
                <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                  Čestitamo! Savladali ste Vedo Dela Boss-a! Trofej je automatski dodijeljen i istaknut u tvojoj kolekciji na Home stranici!
                </p>
              </div>

              <button
                onClick={handleCloseEntirely}
                className="bg-yellow-400 hover:bg-yellow-300 text-zinc-955 font-black px-8 py-3.5 rounded-xl transition shadow-lg text-xs uppercase cursor-pointer"
              >
                Preuzmi Kup i Zatvori
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEALTH BAR (Samo dok traje borba, sklanja se na pobjedi) */}
      {!showVictoryTrophy && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[99999] w-[90%] max-w-xl bg-zinc-955/90 border border-yellow-400/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={VEDO_IMAGE_SRC} alt="Boss" className="w-9 h-9 rounded-full object-cover border-2 border-yellow-400" />
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> VEDO DELA BOSS
                </h3>
                <p className="text-[10px] text-yellow-400 font-mono font-bold">
                  {isVulnerable ? '🔥 UDARI SADA!' : 'Brzo se kreće... Čekaj crveni prsten!'}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
              {bossHp} / 100 HP
            </span>
          </div>

          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${bossHp}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"
            />
          </div>
        </div>
      )}

      {/* LETEĆI BOSS LIK (Sklanja se u potpunosti čim pobijediš) */}
      {!showVictoryTrophy && (
        <motion.div
          animate={{
            top: `${bossPos.y}%`,
            left: `${bossPos.x}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onClick={handleBossClick}
          className="fixed transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[100000] pointer-events-auto group"
        >
          <div className="relative">
            {isVulnerable && (
              <>
                <div className="absolute -inset-6 rounded-full border-4 border-red-500 animate-ping" />
                <div className="absolute -inset-4 rounded-full border-2 border-yellow-400 animate-spin" />
              </>
            )}

            <img
              src={VEDO_IMAGE_SRC}
              alt="Vedo Boss"
              className={`w-32 h-48 md:w-44 md:h-64 object-contain transition-all ${
                isVulnerable
                  ? 'drop-shadow-[0_0_50px_rgba(239,68,68,1)] scale-110'
                  : 'drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]'
              }`}
            />
          </div>
        </motion.div>
      )}

      {/* EKSPLOZIJE */}
      {explosions.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
          animate={{ x: p.x + p.vx * 15, y: p.y + p.vy * 15, opacity: 0, scale: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          className="fixed rounded-full pointer-events-none z-[100002] shadow-lg"
        />
      ))}
    </div>
  );
}