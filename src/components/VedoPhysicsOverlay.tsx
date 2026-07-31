import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import vedoImg from '../assets/images/vedo_foot_1785519357278.jpg';

interface VedoPhysicsOverlayProps {
  isActive: boolean;
  onCloseRequested?: () => void;
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

export const VEDO_IMAGE_SRC = vedoImg;

export default function VedoPhysicsOverlay({ isActive }: VedoPhysicsOverlayProps) {
  const [showFlash, setShowFlash] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic screaming/boing audio using Web Audio API
  const playScreamSound = (pitch = 1) => {
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

      osc.type = 'sawtooth';
      
      // Funny screaming pitch sweep (high to low screeching bounce)
      const baseFreq = (300 + Math.random() * 400) * pitch;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (e) {
      console.error('Audio synth error:', e);
    }
  };

  // Flash effect on activation
  useEffect(() => {
    if (isActive) {
      setShowFlash(true);
      playScreamSound(1.2);
      const timer = setTimeout(() => setShowFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Canvas Physics Engine for falling & bouncing Vedo heads
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const img = new Image();
    img.src = vedoImg;

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
      if (particles.length < 35) {
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
        playScreamSound(0.8 + Math.random() * 0.6);
      }
    }, 450);

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
          p.vy = -p.vy * 0.72; // restitution
          p.vx *= 0.95; // friction
          p.bounces++;
          if (Math.abs(p.vy) > 3) {
            playScreamSound(0.9 + Math.random() * 0.4);
          }
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
          ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size * 1.6);
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
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      {/* Epic flash transition when triggered */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed inset-0 bg-yellow-400/90 backdrop-blur-xl z-[100000] flex flex-col items-center justify-center text-zinc-955 p-6 text-center"
          >
            <motion.img
              src={vedoImg}
              alt="Vedo Dela"
              className="w-48 h-80 object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-bounce mb-4"
            />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter drop-shadow-lg">
              VEDO DELA NAČIN REŽIMA AKTIVIRAN!
            </h1>
            <p className="text-sm sm:text-lg font-mono font-bold mt-2">
              (Pritisnite logo 6 puta ponovo u gornjem lijevom ćošku za isključivanje)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Physics bouncing canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
