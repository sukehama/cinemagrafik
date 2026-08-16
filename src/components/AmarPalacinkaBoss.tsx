import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy } from 'lucide-react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Prilagodi putanju ako treba

export const AMAR_IMAGE_SRC = 'amar_foot.jpg';
export const PALACINKA_SRC = 'palacinka.png';
export const EUROKREM_SRC = 'eurokrem.png';
export const NOZ_SRC = 'noz.png';

interface AmarPalacinkaBossProps {
  isActive: boolean;
  currentUser: any;
  onCloseRequested: () => void;
  onBossDefeated: () => void;
}

// 5 različitih putanja (patterna) za mazanje na palacinki
const PATTERNS = [
  [{ x: -40, y: -40 }, { x: 0, y: -50 }, { x: 40, y: -40 }, { x: 50, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 50 }, { x: -40, y: 40 }, { x: -50, y: 0 }], // Krug
  [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: -50, y: 0 }, { x: 50, y: 0 }, { x: -50, y: 50 }, { x: 50, y: 50 }], // Zig-Zag
  [{ x: -40, y: -40 }, { x: 40, y: -40 }, { x: 40, y: 40 }, { x: -40, y: 40 }, { x: -40, y: -40 }], // Kvadrat
  [{ x: 0, y: -20 }, { x: 30, y: -20 }, { x: 30, y: 30 }, { x: -30, y: 30 }, { x: -30, y: -40 }, { x: 50, y: -40 }, { x: 50, y: 50 }], // Spirala
  [{ x: -50, y: -30 }, { x: -20, y: 0 }, { x: 20, y: 0 }, { x: 50, y: -30 }, { x: 50, y: 30 }, { x: 20, y: 0 }, { x: -20, y: 0 }, { x: -50, y: 30 }] // Beskonačnost
];

type GamePhase = 'intro' | 'playing' | 'exploding' | 'victory';

