'use client';

export function PokemonSideWatermarks() {
  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <LeftPokemonColumn />
      <RightPokemonColumn />
    </div>
  );
}

function LeftPokemonColumn() {
  return (
    <div className="absolute inset-y-0 left-0 hidden w-48 flex-col items-center justify-around py-20 text-slate-300/65 2xl:w-64 xl:flex dark:text-purple-400/15">
      <PikachuOutlineArt className="h-40 w-40 -rotate-12" />
      <PokeballOutlineArt className="h-28 w-28 rotate-12" />
      <TcgCardOutlineArt className="h-36 w-28 -rotate-6" />
    </div>
  );
}

function RightPokemonColumn() {
  return (
    <div className="absolute inset-y-0 right-0 hidden w-48 flex-col items-center justify-around py-20 text-slate-300/65 2xl:w-64 xl:flex dark:text-purple-400/15">
      <PokeballOutlineArt className="h-32 w-32 -rotate-12" />
      <EeveeSilhouetteOutline className="h-36 w-36 rotate-6" />
      <LightningTailOutline className="h-32 w-32 -rotate-12" />
    </div>
  );
}

function PikachuOutlineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M36 44 20 14l26 18" />
      <path d="M84 44 100 14 74 32" />
      <path d="M25 23l11-4" />
      <path d="M95 23l-11-4" />
      <path d="M36 44c14-10 34-10 48 0 9 10 12 24 9 36-3 16-16 26-33 26s-30-10-33-26c-3-12 0-26 9-36Z" />
      <circle cx="46" cy="60" r="3" />
      <circle cx="74" cy="60" r="3" />
      <path d="M58 66h4l-2 3-2-3Z" />
      <circle cx="38" cy="72" r="5.5" />
      <circle cx="82" cy="72" r="5.5" />
      <path d="M51 74c3 4 6 4 9 0 3 4 6 4 9 0" />
    </svg>
  );
}

function PokeballOutlineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="60" cy="60" r="46" />
      <path d="M14 60h32" />
      <path d="M74 60h32" />
      <circle cx="60" cy="60" r="14" />
      <circle cx="60" cy="60" r="6" />
    </svg>
  );
}

function TcgCardOutlineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 136" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="10" y="8" width="80" height="120" rx="10" />
      <rect x="18" y="16" width="64" height="104" rx="6" />
      <circle cx="50" cy="68" r="18" />
      <path d="M32 68h12" />
      <path d="M56 68h12" />
      <circle cx="50" cy="68" r="6" />
    </svg>
  );
}

function EeveeSilhouetteOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M38 46 22 14c12 4 22 12 28 24" />
      <path d="M82 46 98 14c-12 4-22 12-28 24" />
      <path d="M50 38c6-2 14-2 20 0" />
      <path d="M38 46c-8 10-8 26 2 35 12 10 28 10 40 0 10-9 10-25 2-35" />
      <path d="M36 82c8 12 16 14 24 8 8 6 16 4 24-8" />
      <circle cx="48" cy="60" r="2.5" />
      <circle cx="72" cy="60" r="2.5" />
      <path d="M56 70c2 2.5 6 2.5 8 0" />
    </svg>
  );
}

function LightningTailOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M72 16 32 62h26l-10 42 40-48H62l10-40Z" />
      <circle cx="28" cy="28" r="6" />
      <circle cx="94" cy="92" r="8" />
    </svg>
  );
}
