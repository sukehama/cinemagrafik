import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Sparkles, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

// Boss character image in public directory
export const PALACINKA_BOSS_IMAGE_SRC = 'kralj_palacinki.png';

interface PalacinkaBossModalProps {
  isActive: boolean;
  onClose: () => void;
  onBossDefeated?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface DrawnDot {
  x: number;
  y: number;
  isAccurate: boolean;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  icon: string;
  rotation: number;
  vRot: number;
}

// Generate dense sampled checkpoints along path formulas for accurate collision & coverage calculation (200x200 canvas)
function generateDenseCheckpoints(patternId: number): Point[] {
  const points: Point[] = [];
  
  if (patternId === 1) {
    // 1. ZigZag 4 horizontal stripes
    const yLevels = [50, 90, 130, 170];
    yLevels.forEach(y => {
      for (let x = 32; x <= 168; x += 5) {
        points.push({ x, y });
      }
    });
  } else if (patternId === 2) {
    // 2. Archimedean spiral
    for (let t = 0; t <= Math.PI * 4.6; t += 0.12) {
      const r = 10 + t * 4.4;
      const x = 100 + r * Math.cos(t);
      const y = 100 + r * Math.sin(t);
      if (x >= 25 && x <= 175 && y >= 25 && y <= 175) {
        points.push({ x, y });
      }
    }
  } else if (patternId === 3) {
    // 3. Concentric Rings
    const radii = [32, 60];
    radii.forEach(r => {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
        points.push({
          x: 100 + r * Math.cos(angle),
          y: 100 + r * Math.sin(angle)
        });
      }
    });
  } else if (patternId === 4) {
    // 4. Heart Path
    for (let t = 0; t < Math.PI * 2; t += 0.06) {
      const x = 100 + 4.5 * (16 * Math.pow(Math.sin(t), 3));
      const y = 105 - 4.5 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push({ x, y });
    }
  } else if (patternId === 5) {
    // 5. Grid Matrix
    const coords = [45, 80, 120, 155];
    coords.forEach(y => {
      for (let x = 40; x <= 160; x += 5) points.push({ x, y });
    });
    coords.forEach(x => {
      for (let y = 40; y <= 160; y += 5) points.push({ x, y });
    });
  }

  return points;
}

const PATTERNS_CONFIG = [
  {
    id: 1,
    name: 'Cik-Cak Linije',
    svgPath: 'M 32,50 L 168,50 M 32,90 L 168,90 M 32,130 L 168,130 M 32,170 L 168,170',
  },
  {
    id: 2,
    name: 'Spirala Eurokrema',
    svgPath: 'M 100,100 m -15,0 a 15,15 0 1,0 30,0 a 30,30 0 1,0 -60,0 a 45,45 0 1,0 90,0 a 60,60 0 1,0 -120,0',
  },
  {
    id: 3,
    name: 'Dvostruki Krugovi',
    svgPath: 'M 100,100 m -32,0 a 32,32 0 1,0 64,0 a 32,32 0 1,0 -64,0 M 100,100 m -60,0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0',
  },
  {
    id: 4,
    name: 'Čokoladno Srce',
    svgPath: 'M 100,165 C 45,120 20,85 45,55 C 65,30 92,45 100,62 C 108,45 135,30 155,55 C 180,85 155,120 100,165 Z',
  },
  {
    id: 5,
    name: 'Mrežni Uzorak (Master)',
    svgPath: 'M 40,45 L 160,45 M 40,80 L 160,80 M 40,120 L 160,120 M 40,155 L 160,155 M 45,40 L 45,160 M 80,40 L 80,160 M 120,40 L 120,160 M 155,40 L 155,160',
  }
];