export default function AmarPalacinkaBoss({ isActive, currentUser, onCloseRequested, onBossDefeated }: AmarPalacinkaBossProps) {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [score, setScore] = useState(0);
  const [knifeState, setKnifeState] = useState<'idle' | 'empty' | 'full'>('idle');
  const [waypoints, setWaypoints] = useState<{x: number, y: number, cleared: boolean}[]>([]);
  
  // Refs za brze updateove bez re-rendera
  const knifeRef = useRef<HTMLDivElement>(null);
  const jarHitboxRef = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);
  const timeRef = useRef(0);
  const bossRef = useRef<HTMLImageElement>(null);

  // Inicijalizacija i Intro
  useEffect(() => {
    if (!isActive) return;
    setPhase('intro');
    setScore(0);
    setKnifeState('idle');
    setWaypoints(PATTERNS[0].map(p => ({ ...p, cleared: false })));

    const introTimer = setTimeout(() => {
      setPhase('playing');
    }, 4000); // 4 sekunde intro teksta

    return () => clearTimeout(introTimer);
  }, [isActive]);

  // Main Game Loop (Fizika miša i kretanje bossa)
  useEffect(() => {
    if (phase !== 'playing') return;

    let animationId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (knifeState !== 'idle' && knifeRef.current) {
        // Prati miš
        knifeRef.current.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;

        // Logika umakanja u eurokrem
        if (jarHitboxRef.current) {
          const jarRect = jarHitboxRef.current.getBoundingClientRect();
          if (
            e.clientX > jarRect.left && e.clientX < jarRect.right &&
            e.clientY > jarRect.top && e.clientY < jarRect.bottom
          ) {
            setKnifeState('full');
          }
        }
      }
    };

    const handleMouseDown = () => isMouseDown.current = true;
    const handleMouseUp = () => isMouseDown.current = false;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Kretanje bossa u Infinity (8) obliku
    const updateBoss = () => {
      timeRef.current += 0.02;
      if (bossRef.current) {
        const A = 300; // Širina kretanja
        const B = 150; // Visina kretanja
        // Lissajous curve formata za infinity
        const x = Math.sin(timeRef.current) * A;
        const y = Math.sin(timeRef.current * 2) * B;
        bossRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
      animationId = requestAnimationFrame(updateBoss);
    };
    updateBoss();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationId);
    };
  }, [phase, knifeState]);

  // Logika mazanja (prelazak preko waypointova sa nožem punim eurokrema)
  const handleWaypointHover = (index: number) => {
    if (knifeState === 'full' && isMouseDown.current) {
      setWaypoints(prev => {
        const next = [...prev];
        next[index].cleared = true;
        
        // Provjeri je li cijeli pattern obrisan
        if (next.every(wp => wp.cleared)) {
          handlePatternComplete();
        }
        return next;
      });
    }
  };

  const handlePatternComplete = () => {
    setKnifeState('empty'); // Mora ponovo u teglu
    setScore(prev => {
      const newScore = prev + 1;
      if (newScore >= 5) {
        triggerVictory();
      } else {
        // Učitaj sljedeći pattern
        setWaypoints(PATTERNS[newScore].map(p => ({ ...p, cleared: false })));
      }
      return newScore;
    });
  };

  const triggerVictory = () => {
    setPhase('exploding');
    setTimeout(() => {
      setPhase('victory');
      awardTrophy();
    }, 2500); // Eksplozija traje 2.5s
  };

  const awardTrophy = async () => {
    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const trophyData = {
          id: 'amar_palacinka',
          title: 'Master Palacinker 🥞',
          description: 'Uspješno namazano 5 palačinki i pobijeđen Amar Boss!',
          unlockedAt: new Date().toISOString()
        };
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const existing = snap.data().trophies || [];
          if (!existing.some((t: any) => t.id === 'amar_palacinka')) {
            await updateDoc(userRef, { trophies: arrayUnion(trophyData) });
          }
        }
      } catch (err) {
        console.error('Greška pri spremanju trofeja:', err);
      }
    }
    localStorage.setItem('amar_palacinka_trophy_unlocked', 'true');
    if (onBossDefeated) onBossDefeated();
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden bg-black select-none pointer-events-auto">
      
      {/* INTRO: Potajni tekst koji se pojavi pa nestane */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center z-50 bg-black"
          >
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 0.8, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 3 }}
              className="text-white text-3xl md:text-5xl font-black uppercase tracking-widest text-center px-4 opacity-50"
            >
              Misliš da znaš mazati palačinke?
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GAME UI */}
      {(phase === 'playing' || phase === 'exploding') && (
        <>
          {/* BOSS (Infinity Loop kretanje) */}
          <div className="absolute top-1/2 left-1/2 z-10 pointer-events-none">
            <img 
              ref={bossRef}
              src={AMAR_IMAGE_SRC} 
              alt="Boss" 
              className={`w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all ${
                phase === 'exploding' ? 'animate-ping brightness-200' : ''
              }`}
            />
            {/* Eksplozivne zrake za kraj */}
            {phase === 'exploding' && (
              <div className="absolute inset-0 animate-spin flex items-center justify-center">
                <div className="w-[1000px] h-[10px] bg-white absolute rotate-0 shadow-[0_0_20px_white]"></div>
                <div className="w-[1000px] h-[10px] bg-white absolute rotate-45 shadow-[0_0_20px_white]"></div>
                <div className="w-[1000px] h-[10px] bg-white absolute rotate-90 shadow-[0_0_20px_white]"></div>
                <div className="w-[1000px] h-[10px] bg-white absolute -rotate-45 shadow-[0_0_20px_white]"></div>
              </div>
            )}
          </div>

          {/* PALACINKA (Sredina) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-amber-600 bg-amber-200/20 flex items-center justify-center shadow-2xl overflow-hidden">
              <img src={PALACINKA_SRC} alt="Palačinka" className="absolute inset-0 w-full h-full object-cover opacity-80" />
              
              {/* Pattern points (Isprekidane linije/tačke za mazanje) */}
              <div className="relative w-full h-full">
                {waypoints.map((wp, i) => (
                  <div 
                    key={i}
                    onMouseEnter={() => handleWaypointHover(i)}
                    className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 transition-colors duration-200 ${
                      wp.cleared ? 'bg-[#4a2e15] border-[#38220f]' : 'bg-white/20 border-white border-dashed animate-pulse'
                    }`}
                    style={{ left: `calc(50% + ${wp.x * 2}px)`, top: `calc(50% + ${wp.y * 2}px)` }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-white font-mono font-bold bg-black/50 px-3 py-1 rounded">
              Namazi: {score}/5
            </div>
          </div>

          {/* TEGLA EUROKREMA (Desno od palačinke) */}
          <div className="absolute top-1/2 left-1/2 translate-x-[180px] md:translate-x-[250px] -translate-y-1/2 z-20">
            <div className="relative w-24 h-32 bg-zinc-900 border-2 border-amber-700 rounded-2xl flex flex-col items-center justify-end overflow-hidden shadow-2xl">
              <img src={EUROKREM_SRC} alt="Eurokrem" className="absolute inset-0 w-full h-full object-cover" />
              {/* Gornji dio tegle (Hitbox za umakanje) */}
              <div 
                ref={jarHitboxRef}
                className="absolute top-0 left-0 right-0 h-10 bg-black/40 border-b-2 border-amber-500 rounded-t-xl"
              />
              <div className="relative z-10 bg-white px-2 py-1 mb-4 rounded font-black text-amber-900 text-[10px]">
                UMOCI OVDJE
              </div>
            </div>
          </div>

          {/* NOŽ */}
          {knifeState === 'idle' ? (
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-[200px] -translate-y-1/2 z-30 cursor-grab hover:scale-110 transition-transform"
              onMouseDown={() => setKnifeState('empty')}
            >
              <img src={NOZ_SRC} alt="Nož" className="w-12 h-32 object-contain drop-shadow-[0_0_15px_white]" />
              <p className="text-white text-[10px] font-bold mt-2 text-center animate-bounce">KLIKNI NOŽ</p>
            </div>
          ) : (
            <div 
              ref={knifeRef}
              className="fixed top-0 left-0 z-[10000] pointer-events-none"
            >
              <div className="relative">
                <img src={NOZ_SRC} alt="Nož" className="w-12 h-32 object-contain" />
                {/* Smeđi vrh noža kada je pun */}
                {knifeState === 'full' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-12 bg-[#4a2e15] rounded-t-full rounded-b-xl opacity-90 blur-[1px]" />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* BIJELI FADE OUT NAKON EKSPLOZIJE */}
      <AnimatePresence>
        {phase === 'exploding' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1.5 }}
            className="absolute inset-0 bg-white z-[100000] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* VICTORY SCREEN (Nema bossa, samo bijeli ekran i trofej) */}
      <AnimatePresence>
        {phase === 'victory' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white z-[100001] flex flex-col items-center justify-center pointer-events-auto p-6"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="text-center cursor-pointer group"
              onClick={onCloseRequested}
            >
              <div className="relative w-48 h-48 rounded-full bg-amber-100 border-8 border-amber-400 flex items-center justify-center mx-auto shadow-[0_0_100px_rgba(251,191,36,0.6)] group-hover:scale-105 transition-transform">
                <Trophy size={96} className="text-amber-500 drop-shadow-xl" />
              </div>
              <h2 className="text-4xl font-black uppercase text-amber-500 tracking-tighter mt-8">
                POBIJEDIO SI!
              </h2>
              <p className="text-zinc-500 font-bold mt-2 max-w-sm mx-auto">
                Amar je poražen. Tvoja vještina mazanja je besprijekorna. Klikni ovdje za povratak.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}