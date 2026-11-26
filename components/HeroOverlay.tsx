"use client";

import { motion } from "framer-motion";
import { ArrowRight, Layers, MousePointerClick, Sparkles } from "lucide-react";

interface HeroOverlayProps {
  onBegin: () => void;
}

const HIGHLIGHTS = [
  {
    icon: MousePointerClick,
    title: "Click real user actions",
    desc: "Sign up, create a habit, check off a task for XP, log a reflection, or ship an update to the cloud.",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  {
    icon: Sparkles,
    title: "Watch the system come alive",
    desc: "See animated data flow across every server and database in real time across an open, spacious canvas.",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Layers,
    title: "Plain English + Tech depth",
    desc: "Written clearly for founders and recruiters first, with one-click SQL, JWT, and real repo schemas for engineers.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
];

export function HeroOverlay({ onBegin }: HeroOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.99, filter: "blur(6px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090F] overflow-y-auto px-6 py-12"
    >
      {/* Subtle spacious background */}
      <div className="pointer-events-none fixed inset-0 bg-playground-dots opacity-80" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_65%_45%_at_50%_0%,rgba(56,189,248,0.11),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
        {/* Simple top pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-300 mb-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Ascend"
            className="h-3.5 w-3 object-contain"
          />
          Interactive Architecture Playground · Runs 100% in your browser
        </motion.div>

        {/* Clean, simple heading */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.1]"
        >
          How <span className="text-sky-400">Ascend</span> works
          <br />
          under the hood.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mt-5 max-w-xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed font-normal"
        >
          An interactive visual tour of my full-stack habit platform — no login,
          no setup, and no coding background required.
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={onBegin}
            className="group inline-flex items-center gap-3 rounded-2xl bg-white text-zinc-950 px-8 py-4 text-base font-semibold shadow-[0_0_50px_rgba(56,189,248,0.22)] hover:bg-zinc-100 hover:shadow-[0_0_60px_rgba(56,189,248,0.35)] active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Begin Virtualization of Ascend</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          <span className="text-xs text-zinc-500">
            Instant browser simulation · Powered by localStorage
          </span>
        </motion.div>

        {/* 3 Clean, Spacious Value Cards */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left"
        >
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.08] bg-[#0D1018]/90 p-5"
              >
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border mb-3.5 ${item.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
