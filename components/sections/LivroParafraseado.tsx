"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TransitionEvent,
} from "react";

const INSTAGRAM_URL = "https://www.instagram.com/livroparafraseado/";

const PUBLICATIONS = [
  {
    src: "/images/livro-parafraseado/seneca.png",
    alt: "Publicação do Livro Parafraseado com frase de Sêneca",
    width: 1024,
    height: 1024,
  },
  {
    src: "/images/livro-parafraseado/sri-prem-baba.png",
    alt: "Publicação do Livro Parafraseado com frase de Sri Prem Baba",
    width: 1080,
    height: 1080,
  },
  {
    src: "/images/livro-parafraseado/inteligencia-espiritual.png",
    alt: "Publicação do Livro Parafraseado com frase de Inteligência Espiritual",
    width: 847,
    height: 835,
  },
  {
    src: "/images/livro-parafraseado/homem-mais-rico-da-babilonia.png",
    alt: "Publicação do Livro Parafraseado com frase de O Homem Mais Rico da Babilônia",
    width: 847,
    height: 843,
  },
] as const;

const INITIAL_INDEX = 1;
const TRANSITION_MS = 520;
const ITEM_COUNT = PUBLICATIONS.length;

const TRACK_SLIDES = [
  { ...PUBLICATIONS[ITEM_COUNT - 1], key: "clone-last" },
  ...PUBLICATIONS.map((publication, index) => ({
    ...publication,
    key: `item-${index}`,
  })),
  { ...PUBLICATIONS[0], key: "clone-first" },
];

