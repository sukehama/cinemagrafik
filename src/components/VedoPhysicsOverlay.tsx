import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, ShieldAlert, Sparkles, X } from 'lucide-react';

export const VEDO_IMAGE_SRC = '/vedo_foot.jpg';

interface VedoPhysicsOverlayProps {
  isActive: boolean;
  onCloseRequested?: () => void;
  onBossDefeated?: () => void;
}

interface QTETarget {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

interface VedoParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  bounces: number;
}

export default function VedoPhysicsOverlay({ isActive, onCloseRequested, onBossDefeated }: VedoPhysicsOverlayProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [bossHp, setBossHp] = useState<number>(100);
  const [qteTargets, setQteTargets] = useState<QTETarget[]>([]);
  const [isSupernova, setIsSupernova] = useState(false);
  const [showVictoryTrophy, setShowVictoryTrophy] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic screaming/hit/explosion audio
  const playScreamSound = (pitch = 1, isHit = false, isExplosion = false) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isExplosion) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.25);
        return;
      }

      osc.type = isHit ? 'square' : 'sawtooth';
      const baseFreq = isHit ? (600 + Math.random() * 400) : (300 + Math.random() * 400) * pitch;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isHit ? 80 : baseFreq * 2.2, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (e) {
      console.error('Audio synth error:', e);
    }
  };

  // Reset Boss state when activated
  useEffect(() => {
    if (isActive) {
      setBossHp(100);
      setShowFlash(true);
      setIsSupernova(false);
      setShowVictoryTrophy(false);
      setQteTargets([]);
      playScreamSound(1.2);
      const timer = setTimeout(() => setShowFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // QTE Target Spawner (Every 2.2 seconds)
  useEffect(() => {
    if (!isActive || bossHp <= 0 || isSupernova) return;

    const spawnInterval = setInterval(() => {
      const padding = 120;
      const x = padding + Math.random() * (window.innerWidth - padding * 2);
      const y = padding + Math.random() * (window.innerHeight - padding * 2);

      const target: QTETarget = {
        id: Date.now() + Math.random(),
        x,
        y,
        createdAt: Date.now()
      };

      setQteTargets(prev => [...prev.slice(-3), target]); // Keep max 4 active
    }, 2200);

    return () => clearInterval(spawnInterval);
  }, [isActive, bossHp, isSupernova]);

  // QTE Target Countdown Expiry (2 seconds timer)
  useEffect(() => {
    if (!isActive || qteTargets.length === 0) return;

    const checkTimer = setInterval(() => {
      const now = Date.now();
      setQteTargets(prev => prev.filter(t => now - t.createdAt < 2000));
    }, 100);

    return () => clearInterval(checkTimer);
  }, [isActive, qteTargets]);

  // Handle QTE target click
  const handleHitTarget = (targetId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setQteTargets(prev => prev.filter(t => t.id !== targetId));
    playScreamSound(1, true);

    // Trigger screen shake
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 250);

    // Damage Boss (-15 HP per hit)
    setBossHp(prev => {
      const nextHp = Math.max(0, prev - 15);
      if (nextHp === 0) {
        // TRIGGER SUPERNOVA EXPLOSION & DEFEAT BOSS!
        handleDefeatBoss();
      }
      return nextHp;
    });
  };

  // Boss Defeat sequence
  const handleDefeatBoss = () => {
    setIsSupernova(true);
    playScreamSound(1, false, true);

    setTimeout(() => {
      // Fade supernova back to trophy release
      setShowVictoryTrophy(true);
      if (onBossDefeated) {
        onBossDefeated();
      }
    }, 1800);
  };

  // Canvas Physics Engine for falling & bouncing Vedo heads
  useEffect(() => {
    if (!isActive || isSupernova) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const img = new Image();
    img.src = VEDO_IMAGE_SRC;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const particles: VedoParticle[] = [];
    let particleIdCounter = 0;

    // Spawn new Vedos periodically
    const spawnInterval = setInterval(() => {
      if (particles.length < 25) {
        const size = 60 + Math.random() * 70;
        particles.push({
          id: particleIdCounter++,
          x: Math.random() * (width - size),
          y: -size - Math.random() * 100,
          vx: (Math.random() - 0.5) * 6,
          vy: 2 + Math.random() * 4,
          size,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.15,
          bounces: 0
        });
      }
    }, 600);

    const gravity = 0.45;

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply physics
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        // Bounce off bottom floor
        if (p.y + p.size >= height) {
          p.y = height - p.size;
          p.vy = -p.vy * 0.72;
          p.vx *= 0.95;
          p.bounces++;
        }

        // Bounce off left / right walls
        if (p.x <= 0) {
          p.x = 0;
          p.vx = -p.vx * 0.8;
        } else if (p.x + p.size >= width) {
          p.x = width - p.size;
          p.vx = -p.vx * 0.8;
        }

        // Render Vedo image onto canvas
        ctx.save();
        ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
        ctx.rotate(p.rotation);
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        } else {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      clearInterval(spawnInterval);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, isSupernova]);

  if (!isActive) return null;

  return (
    <div className={`fixed inset-0 z-[99999] overflow-hidden ${screenShake ? 'animate-bounce' : ''}`}>
      
      {/* SUPERNOVA EXPLOSION OVERLAY */}
      <AnimatePresence>
        {isSupernova && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 bg-white z-[100005] flex flex-col items-center justify-center pointer-events-auto text-zinc-955 p-6"
          >
            {showVictoryTrophy ? (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-zinc-950 text-white p-8 md:p-12 rounded-3xl border-4 border-yellow-400 text-center max-w-lg shadow-[0_0_100px_rgba(250,204,21,0.8)] space-y-4"
              >
                <div className="w-24 h-24 rounded-full bg-yellow-400 text-zinc-955 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                  <Trophy size={48} />
                </div>
                <h2 className="text-3xl font-black uppercase text-yellow-400 tracking-tight">
                  POBIJEDILI STE VEDO DELU! 🏆
                </h2>
                <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                  Čestitamo! Uništili ste Vedo Dela Boss-a i spasili Cinema Grafik katalog! 
                  Trofej <strong>"Vedo Dela Slayer 🏆"</strong> je dodan na vaš profil i prikazan na početnoj stranici!
                </p>
                <button
                  onClick={() => {
                    setIsSupernova(false);
                    if (onCloseRequested) onCloseRequested();
                  }}
                  className="bg-yellow-400 text-zinc-955 font-black px-6 py-3 rounded-xl hover:bg-yellow-300 transition shadow-lg text-xs uppercase cursor-pointer"
                >
                  Preuzmi Trofej i Zatvori
                </button>
              </motion.div>
            ) : (
              <div className="text-center space-y-4">
                <Sparkles className="w-24 h-24 text-yellow-500 mx-auto animate-spin" />
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-yellow-500">
                  SUPERNOVA EKSPLOZIJA!
                </h1>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLASH INTRO */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed inset-0 bg-yellow-400/95 backdrop-blur-xl z-[100000] flex flex-col items-center justify-center text-zinc-955 p-6 text-center pointer-events-none"
          >
            <motion.img
              src={VEDO_IMAGE_SRC}
              alt="Vedo Dela"
              className="w-48 h-80 object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-bounce mb-4"
            />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter drop-shadow-lg">
              VEDO DELA BOSS FIGHT AKTIVIRAN! 👹
            </h1>
            <p className="text-sm sm:text-lg font-mono font-bold mt-2">
              Klikćite na crvene kružnice koje se pojavljuju da smanjite Health Bar Vedo Dele!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BOSS HEALTH BAR & CONTROLS (Pointer events enabled) */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[99999] w-[90%] max-w-xl bg-zinc-955/90 border border-yellow-400/40 rounded-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={VEDO_IMAGE_SRC} alt="Boss" className="w-9 h-9 rounded-full object-cover border-2 border-yellow-400" />
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> VEDO DELA BOSS
              </h3>
              <p className="text-[10px] text-yellow-400 font-mono font-bold">Uništi ga klikanjem na ciljeve!</p>
            </div>
          </div>
          <span className="text-xs font-mono font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
            {bossHp} / 100 HP
          </span>
        </div>

        {/* Health Progress Bar */}
        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${bossHp}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"
          />
        </div>
      </div>

      {/* FLOATING GIANT VEDO BOSS ANIMATED SPRITE IN THE EXACT CENTER */}
      {!isSupernova && (
        <motion.div
          animate={{
            x: [0, 180, -180, 90, -90, 0],
            y: [0, -50, 50, -25, 25, 0],
            rotate: [0, 8, -8, 5, -5, 0],
            scale: [1, 1.05, 0.95, 1.03, 0.97, 1]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[99990]"
        >
          <img
            src={VEDO_IMAGE_SRC}
            alt="Vedo Boss Floating"
            className="w-64 h-96 object-contain drop-shadow-[0_0_80px_rgba(250,204,21,0.85)] filter brightness-110"
          />
        </motion.div>
      )}

      {/* QUICK-TIME EVENT (QTE) TARGET CIRCLES SPAWNING ON SCREEN */}
      {!isSupernova && qteTargets.map(target => (
        <button
          key={target.id}
          onClick={(e) => handleHitTarget(target.id, e)}
          style={{ top: target.y, left: target.x }}
          className="fixed transform -translate-x-1/2 -translate-y-1/2 z-[100001] pointer-events-auto cursor-pointer group flex items-center justify-center w-16 h-16"
        >
          {/* Outer shrinking ring timer (2s animation) */}
          <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
          <span className="absolute -inset-2 rounded-full border-2 border-yellow-400 animate-[spin_2s_linear_infinite]" />
          
          {/* Target button */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-yellow-400 flex items-center justify-center text-white font-black shadow-[0_0_20px_rgba(239,68,68,0.9)] group-hover:scale-125 transition-transform">
            <Zap size={20} className="fill-white text-white animate-bounce" />
          </div>
        </button>
      ))}

      {/* Physics bouncing canvas */}
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
    </div>
  );
}

