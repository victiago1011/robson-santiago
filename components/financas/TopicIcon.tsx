import { topicSymbol } from "@/lib/panorama/daily-editions";

export default function TopicIcon({ name, size = "large" }: { name: string; size?: "small" | "large" }) {
  const normalized = name.trim().toLocaleLowerCase("pt-BR");
  const small = size === "small";

  if (normalized.includes("brasil")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 34" className={small ? "inline-block h-[19px] w-[27px] shrink-0 rounded-[3px]" : "h-[38px] w-[52px] shrink-0 rounded-[5px] shadow-sm"}>
        <rect width="48" height="34" rx="3" fill="#159447" />
        <path d="M24 3.5 45 17 24 30.5 3 17Z" fill="#FFDA44" />
        <circle cx="24" cy="17" r="10.25" fill="#174A9B" />
        <path d="M14 14.5c6.1-.9 13.3 1.1 19.1 4" fill="none" stroke="#FFF" strokeWidth="2.5" />
        <g fill="#FFF">
          <circle cx="20.1" cy="12" r=".7" /><circle cx="25.4" cy="11.1" r=".7" />
          <circle cx="29.4" cy="13" r=".6" /><circle cx="24.8" cy="21.5" r=".65" />
          <circle cx="19.5" cy="23" r=".55" /><circle cx="30.5" cy="21.4" r=".55" />
        </g>
      </svg>
    );
  }

  if (normalized.includes("santa catarina") || normalized === "sc") {
    return (
      <span aria-hidden="true"
        className={"inline-flex shrink-0 items-center justify-center rounded-lg border border-[#c8d7e5] bg-[#e5eef6] font-extrabold tracking-[-0.04em] text-[#205574] "
          + (small ? "h-[24px] w-[30px] text-[0.66rem]" : "h-11 w-12 text-base")}>
        SC
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={small ? "inline-block text-lg leading-none" : "inline-block text-4xl leading-none"}>
      {topicSymbol(name)}
    </span>
  );
}
