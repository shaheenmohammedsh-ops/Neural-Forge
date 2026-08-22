import { useState, useEffect, useCallback } from 'react';
import LandingNeuralVisualization from '../components/LandingNeuralVisualization';

interface LandingScreenProps {
  onStart: () => void;
}

const FEATURES = [
  { icon: '🎯', title: '4 Missions', sub: 'Data to deployment' },
  { icon: '⏱', title: '3 Minutes', sub: 'per mission' },
  { icon: '⚡', title: 'Limited Energy', sub: 'spend it wisely' },
  { icon: '🧠', title: '90% Target', sub: 'accuracy goal' },
];

function LandingScreen({ onStart }: LandingScreenProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = useCallback(() => {
    const playClickSound = (window as any).playClickSound;
    if (playClickSound) playClickSound();
    onStart();
  }, [onStart]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-6 pb-10 flex flex-col flex-1">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] shadow-[0_0_18px_rgba(14,165,233,0.4)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white tracking-tight">Neural Shield</p>
              <p className="text-[10px] text-gray-500 tracking-wide uppercase">AI Learning Simulator</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-gray-700/60 bg-gray-900/50 px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" style={{ boxShadow: '0 0 6px #10b981' }} />
            <span className="text-[10px] font-medium text-gray-400 tracking-wider">SYSTEMS ONLINE</span>
          </div>
        </header>

        {/* Hero grid */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center flex-1">
          {/* Left: brand + content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <div className={`transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" style={{ boxShadow: '0 0 8px #38bdf8' }} />
                <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[#38bdf8]">
                  Neural Shield · AI Training Simulator
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-semibold text-white mb-3 tracking-tight">
                AI BRAIN <span className="text-gradient-cyan">LAB</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Four missions. One neural network. Make the right AI decisions before
                your resources run out.
              </p>
            </div>

            {/* Feature chips */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8 transition-all duration-500 ease-out ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: '120ms' }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2.5 text-left"
                >
                  <div className="text-base leading-none mb-1.5">{f.icon}</div>
                  <p className="text-xs font-semibold text-white">{f.title}</p>
                  <p className="text-[9px] text-gray-500 leading-tight">{f.sub}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div
              className={`flex flex-wrap items-center gap-4 justify-center lg:justify-start transition-all duration-500 ease-out ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: '220ms' }}
            >
              <button
                onClick={handleStart}
                onMouseEnter={() => setButtonHovered(true)}
                onMouseLeave={() => setButtonHovered(false)}
                className="group relative px-10 py-4 bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] text-white font-medium rounded-xl transition-all duration-150 hover:scale-[1.03] active:scale-95 flex items-center gap-2.5"
                style={{
                  boxShadow: buttonHovered ? '0 0 34px rgba(14,165,233,0.5)' : '0 4px 20px rgba(14,165,233,0.25)',
                }}
              >
                <span className="relative z-10 text-lg">Begin Campaign</span>
                <svg
                  className={`relative z-10 w-5 h-5 transition-transform duration-150 ${buttonHovered ? 'translate-x-1' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] opacity-0 group-hover:opacity-100 transition-opacity duration-150 blur-lg" />
              </button>

              <p className="text-xs text-gray-500 max-w-[180px]">
                Choose a mode and pick any of the 4 missions — no unlocks needed.
              </p>
            </div>
          </div>

          {/* Right: interactive AI visualization */}
          <div
            className={`order-1 lg:order-2 transition-all duration-700 ease-out ${
              isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
            style={{ transitionDelay: '160ms' }}
          >
            <div className="relative">
              <div className="relative p-6 sm:p-8 rounded-2xl bg-[#111827]/40 border border-[#0ea5e9]/10 backdrop-blur-sm">
                {/* Card header */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gray-400">
                    Neural Activity
                  </p>
                  <span className="flex items-center gap-1.5 text-[9px] text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    live
                  </span>
                </div>

                <div className="rounded-lg overflow-hidden bg-[#0a0e1a]/60">
                  <LandingNeuralVisualization />
                </div>

                {/* Corner brackets */}
                <div className="pointer-events-none absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-[#0ea5e9]/30 rounded-tl-lg" />
                <div className="pointer-events-none absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-[#0ea5e9]/30 rounded-tr-lg" />
                <div className="pointer-events-none absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-[#0ea5e9]/30 rounded-bl-lg" />
                <div className="pointer-events-none absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-[#0ea5e9]/30 rounded-br-lg" />
              </div>

              {/* Floating stat pills */}
              <div className="absolute -top-3 -right-2 sm:-right-4 px-3 py-1.5 rounded-lg border border-[#10b981]/40 bg-[#0a0e1a]/90 text-center shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Target</p>
                <p className="text-sm font-semibold text-[#10b981]">90%</p>
              </div>
              <div className="absolute -bottom-3 -left-2 sm:-left-4 px-3 py-1.5 rounded-lg border border-[#7c3aed]/40 bg-[#0a0e1a]/90 text-center shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Problems</p>
                <p className="text-sm font-semibold text-[#a78bfa]">7</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-2 text-[10px] text-gray-600 tracking-wide">
          <span>Neural Network Training Simulation · 4-Mission Campaign</span>
          <span className="hidden sm:inline text-gray-700">·</span>
          <span>AI Brain Lab Research Series</span>
        </footer>
      </div>
    </div>
  );
}

export default LandingScreen;
