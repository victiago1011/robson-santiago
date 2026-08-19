const SPOTIFY_SHOW_URL =
  "https://open.spotify.com/show/0345vDsMQZUpTTVBB803fr?si=60238794474b4121";

const WAVEFORM = [
  22, 14, 36, 18, 8, 44, 28, 52, 16, 64, 40, 12, 30, 48, 20, 8, 56, 34, 18, 42,
  10, 26, 60, 38, 14, 46, 22, 8, 32, 54, 16, 28, 12, 40, 24, 58, 18, 10, 36, 20,
] as const;

export default function VezPodcast() {
  return (
    <section aria-labelledby="vez-heading" className="bg-ink">
      <div className="mx-auto grid max-w-[90rem] px-6 py-16 md:px-8 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:px-12 lg:py-32 xl:px-16">
        <div className="text-center md:text-left lg:col-span-7">
          <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-rule uppercase">
            Podcast
          </p>
          <h2
            id="vez-heading"
            className="mt-6 font-display text-[4.5rem] leading-[0.9] tracking-tight text-paper-strong md:mt-8 md:text-[6.5rem] lg:text-[8rem] xl:text-[9rem]"
          >
            VEZ
          </h2>
          <p className="mt-4 max-w-md font-display text-lg leading-snug text-paper/80 italic md:mt-5 md:text-xl">
            Vida em Equilíbrio do Zero
          </p>
        </div>

        <div className="mt-10 lg:col-span-4 lg:col-start-9 lg:mt-0">
          <div
            aria-hidden="true"
            className="flex h-14 w-full items-end justify-between md:h-20 lg:h-24"
          >
            {WAVEFORM.map((height, index) => (
              <span
                key={index}
                className="w-px bg-rule/80"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <p className="mt-8 max-w-[32rem] font-sans text-base leading-relaxed text-paper/70 md:mt-10 md:text-lg">
            Uma conversa com o Tempo.
          </p>

          <a
            href={SPOTIFY_SHOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-11 items-center font-sans text-sm text-paper-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline md:mt-10 md:text-base"
          >
            Ouvir no Spotify →
          </a>
        </div>
      </div>
    </section>
  );
}
