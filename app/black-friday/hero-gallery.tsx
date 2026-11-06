'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import styles from './black-friday.module.css';

export type HeroSlide = {
  src: string;
  alt: string;
  label: string;
  caption: string;
};

type VideoConfig = {
  src: string;
  poster: string;
  title: string;
  durationSeconds?: number;
};

type Props = {
  slides: HeroSlide[];
  video: VideoConfig;
  tag?: ReactNode;
};

const AUTOPLAY_MS = 5000;
const SWIPE_PX = 40;

function formatVideoDuration(seconds?: number) {
  if (seconds == null || Number.isNaN(seconds)) return '';
  if (seconds >= 60) return `≈ ${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds)} seg`;
}

export default function HeroGallery({ slides, video, tag }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchX = useRef<number | null>(null);
  const total = slides.length;

  const go = useCallback((next: number) => setIndex((next + total) % total), [total]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || total < 2) return;
    const id = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reducedMotion, total, go]);

  const openVideo = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setPaused(true);
    dialog.showModal();
    const el = videoRef.current;
    if (el) {
      el.muted = true;
      void el.play().catch(() => {});
    }
  };

  const closeVideo = () => dialogRef.current?.close();

  const onDialogClose = () => {
    videoRef.current?.pause();
    setPaused(false);
  };

  const current = slides[index];

  return (
    <figure
      className={styles.heroVisual}
      aria-roledescription="carrossel"
      aria-label="Fotos do kit montado"
      data-paused={paused || reducedMotion ? 'true' : 'false'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div
        className={styles.heroFrame}
        onTouchStart={(event) => {
          touchX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchX.current === null) return;
          const delta = event.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(delta) > SWIPE_PX) go(index + (delta < 0 ? 1 : -1));
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={styles.heroSlide}
            data-active={i === index ? 'true' : 'false'}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 900px) 100vw, 55vw"
              className={styles.heroImage}
            />
          </div>
        ))}

        <button
          type="button"
          className={styles.playButton}
          onClick={openVideo}
          aria-haspopup="dialog"
          aria-label={
            video.durationSeconds != null
              ? `Abrir vídeo sem som, cerca de ${formatVideoDuration(video.durationSeconds)}`
              : 'Abrir vídeo sem som'
          }
        >
          <span className={styles.playIcon} aria-hidden="true">
            <Play size={20} fill="currentColor" />
          </span>
          <span>
            {video.durationSeconds != null && <small>{formatVideoDuration(video.durationSeconds)} · sem áudio</small>}
            {video.durationSeconds == null && <small>Sem áudio</small>}
            Ver vídeo
          </span>
        </button>

        <p className={styles.slideCaption} aria-live="polite">
          <span>{current.label}</span> {current.caption}
        </p>
      </div>

      {tag}

      <div className={styles.slideControls}>
        <button type="button" className={styles.slideArrow} onClick={() => go(index - 1)} aria-label="Foto anterior">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className={styles.slideDots}>
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              className={styles.slideDot}
              data-active={i === index ? 'true' : 'false'}
              onClick={() => go(i)}
              aria-label={`Ver foto ${i + 1}: ${slide.caption}`}
              aria-current={i === index}
            >
              <span key={i === index ? `on-${index}` : 'off'} style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />
            </button>
          ))}
        </div>
        <span className={styles.slideCount} aria-hidden="true">
          <strong>{String(index + 1).padStart(2, '0')}</strong> / {String(total).padStart(2, '0')}
        </span>
        <button type="button" className={styles.slideArrow} onClick={() => go(index + 1)} aria-label="Próxima foto">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.videoModal}
        aria-label={video.title}
        onClose={onDialogClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeVideo();
        }}
      >
        <div className={styles.videoBox}>
          <button type="button" className={styles.videoClose} onClick={closeVideo} aria-label="Fechar vídeo">
            <X size={22} aria-hidden="true" />
          </button>
          <video
            ref={videoRef}
            src={video.src}
            poster={video.poster}
            controls
            playsInline
            preload="none"
            muted
            aria-label={`${video.title}. Vídeo sem áudio.`}
          />
          <p>{video.title}</p>
        </div>
      </dialog>
    </figure>
  );
}
