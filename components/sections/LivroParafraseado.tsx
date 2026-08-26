"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

const controlClassName =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-sans text-xl leading-none text-ink appearance-none focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:opacity-25";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function LivroParafraseado() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(INITIAL_INDEX);

  const goTo = useCallback((index: number, behavior?: ScrollBehavior) => {
    const nextIndex = Math.max(0, Math.min(PUBLICATIONS.length - 1, index));
    const scroller = scrollerRef.current;
    const slide = scroller?.querySelector<HTMLElement>(
      `[data-slide="${nextIndex}"]`,
    );

    if (!scroller || !slide) {
      return;
    }

    const left = slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2;
    scroller.scrollTo({
      left,
      behavior: behavior ?? (prefersReducedMotion() ? "auto" : "smooth"),
    });
  }, []);

  useLayoutEffect(() => {
    goTo(INITIAL_INDEX, "auto");
  }, [goTo]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    let frame = 0;

    const updateActive = () => {
      const slides = [...scroller.querySelectorAll<HTMLElement>("[data-slide]")];
      const center = scroller.scrollLeft + scroller.clientWidth / 2;
      let closest = 0;
      let closestDistance = Infinity;

      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(center - slideCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = index;
        }
      });

      setActiveIndex(closest);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActive);
    };

    updateActive();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const counter = `${String(activeIndex + 1).padStart(2, "0")} / ${String(PUBLICATIONS.length).padStart(2, "0")}`;

  return (
    <section
      aria-labelledby="livro-parafraseado-heading"
      className="overflow-x-clip border-t border-rule bg-paper-strong"
    >
      <div className="mx-auto max-w-[90rem] px-6 py-16 md:px-8 md:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="lg:col-span-6">
            <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
              Projeto
            </p>
            <h2
              id="livro-parafraseado-heading"
              className="mt-6 font-display text-[2.5rem] leading-[0.95] tracking-tight text-ink md:mt-8 md:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem]"
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
          className="mt-12 md:mt-14 lg:mt-16"
          role="region"
          aria-roledescription="carrossel"
          aria-label="Publicações do Livro Parafraseado"
        >
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[7%] [scrollbar-width:none] touch-pan-x md:gap-5 md:px-[15%] lg:gap-6 lg:px-[calc(50%-15rem)] [&::-webkit-scrollbar]:hidden"
          >
            {PUBLICATIONS.map((publication, index) => {
              const isActive = index === activeIndex;

              return (
                <figure
                  key={publication.src}
                  data-slide={index}
                  aria-hidden={!isActive}
                  className="w-[86%] shrink-0 snap-center md:w-[70%] lg:w-[30rem]"
                >
                  <div
                    className={`origin-center motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:ease-out ${
                      isActive
                        ? "scale-100 opacity-100"
                        : "scale-[0.88] opacity-55 md:opacity-50"
                    }`}
                  >
                    <Image
                      src={publication.src}
                      alt={publication.alt}
                      width={publication.width}
                      height={publication.height}
                      draggable={false}
                      sizes="(min-width: 1024px) 30rem, (min-width: 768px) 70vw, 86vw"
                      className="h-auto w-full object-contain"
                    />
                  </div>
                </figure>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-8 md:mt-8">
            <button
              type="button"
              className={controlClassName}
              aria-label="Publicação anterior"
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
            >
              ←
            </button>
            <p
              className="min-w-[4.5rem] text-center font-sans text-[0.7rem] tracking-[0.18em] text-ink tabular-nums"
              aria-live="polite"
            >
              {counter}
            </p>
            <button
              type="button"
              className={controlClassName}
              aria-label="Próxima publicação"
              disabled={activeIndex === PUBLICATIONS.length - 1}
              onClick={() => goTo(activeIndex + 1)}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