const controlClassName =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-sans text-xl leading-none text-ink appearance-none focus-visible:outline-none focus-visible:underline";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wrapIndex(index: number) {
  return ((index % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT;
}

function logicalIndexFromTrack(trackIndex: number) {
  if (trackIndex === 0) {
    return ITEM_COUNT - 1;
  }

  if (trackIndex === ITEM_COUNT + 1) {
    return 0;
  }

  return trackIndex - 1;
}

export default function LivroParafraseado() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(INITIAL_INDEX);
  const animatingRef = useRef(false);
  const pendingJumpRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(INITIAL_INDEX);
  const [trackIndex, setTrackIndex] = useState(INITIAL_INDEX + 1);
  const [withTransition, setWithTransition] = useState(false);
  const [metrics, setMetrics] = useState({ slide: 0, gap: 0, viewport: 0 });

  activeIndexRef.current = activeIndex;

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const slide = track?.querySelector<HTMLElement>("[data-slide]");

    if (!viewport || !track || !slide) {
      return;
    }

    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;

    setMetrics({
      slide: slide.getBoundingClientRect().width,
      gap,
      viewport: viewport.clientWidth,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    if (!withTransition) {
      animatingRef.current = false;
    }
  }, [trackIndex, withTransition]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(viewport);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const goTo = useCallback((index: number) => {
    if (animatingRef.current) {
      return;
    }

    const from = activeIndexRef.current;
    const to = wrapIndex(index);

    if (to === from) {
      return;
    }

    let nextTrack = to + 1;

    if (from === ITEM_COUNT - 1 && to === 0) {
      nextTrack = ITEM_COUNT + 1;
    } else if (from === 0 && to === ITEM_COUNT - 1) {
      nextTrack = 0;
    }

    setActiveIndex(to);
    activeIndexRef.current = to;

    if (prefersReducedMotion()) {
      pendingJumpRef.current = null;
      setWithTransition(false);
      setTrackIndex(to + 1);
      return;
    }

    animatingRef.current = true;
    pendingJumpRef.current = nextTrack === to + 1 ? null : to + 1;
    setWithTransition(true);
    setTrackIndex(nextTrack);
  }, []);

  const goNext = useCallback(() => {
    goTo(activeIndexRef.current + 1);
  }, [goTo]);

  const goPrevious = useCallback(() => {
    goTo(activeIndexRef.current - 1);
  }, [goTo]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") {
      return;
    }

    const jumpTo = pendingJumpRef.current;

    if (jumpTo !== null) {
      pendingJumpRef.current = null;
      setWithTransition(false);
      setTrackIndex(jumpTo);
      return;
    }

    animatingRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    }
  };

  const translateX =
    metrics.viewport === 0 || metrics.slide === 0
      ? 0
      : metrics.viewport / 2 -
        (trackIndex * (metrics.slide + metrics.gap) + metrics.slide / 2);

  return (
    <section
      id="reflexoes"
      aria-labelledby="livro-parafraseado-heading"
      className="overflow-x-clip border-t border-rule bg-paper-strong"
    >
      <div className="mx-auto max-w-[90rem] px-6 py-16 md:px-8 md:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
          <div className="lg:col-span-6">
            <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
              Reflexões
            </p>
            <h2
              id="livro-parafraseado-heading"
              className="mt-5 font-display text-[2.5rem] leading-[0.95] tracking-tight text-ink md:mt-6 md:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem]"
            >
              <span className="block">Livro</span>
              <span className="block">Parafraseado</span>
            </h2>
          </div>

          <div className="mt-8 max-w-[28rem] lg:col-span-5 lg:col-start-8 lg:mt-0">
            <p className="font-display text-xl leading-snug text-ink italic md:text-2xl">
              Livros deixam frases.
              <br />
              Algumas ficam.
            </p>
            <p className="mt-6 font-sans text-base leading-relaxed text-ink-soft md:mt-8 md:text-lg">
              Leituras, ideias e passagens que atravessam diferentes autores,
              épocas e formas de pensar.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-11 items-center font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline md:mt-10 md:text-base"
            >
              Acompanhar no Instagram →
            </a>
          </div>
        </div>

        <div
          className="mt-10 md:mt-12 lg:mt-14"
          role="region"
          aria-roledescription="carrossel"
          aria-label="Publicações do Livro Parafraseado"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div ref={viewportRef} className="overflow-hidden">
            <div
              ref={trackRef}
              className="flex w-full gap-5 md:gap-6 lg:gap-8"
              style={{
                transform: `translate3d(${translateX}px, 0, 0)`,
                transition: withTransition
                  ? `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                  : "none",
                visibility: metrics.slide ? "visible" : "hidden",
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {TRACK_SLIDES.map((publication, index) => {
                const logicalIndex = logicalIndexFromTrack(index);
                const isActive = logicalIndex === activeIndex;

                return (
                  <figure
                    key={publication.key}
                    data-slide={index}
                    aria-hidden={!isActive}
                    className="w-[76%] shrink-0 md:w-[56%] lg:w-[22rem] xl:w-[24rem]"
                  >
                    <div
                      className={`origin-center motion-safe:transition-[transform,opacity] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isActive
                          ? "scale-100 opacity-100"
                          : "scale-[0.82] opacity-35"
                      }`}
                    >
                      <Image
                        src={publication.src}
                        alt={isActive ? publication.alt : ""}
                        width={publication.width}
                        height={publication.height}
                        draggable={false}
                        sizes="(min-width: 1280px) 24rem, (min-width: 1024px) 22rem, (min-width: 768px) 56vw, 76vw"
                        className="h-auto w-full object-contain"
                        onLoad={measure}
                      />
                    </div>
                  </figure>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 md:mt-8 md:gap-8">
            <button
              type="button"
              className={controlClassName}
              aria-label="Publicação anterior"
              onClick={goPrevious}
            >
              ←
            </button>

            <div
              className="flex items-center gap-1.5"
              role="tablist"
              aria-label="Selecionar publicação"
            >
              {PUBLICATIONS.map((publication, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={publication.src}
                    type="button"
                    role="tab"
                    aria-label={`Ir para publicação ${index + 1} de ${ITEM_COUNT}`}
                    aria-current={isActive ? "true" : undefined}
                    aria-selected={isActive}
                    className="inline-flex min-h-11 min-w-7 cursor-pointer items-center justify-center border-0 bg-transparent p-0 appearance-none focus-visible:outline-none"
                    onClick={() => goTo(index)}
                  >
                    <span
                      className={`block h-1.5 w-1.5 rounded-full motion-safe:transition-[transform,background-color,opacity] motion-safe:duration-300 ${
                        isActive
                          ? "scale-125 bg-ink"
                          : "bg-ink/25 hover:bg-ink/45"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={controlClassName}
              aria-label="Próxima publicação"
              onClick={goNext}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
