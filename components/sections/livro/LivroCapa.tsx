import Image from "next/image";

type LivroCapaProps = {
  sizes: string;
  preload?: boolean;
  glow?: boolean;
  className?: string;
};

export default function LivroCapa({
  sizes,
  preload = false,
  glow = false,
  className,
}: LivroCapaProps) {
  return (
    <figure className={`relative ${className ?? ""}`}>
      {glow ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[72%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a4a5c]/40 blur-3xl"
        />
      ) : null}
      <Image
        src="/images/books/a-vida-e-um-dia.png"
        alt="Capa do livro A Vida é um Dia, de Robson Santiago"
        width={794}
        height={1285}
        sizes={sizes}
        preload={preload}
        className="relative z-10 h-auto w-full object-contain"
      />
    </figure>
  );
}