export default function PalacinkaBossModal({ isActive, onClose, onBossDefeated }: PalacinkaBossModalProps) {
  // Phase state: 'intro' | 'arena' | 'explosion' | 'victory'
  const [phase, setPhase] = useState<'intro' | 'arena' | 'explosion' | 'victory'>('intro');
  const [introTextOpacity, setIntroTextOpacity] = useState(0);

  // Gameplay state
  const [hasKnife, setHasKnife] = useState(false);
  const [droppedKnifePos, setDroppedKnifePos] = useState<Point | null>(null);
  const [knifeIsDipped, setKnifeIsDipped] = useState(false);
  const [spreadCapacity, setSpreadCapacity] = useState(0);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [patternSuccessToast, setPatternSuccessToast] = useState<string | null>(null);

  // Precision Drawing & Accuracy State
  const [drawnDots, setDrawnDots] = useState<DrawnDot[]>([]);
  const [coveredCheckpoints, setCoveredCheckpoints] = useState<Set<number>>(new Set());
  const [accuracyPenalty, setAccuracyPenalty] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hitAlert, setHitAlert] = useState<string | null>(null);

  // Boss & Projectiles
  const [bossPos, setBossPos] = useState<Point>({ x: 150, y: 120 });
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [bossImgSrc, setBossImgSrc] = useState<string>(PALACINKA_BOSS_IMAGE_SRC);
  const [customImageFailed, setCustomImageFailed] = useState(false);

  // Mouse & UI feedback
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [jarDippedAnimation, setJarDippedAnimation] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [showVictoryDialog, setShowVictoryDialog] = useState(false);

  // Refs
  const arenaRef = useRef<HTMLDivElement>(null);
  const pancakeRef = useRef<HTMLDivElement>(null);
  const jarRef = useRef<HTMLDivElement>(null);
  const lastDrawnPosRef = useRef<Point | null>(null);
  const lastShotTimeRef = useRef<number>(0);
  const projectileIdRef = useRef<number>(1);
  const animFrameRef = useRef<number>(0);
  const bossPosRef = useRef<Point>({ x: 180, y: 120 });
  const bossVelRef = useRef<Point>({ x: 2.8, y: 2.3 });
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  const hasKnifeRef = useRef<boolean>(false);
  const currentPatternIndexRef = useRef<number>(0);
  const coveragePercentRef = useRef<number>(0);

  // Sync ref with state
  useEffect(() => {
    hasKnifeRef.current = hasKnife;
  }, [hasKnife]);

  useEffect(() => {
    currentPatternIndexRef.current = currentPatternIndex;
  }, [currentPatternIndex]);

  // Precomputed checkpoints for current pattern
  const currentCheckpoints = useMemo(() => {
    return generateDenseCheckpoints(PATTERNS_CONFIG[currentPatternIndex].id);
  }, [currentPatternIndex]);

  // Real-time Accuracy and Coverage Calculation
  const coveragePercent = useMemo(() => {
    if (currentCheckpoints.length === 0) return 0;
    return Math.min(100, Math.round((coveredCheckpoints.size / currentCheckpoints.length) * 100));
  }, [coveredCheckpoints, currentCheckpoints]);

  useEffect(() => {
    coveragePercentRef.current = coveragePercent;
  }, [coveragePercent]);

  const accuracyPercent = useMemo(() => {
    if (drawnDots.length === 0) return 100;
    const accurateCount = drawnDots.filter(d => d.isAccurate).length;
    const rawAccuracy = Math.round((accurateCount / drawnDots.length) * 100);
    const finalAcc = Math.max(0, rawAccuracy - accuracyPenalty);
    return finalAcc;
  }, [drawnDots, accuracyPenalty]);

  // Reset all state when modal opens
  useEffect(() => {
    if (isActive) {
      setPhase('intro');
      setIntroTextOpacity(0);
      setHasKnife(false);
      setDroppedKnifePos(null);
      setKnifeIsDipped(false);
      setSpreadCapacity(0);
      setCurrentPatternIndex(0);
      setDrawnDots([]);
      setCoveredCheckpoints(new Set());
      setAccuracyPenalty(0);
      setProjectiles([]);
      setShowVictoryDialog(false);
      setCustomImageFailed(false);
      setPatternSuccessToast(null);
      lastShotTimeRef.current = Date.now() + 1500;

      const t1 = setTimeout(() => setIntroTextOpacity(1), 250);
      const t2 = setTimeout(() => setIntroTextOpacity(0), 2200);
      const t3 = setTimeout(() => setPhase('arena'), 2800);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isActive]);

  // Advance to next pattern safely
  const advanceToNextPattern = () => {
    if (currentPatternIndex < PATTERNS_CONFIG.length - 1) {
      const nextIdx = currentPatternIndex + 1;
      setPatternSuccessToast(`✅ Odlično! Uzorak ${currentPatternIndex + 1} savladan!`);
      setTimeout(() => {
        setCurrentPatternIndex(nextIdx);
        setDrawnDots([]);
        setCoveredCheckpoints(new Set());
        setAccuracyPenalty(0);
        setPatternSuccessToast(null);
        lastDrawnPosRef.current = null;
      }, 700);
    } else {
      // VICTORY!
      setPatternSuccessToast(`🏆 MAJSTORSKI! Boss je poražen!`);
      setTimeout(() => {
        setPhase('explosion');
        setTimeout(() => {
          setPhase('victory');
        }, 2000);
      }, 700);
    }
  };

  // Full-Screen Dynamic Boss Movement & Multi-Projectile Bullet Spread
  useEffect(() => {
    if (phase !== 'arena') return;

    const projectileIcons = ['🥞', '🧈', '🍓', '🍴', '🍫', '🌰', '🍯', '🍌', '🍒', '🥄', '⚡', '🔥'];

    const gameLoop = () => {
      const arena = arenaRef.current;
      if (arena) {
        const bounds = arena.getBoundingClientRect();
        const padding = 105;

        // Current progress scaling based on correct spreads completed
        const patternIndex = currentPatternIndexRef.current; // 0, 1, 2, 3, 4
        const coverage = coveragePercentRef.current; // 0 to 100

        // Move Boss smoothly across entire screen, slightly faster at higher levels
        const maxSpeed = 3.5 + patternIndex * 0.4;
        let nx = bossPosRef.current.x + bossVelRef.current.x;
        let ny = bossPosRef.current.y + bossVelRef.current.y;
        let vx = bossVelRef.current.x;
        let vy = bossVelRef.current.y;

        // Bounce off left/right bounds
        if (nx <= padding) {
          nx = padding;
          vx = Math.abs(vx) + (Math.random() * 0.5 - 0.25);
        } else if (nx >= bounds.width - padding) {
          nx = bounds.width - padding;
          vx = -Math.abs(vx) - (Math.random() * 0.5 - 0.25);
        }

        // Bounce off top/bottom bounds
        if (ny <= padding) {
          ny = padding;
          vy = Math.abs(vy) + (Math.random() * 0.5 - 0.25);
        } else if (ny >= bounds.height - padding) {
          ny = bounds.height - padding;
          vy = -Math.abs(vy) - (Math.random() * 0.5 - 0.25);
        }

        // Clamp speed
        vx = Math.min(Math.max(vx, -maxSpeed), maxSpeed);
        vy = Math.min(Math.max(vy, -maxSpeed), maxSpeed);
        if (Math.abs(vx) < 1.5) vx = vx < 0 ? -2.0 : 2.0;
        if (Math.abs(vy) < 1.2) vy = vy < 0 ? -1.8 : 1.8;

        bossPosRef.current = { x: nx, y: ny };
        bossVelRef.current = { x: vx, y: vy };
        setBossPos({ x: nx, y: ny });

        // Dynamic Spawning: Fire rate gets faster as more spreads are completed
        // e.g. from 2400ms down to 800ms
        const dynamicFireInterval = Math.max(800, 2400 - (patternIndex * 340) - Math.floor(coverage * 3.5));
        const now = Date.now();

        if (now - lastShotTimeRef.current > dynamicFireInterval) {
          lastShotTimeRef.current = now;

          // Burst count scales with correct spreads:
          // Pattern 0 (1st spread): 4-5 projectiles
          // Pattern 1 (2nd spread): 6-8 projectiles
          // Pattern 2 (3rd spread): 8-10 projectiles
          // Pattern 3 (4th spread): 10-12 projectiles
          // Pattern 4 (5th spread): 12-16 projectiles!
          const burstCount = 4 + (patternIndex * 2) + (coverage > 50 ? 1 : 0) + Math.floor(Math.random() * 3);
          const baseAngle = Math.random() * Math.PI * 2;
          const newBursts: Projectile[] = [];

          // Projectiles fly faster as more spreads are made
          const baseSpeed = 2.8 + (patternIndex * 0.65) + (coverage * 0.012);

          for (let i = 0; i < burstCount; i++) {
            const angle = baseAngle + (i * ((Math.PI * 2) / burstCount)) + (Math.random() * 0.35 - 0.175);
            const speed = baseSpeed + Math.random() * 1.6;
            const chosenIcon = projectileIcons[Math.floor(Math.random() * projectileIcons.length)];

            newBursts.push({
              id: projectileIdRef.current++,
              x: nx,
              y: ny,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              icon: chosenIcon,
              rotation: Math.random() * 360,
              vRot: (Math.random() - 0.5) * 10
            });
          }

          setProjectiles(prev => [...prev.slice(-45), ...newBursts]);
        }

        // Update Projectiles & Check Collision with player's Knife
        setProjectiles(prev => {
          const nextList: Projectile[] = [];
          const curMouse = mousePosRef.current;
          const userHasKnife = hasKnifeRef.current;

          for (const p of prev) {
            const newPx = p.x + p.vx;
            const newPy = p.y + p.vy;
            const newRot = p.rotation + p.vRot;

            // Off-screen cleanup
            if (newPx < -60 || newPx > bounds.width + 60 || newPy < -60 || newPy > bounds.height + 60) {
              continue;
            }

            // Check collision with Player's Knife
            if (userHasKnife) {
              const distToKnife = Math.hypot(newPx - curMouse.x, newPy - curMouse.y);
              if (distToKnife < 32) {
                // HIT! Knock knife out of hand
                setHasKnife(false);
                hasKnifeRef.current = false;
                setKnifeIsDipped(false);
                setSpreadCapacity(0); // Player must dip knife after picking it up!
                setDroppedKnifePos({
                  x: Math.max(100, Math.min(bounds.width - 100, curMouse.x + (Math.random() * 100 - 50))),
                  y: Math.max(160, Math.min(bounds.height - 120, curMouse.y + 60))
                });
                setAccuracyPenalty(pen => pen + 4);
                setScreenShake(true);
                setTimeout(() => setScreenShake(false), 400);
                setHitAlert(`Pogođen si (${p.icon})! Nož je izbijen (-4% tačnosti)!`);
                setTimeout(() => setHitAlert(null), 2500);
                continue;
              }
            }

            nextList.push({
              ...p,
              x: newPx,
              y: newPy,
              rotation: newRot
            });
          }

          return nextList;
        });
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase]);

  // Handle Mouse Movement & Continuous Miniature Circle Spreading
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    mousePosRef.current = { x, y };

    // Dip in Eurokrem Jar if hovering top opening
    if (hasKnife && jarRef.current) {
      const jarRect = jarRef.current.getBoundingClientRect();
      const relJarX = jarRect.left - rect.left;
      const relJarY = jarRect.top - rect.top;

      if (
        x >= relJarX - 10 &&
        x <= relJarX + jarRect.width + 10 &&
        y >= relJarY - 10 &&
        y <= relJarY + jarRect.height * 0.5
      ) {
        if (!knifeIsDipped || spreadCapacity < 100) {
          setKnifeIsDipped(true);
          setSpreadCapacity(100);
          setJarDippedAnimation(true);
          setTimeout(() => setJarDippedAnimation(false), 300);
        }
      }
    }

    // Precise Drawing on Pancake
    if (hasKnife && knifeIsDipped && isMouseDown && pancakeRef.current) {
      const pRect = pancakeRef.current.getBoundingClientRect();
      const pX = pRect.left - rect.left;
      const pY = pRect.top - rect.top;

      // Coordinate relative to pancake 200x200 canvas
      const relPx = ((x - pX) / pRect.width) * 200;
      const relPy = ((y - pY) / pRect.height) * 200;

      // Check inside pancake circular boundary (radius 96)
      const distFromCenter = Math.hypot(relPx - 100, relPy - 100);
      if (distFromCenter <= 96) {
        const lastDot = lastDrawnPosRef.current;
        if (!lastDot || Math.hypot(relPx - lastDot.x, relPy - lastDot.y) >= 3.5) {
          lastDrawnPosRef.current = { x: relPx, y: relPy };

          // Check if this drawn dot is accurate (within 16px of current pattern checkpoints)
          let isAccurate = false;
          currentCheckpoints.forEach((cp, idx) => {
            const dist = Math.hypot(relPx - cp.x, relPy - cp.y);
            if (dist < 16) {
              isAccurate = true;
              if (!coveredCheckpoints.has(idx)) {
                setCoveredCheckpoints(prev => new Set(prev).add(idx));
              }
            }
          });

          // Add miniature dot to drawnDots
          setDrawnDots(prev => [...prev, { x: relPx, y: relPy, isAccurate }]);

          // Deplete spread capacity gradually
          setSpreadCapacity(prev => {
            const nextCap = prev - 0.35;
            if (nextCap <= 0) {
              setKnifeIsDipped(false);
              return 0;
            }
            return nextCap;
          });
        }
      }
    }
  };

  // Check Round Completion (Auto-advance on >= 80% coverage and >= 75% accuracy)
  useEffect(() => {
    if (phase !== 'arena') return;

    if (coveragePercent >= 80 && accuracyPercent >= 75 && !patternSuccessToast) {
      advanceToNextPattern();
    }
  }, [coveragePercent, accuracyPercent, phase, patternSuccessToast]);

  // Clean / Retry current pattern
  const handleClearCurrentPattern = () => {
    setDrawnDots([]);
    setCoveredCheckpoints(new Set());
    setAccuracyPenalty(0);
    lastDrawnPosRef.current = null;
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden select-none ${
          screenShake ? 'animate-pulse' : ''
        }`}
        onMouseDown={() => setIsMouseDown(true)}
        onMouseUp={() => {
          setIsMouseDown(false);
          lastDrawnPosRef.current = null;
        }}
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl border border-zinc-700/60 transition-all cursor-pointer shadow-xl flex items-center gap-1.5 text-xs font-bold"
        >
          <X size={18} /> Napusti Borbu
        </button>

        {/* PHASE 1: INTRO SEQUENCE */}
        {phase === 'intro' && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: introTextOpacity, scale: [1, 1.06, 1], y: 0 }}
              transition={{ 
                duration: 0.8, 
                ease: 'easeOut',
                scale: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
              }}
              className="relative w-72 h-72 sm:w-96 sm:h-96 max-w-[440px] max-h-[440px] flex items-center justify-center pointer-events-none"
            >
              <img 
                src={bossImgSrc}
                alt="Kralj Palačinki"
                className="w-full h-full max-h-80 sm:max-h-96 object-contain drop-shadow-[0_0_50px_rgba(245,158,11,0.9)] filter"
                onError={() => {
                  if (bossImgSrc === 'kralj_palacinki.png') {
                    setBossImgSrc('/kralj_palacinki.png');
                  } else {
                    setCustomImageFailed(true);
                  }
                }}
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: introTextOpacity, scale: 1 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              className="text-white text-2xl sm:text-4xl font-serif font-black tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]"
            >
              "Misliš da znaš mazati palačinke?"
            </motion.p>
          </div>
        )}

        {/* PHASE 2 & 3: ARENA & EXPLOSION */}
        {(phase === 'arena' || phase === 'explosion' || phase === 'victory') && (
          <div 
            ref={arenaRef}
            onMouseMove={handleMouseMove}
            className="relative w-full h-full flex flex-col items-center justify-between p-4 overflow-hidden bg-radial from-zinc-950 via-black to-black"
          >
            {/* TOP ARENA HUD */}
            <div className="z-20 flex flex-wrap items-center justify-between w-full max-w-4xl px-2 sm:px-4 pt-2 gap-2">
              <div className="flex items-center gap-3 bg-zinc-900/90 border border-amber-500/30 px-3 sm:px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg">
                <span className="text-2xl">🥞</span>
                <div>
                  <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    Uzorak {currentPatternIndex + 1} / 5
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">{PATTERNS_CONFIG[currentPatternIndex].name}</p>
                </div>
              </div>

              {/* STATS: COVERAGE & ACCURACY METERS */}
              <div className="flex items-center gap-3 bg-zinc-900/90 border border-amber-500/30 px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg">
                {/* Coverage */}
                <div className="text-right">
                  <span className="text-[9px] font-mono text-zinc-400 block uppercase">Pokrivenost (Cilj 80%)</span>
                  <span className={`text-xs sm:text-sm font-black ${coveragePercent >= 80 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {coveragePercent}%
                  </span>
                </div>
                <div className="w-12 sm:w-16 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                  <div 
                    className={`h-full transition-all duration-150 ${coveragePercent >= 80 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`}
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>

                <div className="h-6 w-px bg-zinc-700/60 mx-1" />

                {/* Accuracy */}
                <div className="text-right">
                  <span className="text-[9px] font-mono text-zinc-400 block uppercase">Tačnost (Min 75%)</span>
                  <span className={`text-xs sm:text-sm font-black ${accuracyPercent >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {accuracyPercent}%
                  </span>
                </div>
                <div className="w-12 sm:w-16 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                  <div 
                    className={`h-full transition-all duration-150 ${accuracyPercent >= 75 ? 'bg-emerald-400' : 'bg-red-500'}`}
                    style={{ width: `${accuracyPercent}%` }}
                  />
                </div>
              </div>

              {/* ACTION BUTTONS: CLEAR & MANUAL ADVANCE IF COVERAGE MET */}
              <div className="flex items-center gap-2">
                {coveragePercent >= 75 && (
                  <button
                    type="button"
                    onClick={advanceToNextPattern}
                    className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse"
                  >
                    <ArrowRight size={13} /> Sljedeći Uzorak
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearCurrentPattern}
                  className="px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow"
                  title="Očisti namaz i probaj ponovo za bolju tačnost"
                >
                  <RefreshCw size={12} /> Očisti
                </button>
              </div>
            </div>

            {/* TOAST NOTIFICATION FOR HIT / PROGRESSION */}
            {hitAlert && (
              <div className="absolute top-16 z-40 bg-red-600/90 text-white font-black text-xs px-4 py-1.5 rounded-full border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-bounce flex items-center gap-2">
                <AlertTriangle size={14} /> {hitAlert}
              </div>
            )}

            {patternSuccessToast && (
              <div className="absolute top-16 z-40 bg-emerald-600/95 text-white font-black text-xs px-5 py-2 rounded-full border border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-bounce flex items-center gap-2">
                <CheckCircle2 size={16} /> {patternSuccessToast}
              </div>
            )}

            {/* FULL-SCREEN ROAMING BOSS ENTITY */}
            {phase !== 'victory' && (
              <div 
                className="absolute z-30 pointer-events-none"
                style={{
                  left: `${bossPos.x}px`,
                  top: `${bossPos.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="relative flex flex-col items-center">
                  {/* EXPLOSION BEAM RAYS WHEN DEFEATED */}
                  {phase === 'explosion' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-96 h-96 rounded-full bg-white animate-ping opacity-90 blur-md" />
                      <div className="w-[800px] h-2 bg-white absolute rotate-0 animate-pulse shadow-[0_0_50px_#fff]" />
                      <div className="w-[800px] h-2 bg-white absolute rotate-45 animate-pulse shadow-[0_0_50px_#fff]" />
                      <div className="w-[800px] h-2 bg-white absolute rotate-90 animate-pulse shadow-[0_0_50px_#fff]" />
                      <div className="w-[800px] h-2 bg-white absolute rotate-[135deg] animate-pulse shadow-[0_0_50px_#fff]" />
                    </div>
                  )}

                  {/* BOSS CHARACTER CUTOUT (with luminous outline glow) */}
                  <motion.div 
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [-2, 2, -2]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8,
                      ease: 'easeInOut'
                    }}
                    className="relative w-64 h-72 sm:w-80 sm:h-96 md:w-96 md:h-[420px] flex items-center justify-center pointer-events-none"
                  >
                    {!customImageFailed ? (
                      <img 
                        src={bossImgSrc}
                        alt="Kralj Palačinki"
                        className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(245,158,11,0.95)] drop-shadow-[0_0_12px_rgba(255,255,255,0.85)]"
                        onError={() => {
                          if (bossImgSrc === 'kralj_palacinki.png') {
                            setBossImgSrc('/kralj_palacinki.png');
                          } else {
                            setCustomImageFailed(true);
                          }
                        }}
                      />
                    ) : (
                      <div className="text-8xl filter drop-shadow-[0_0_30px_rgba(245,158,11,0.9)]">
                        🥞
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}

            {/* FLYING PROJECTILES THROWN BY BOSS */}
            {projectiles.map(p => (
              <div
                key={p.id}
                className="absolute z-35 pointer-events-none text-2xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                style={{
                  left: `${p.x}px`,
                  top: `${p.y}px`,
                  transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`
                }}
              >
                {p.icon}
              </div>
            ))}

            {/* DROPPED KNIFE ON ARENA FLOOR WHEN KNOCKED OUT */}
            {droppedKnifePos && !hasKnife && (
              <div
                onClick={() => {
                  setHasKnife(true);
                  setKnifeIsDipped(false); // Knife is picked up empty -> user must dip it in the jar!
                  setSpreadCapacity(0);
                  setDroppedKnifePos(null);
                }}
                className="absolute z-40 cursor-pointer animate-bounce group"
                style={{
                  left: `${droppedKnifePos.x}px`,
                  top: `${droppedKnifePos.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="bg-amber-500 hover:bg-amber-400 text-zinc-955 px-3.5 py-2 rounded-full font-black text-xs flex items-center gap-1.5 shadow-[0_0_25px_gold] border-2 border-white cursor-pointer">
                  <span>🔪</span> Klikni da podigneš nož! (Potrebno umočiti)
                </div>
              </div>
            )}

            {/* CENTER ARENA: PANCAKE & EUROKREM JAR */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-auto w-full max-w-4xl">
              
              {/* THE PANCAKE WITH SVG MINIATURE DOT TRAIL */}
              <div className="flex flex-col items-center space-y-2">
                <div 
                  ref={pancakeRef}
                  className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#e8c187] via-[#f7ddaf] to-[#fae8c8] border-8 border-[#c99554] shadow-[0_0_60px_rgba(245,158,11,0.25)] flex items-center justify-center overflow-hidden cursor-crosshair"
                >
                  {/* Subtle pancake cooked texture spots */}
                  <div className="absolute w-12 h-12 rounded-full bg-[#dca468]/30 blur-sm top-12 left-14 pointer-events-none" />
                  <div className="absolute w-16 h-16 rounded-full bg-[#dca468]/25 blur-sm bottom-12 right-14 pointer-events-none" />
                  <div className="absolute w-8 h-8 rounded-full bg-[#c28445]/20 blur-xs top-24 right-20 pointer-events-none" />

                  {/* SVG Layer: Dotted Target Outline & Precision Miniature Chocolate Trail */}
                  <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 200 200">
                    {/* Target Outline (Dotted Lines to fill) */}
                    <path
                      d={PATTERNS_CONFIG[currentPatternIndex].svgPath}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="4.5"
                      strokeDasharray="5,6"
                      strokeLinecap="round"
                      opacity="0.9"
                      filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))"
                    />

                    {/* Drawn Miniature Dots Spread on the Pancake */}
                    {drawnDots.map((dot, idx) => (
                      <circle
                        key={idx}
                        cx={dot.x}
                        cy={dot.y}
                        r="5.5"
                        fill="#3a1b08"
                        opacity="0.96"
                      />
                    ))}
                  </svg>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
                  {isMouseDown ? (
                    <span className="text-amber-200">✏️ Mažeš precizno po linijama...</span>
                  ) : (
                    <span>Drži lijevi klik i vuci nož po isprekidanim linijama</span>
                  )}
                </div>
              </div>

              {/* REALISTIC EUROKREM JAR & SLICK KNIFE INTERACTION */}
              <div className="flex flex-col items-center space-y-4">
                
                {/* REALISTIC EUROKREM JAR SVG */}
                <div 
                  ref={jarRef}
                  onClick={() => {
                    if (hasKnife) {
                      setKnifeIsDipped(true);
                      setSpreadCapacity(100);
                      setJarDippedAnimation(true);
                      setTimeout(() => setJarDippedAnimation(false), 300);
                    }
                  }}
                  className={`relative cursor-pointer transition-transform duration-200 ${
                    jarDippedAnimation ? 'scale-110' : 'hover:scale-105'
                  }`}
                  title="Klikni ili pređi nožem preko vrha tegle da ga napuniš eurokremom!"
                >
                  <svg width="120" height="150" viewBox="0 0 120 150" className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                    <defs>
                      <linearGradient id="jarGlass" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#451e06" />
                        <stop offset="25%" stopColor="#2b1103" />
                        <stop offset="60%" stopColor="#451e06" />
                        <stop offset="85%" stopColor="#69300c" />
                        <stop offset="100%" stopColor="#2b1103" />
                      </linearGradient>
                      <linearGradient id="goldCap" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="50%" stopColor="#fde68a" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                      <linearGradient id="whiteCream" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="100%" stopColor="#fae8c8" />
                      </linearGradient>
                    </defs>

                    {/* Jar Body */}
                    <rect x="15" y="28" width="90" height="115" rx="20" fill="url(#jarGlass)" stroke="#78350f" strokeWidth="2" />
                    
                    {/* Dual Swirl Cream Texture (Brown + White Hazelnut) */}
                    <path d="M 17,65 Q 40,85 70,60 T 103,75 L 103,130 Q 60,142 17,130 Z" fill="#290f02" opacity="0.9" />
                    <path d="M 17,90 Q 50,110 80,85 T 103,105 L 103,130 Q 60,140 17,130 Z" fill="url(#whiteCream)" opacity="0.92" />
                    
                    {/* Authentic Label */}
                    <rect x="20" y="55" width="80" height="42" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
                    <text x="60" y="73" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">EUROKREM</text>
                    <text x="60" y="87" textAnchor="middle" fill="#b45309" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">DVOBOJNI NAMAZ</text>

                    {/* Golden Screw Cap */}
                    <rect x="25" y="10" width="70" height="18" rx="6" fill="url(#goldCap)" stroke="#78350f" strokeWidth="1.5" />
                    <line x1="30" y1="14" x2="90" y2="14" stroke="#78350f" strokeWidth="1" opacity="0.5" />
                    <line x1="30" y1="20" x2="90" y2="20" stroke="#78350f" strokeWidth="1" opacity="0.5" />

                    {/* Dip Entrance Indicator */}
                    <ellipse cx="60" cy="28" rx="28" ry="6" fill="#1c0a01" stroke="#f59e0b" strokeWidth="1" />
                  </svg>

                  {/* Jar Capacity / Status Overlay */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-amber-500/50 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap shadow-md">
                    {knifeIsDipped ? `Namaz: ${Math.round(spreadCapacity)}%` : 'Umoči Nož!'}
                  </div>
                </div>

                {/* KNIFE BUTTON OR STATUS */}
                {!hasKnife ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasKnife(true);
                      setKnifeIsDipped(true);
                      setSpreadCapacity(100);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-955 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-bounce cursor-pointer flex items-center gap-2"
                  >
                    <span>🔪</span> Uzmi Nož!
                  </button>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="px-3 py-1 bg-zinc-900 border border-amber-500/40 rounded-xl text-[10px] text-amber-300 font-bold text-center">
                      {knifeIsDipped ? 'Nož je spreman za mazanje!' : '⚠️ Umoči nož u vrh tegle eurokrema!'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CURSOR KNIFE OVERLAY FOLLOWING MOUSE WITH REALISTIC METALLIC CHEF BLADE & SPREAD */}
            {hasKnife && (
              <div 
                className="fixed pointer-events-none z-50 transition-transform duration-75"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y}px`,
                  transform: 'translate(-12px, -38px)'
                }}
              >
                <svg width="60" height="60" viewBox="0 0 60 60" className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                  <defs>
                    <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f1f5f9" />
                      <stop offset="50%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <linearGradient id="handleGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#78350f" />
                      <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>
                  </defs>

                  {/* Knife Handle */}
                  <rect x="26" y="32" width="8" height="22" rx="3" fill="url(#handleGrad)" stroke="#271003" strokeWidth="1" />
                  <circle cx="30" cy="38" r="1.2" fill="#fbbf24" />
                  <circle cx="30" cy="46" r="1.2" fill="#fbbf24" />

                  {/* Stainless Steel Spatula / Knife Blade */}
                  <path d="M 28,32 L 28,12 Q 30,6 34,6 Q 38,6 38,12 L 32,32 Z" fill="url(#bladeGrad)" stroke="#64748b" strokeWidth="0.8" />
                  
                  {/* Chocolate Spread Coating on Tip */}
                  {knifeIsDipped && (
                    <path 
                      d="M 28,16 Q 30,6 34,6 Q 38,6 37,16 Q 33,18 28,16 Z" 
                      fill="#3a1b08" 
                      stroke="#271003" 
                      strokeWidth="0.5" 
                    />
                  )}

                  {/* Miniature tip circle for precision alignment */}
                  <circle cx="34" cy="6" r="3" fill={knifeIsDipped ? '#f59e0b' : '#38bdf8'} stroke="#ffffff" strokeWidth="1" />
                </svg>
              </div>
            )}

            {/* BOTTOM HELP FOOTER */}
            <div className="z-20 text-center pb-2 px-4">
              <p className="text-[11px] font-mono text-zinc-400 max-w-xl mx-auto">
                Drži klik i vuci nož precizno po linijama. Pokrij preko 80% uzorka sa preko 75% tačnosti. Umoči nož u eurokrem kada se isprazni!
              </p>
            </div>

            {/* PHASE 3: WHITE FLASH OVERLAY */}
            {phase === 'explosion' && (
              <div className="absolute inset-0 z-50 bg-white animate-in fade-in duration-700 flex items-center justify-center" />
            )}
          </div>
        )}

        {/* PHASE 4: VICTORY TROPHY SPAWN */}
        {phase === 'victory' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex flex-col items-center space-y-6 text-center max-w-md">
              
              {/* TROPHY IN PLACE OF BOSS */}
              <motion.div 
                onClick={() => setShowVictoryDialog(true)}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 p-1 shadow-[0_0_60px_rgba(250,204,21,0.8)] flex items-center justify-center cursor-pointer group hover:scale-110 transition-transform"
              >
                <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center p-4 border-2 border-yellow-400">
                  <Trophy size={54} className="text-yellow-400 group-hover:rotate-12 transition-transform drop-shadow-[0_0_15px_gold]" />
                  <span className="text-xs font-black text-yellow-300 uppercase tracking-widest mt-1">Majstor Palačinki</span>
                </div>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
                  Pobijedili Ste Boss-a! 🥞🏆
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Palačinka Boss je poražen sa vrhunskom tačnošću! Kliknite na zlatni trofej iznad da preuzmete svoju titulu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowVictoryDialog(true)}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-zinc-955 font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles size={16} /> Preuzmi Trofej "Majstor Palačinki"
              </button>
            </div>
          </div>
        )}

        {/* VICTORY CLAIM DIALOG */}
        {showVictoryDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border-2 border-yellow-400/80 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 text-yellow-400 mx-auto flex items-center justify-center border border-yellow-400/40">
                <Trophy size={36} />
              </div>

              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  Trofej Otključan!
                </h3>
                <p className="text-xs text-yellow-300 font-bold uppercase tracking-wide mt-1">
                  "Majstor Palačinki 🥞🏆"
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  Čestitamo! Uspješno ste namazali svih 5 uzoraka eurokrema uz izbjegavanje napada i preko 80% tačnosti! Trofej je spremljen na vaš profil.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('palacinka_trophy_unlocked', 'true');
                  if (onBossDefeated) onBossDefeated();
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-955 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer font-bold"
              >
                Super, Hvala!
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
