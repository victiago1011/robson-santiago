import Image from "next/image";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative bg-paper"
    >
      <div className="relative min-h-[68svh] md:min-h-[calc(100svh-4rem)] lg:grid lg:grid-cols-12">
        <figure className="relative h-[68svh] min-h-[20rem] md:h-[min(52svh,28rem)] md:min-h-[24rem] lg:col-span-8 lg:col-start-5 lg:row-start-1 lg:h-auto lg:min-h-full">
          <div className="absolute inset-0 bg-photo-placeholder">
            <Image
              src="/images/robson/robson-hero.png"
              alt="Robson Santiago"
              fill
              preload
              sizes="(min-width: 1024px) 68vw, 100vw"
              className="object-cover object-[70%_32%] md:object-[78%_30%] lg:object-[82%_center]"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent md:hidden" />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-r from-paper to-transparent lg:block" />
        </figure>

        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 md:static md:px-8 md:py-14 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-24 xl:px-16">
          <h1
            id="hero-heading"
            className="font-display text-[2.75rem] leading-[0.95] tracking-tight text-paper md:text-6xl md:text-ink lg:text-7xl xl:text-[5.5rem]"
          >
            <span className="block">Robson</span>
            <span className="block">Santiago</span>
          </h1>
          <p className="mt-6 max-w-md font-display text-lg leading-snug text-paper/85 italic md:mt-8 md:text-xl md:text-ink-soft lg:max-w-sm">
            Ideias para viver o que realmente importa.
          </p>
        </div>
      </div>
    </section>
  );
}
