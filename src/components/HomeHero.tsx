"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

const navLinks = [
  { label: "灵感库", href: "/inspiration" },
  { label: "资料库", href: "/library" },
  { label: "进度看板", href: "/progress" },
  { label: "团队", href: "/team" },
];

const thumbs = ["/showcase/thumb-1.jpg", "/showcase/thumb-2.jpg", "/showcase/thumb-3.jpg", "/showcase/thumb-4.jpg"];

const slides = [
  {
    bg: "/showcase/hero-main.jpg",
    poster: "/showcase/poster-side.jpg",
    vertical: "影像笔记",
    category: "精选 · FEATURED",
    title: "Ep.13『选题调研』",
    desc: "围绕海外热门话题展开调研，筛选出三个候选选题方向。",
    posterLabel: "下一步",
    posterSub: "下集开场分镜预览",
  },
  {
    bg: "/showcase/hero-2.jpg",
    poster: "/showcase/poster-side-2.jpg",
    vertical: "幕后纪实",
    category: "幕后 · 制作花絮",
    title: "Ep.12『拍摄现场』",
    desc: "外景拍摄两小时 + 棚内补拍，专注光线与节奏的把控。",
    posterLabel: "拍摄花絮",
    posterSub: "现场花絮抓拍",
  },
  {
    bg: "/showcase/hero-3.jpg",
    poster: "/showcase/poster-side-3.jpg",
    vertical: "工作室手记",
    category: "关于 · NEKKO",
    title: "「做值得被看见的内容」",
    desc: "两个人的小工作室，专注灵感、节奏与品质的坚持。",
    posterLabel: "工作室理念",
    posterSub: "Nekko 的创作哲学",
  },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" | "down" | "up" }) {
  const rotate = { left: "rotate-0", right: "rotate-180", down: "-rotate-90", up: "rotate-90" }[dir];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={`h-4 w-4 ${rotate}`}>
      <path d="M14.5 6 8 12l6.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export default function HomeHero() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [playing]);

  const slide = slides[active];

  function go(delta: 1 | -1) {
    setActive((a) => (a + delta + slides.length) % slides.length);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: easeOut }}
      className="rounded-3xl overflow-hidden border border-line bg-card shadow-xl"
    >
      {/* Top nav */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-6 border-b border-line">
        <span className="text-xl sm:text-2xl font-bold tracking-[0.15em] text-ink">NEKKO</span>
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[12px] tracking-[0.15em] text-ink-soft hover:text-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/checkin"
          aria-label="check-in"
          className="h-9 w-9 flex items-center justify-center rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent/50 transition-colors"
        >
          <SearchIcon />
        </Link>
      </header>

      {/* Hero carousel */}
      <section className="relative px-6 sm:px-10 py-10 sm:py-16">
        {/* glow blobs */}
        <div className="pointer-events-none absolute top-10 left-1/4 h-[320px] w-[320px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-1/5 h-[300px] w-[300px] rounded-full bg-blue-600/15 blur-[120px]" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[140px_1fr_260px] gap-6 items-stretch">
          {/* left: thumbnails + vertical title */}
          <div className="hidden lg:flex flex-col items-center justify-between">
            <div className="grid grid-cols-2 gap-2">
              {thumbs.map((src) => (
                <div
                  key={src}
                  className="relative h-14 w-14 rounded-lg overflow-hidden border border-line"
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.vertical}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: easeOut }}
                className="mt-6 text-[13px] tracking-[0.4em] text-accent [writing-mode:vertical-rl]"
              >
                {slide.vertical}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* center: main player */}
          <div className="relative rounded-2xl overflow-hidden border border-line shadow-[0_0_90px_rgba(34,211,238,0.15)]">
            <div className="pt-[56.25%]" />
            <AnimatePresence mode="sync">
              <motion.div
                key={slide.bg}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: easeOut }}
                className="absolute inset-0"
              >
                <Image src={slide.bg} alt="" fill className="object-cover" sizes="(min-width: 1024px) 700px, 100vw" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-paper/90 via-paper/15 to-transparent" />
              </motion.div>
            </AnimatePresence>

            {/* play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                aria-label="play"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-ink/30 bg-ink/10 backdrop-blur flex items-center justify-center hover:scale-105 hover:border-accent/70 transition-transform"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7 ml-1 text-ink">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              </button>
            </div>

            {/* arrows */}
            <button
              aria-label="prev"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-line bg-paper/50 text-ink-soft hover:text-accent hover:border-accent/50 flex items-center justify-center transition-colors"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              aria-label="next"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-line bg-paper/50 text-ink-soft hover:text-accent hover:border-accent/50 flex items-center justify-center transition-colors"
            >
              <ChevronIcon dir="right" />
            </button>

            {/* text overlay */}
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: easeOut, delay: 0.15 }}
                className="absolute bottom-6 left-6 right-6 sm:right-24"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-accent">
                  {slide.category}
                </p>
                <h2 className="text-xl sm:text-3xl font-medium mt-2 leading-snug text-ink">
                  {slide.title}
                </h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-1.5 max-w-md leading-relaxed">
                  {slide.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* right: secondary poster */}
          <div className="hidden lg:block relative rounded-2xl overflow-hidden border border-line">
            <AnimatePresence mode="sync">
              <motion.div
                key={slide.poster}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: easeOut }}
                className="absolute inset-0"
              >
                <Image src={slide.poster} alt="" fill className="object-cover" sizes="260px" />
                <div className="absolute inset-0 bg-gradient-to-t from-paper/90 via-paper/10 to-transparent" />
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
                {slide.posterLabel}
              </p>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{slide.posterSub}</p>
            </div>
          </div>
        </div>

        {/* pagination */}
        <div className="relative flex items-center justify-center gap-4 mt-8">
          <button
            aria-label={playing ? "pause" : "play"}
            onClick={() => setPlaying((p) => !p)}
            className="h-8 w-8 rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent/50 flex items-center justify-center transition-colors"
          >
            <PlayPauseIcon playing={playing} />
          </button>
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.bg}
                aria-label={`slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-6 bg-accent" : "w-1.5 bg-ink-soft/30 hover:bg-ink-soft/50"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Lower section: latest update */}
      <section className="bg-paper-soft px-6 sm:px-10 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-8 items-start">
          <p className="flex items-center gap-2 text-sm font-medium text-ink tracking-wide">
            最新动态
            <ChevronIcon dir="down" />
          </p>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent mb-2">
              本周更新
            </p>
            <h3 className="text-base sm:text-lg font-medium mb-2 text-ink">
              Ep.12 成片初剪完成，进入二审反馈阶段
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed max-w-xl">
              已套用新的调色 LUT 并分享了测试版本，将根据反馈在本周内完成调整。
            </p>
          </div>
          <div className="flex md:flex-col items-center md:items-end gap-4 justify-between md:justify-start">
            <Link
              href="/progress"
              className="text-[11px] uppercase tracking-[0.2em] text-accent whitespace-nowrap"
            >
              查看进度 →
            </Link>
            <button
              aria-label="back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="h-10 w-10 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-accent hover:border-accent/50 transition-colors"
            >
              <ChevronIcon dir="up" />
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
