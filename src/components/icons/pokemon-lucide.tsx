import type { ComponentType, SVGProps } from 'react';

export interface PokemonIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export type TcgIconComponent = ComponentType<{ size?: number | string; className?: string }>;

export function PikachuIcon({ size = 20, className = '', ...props }: PokemonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M7 9 4.5 3.5 9.5 7" />
      <path d="M17 9 19.5 3.5 14.5 7" />
      <path d="M7 9a6.5 6.5 0 0 1 10 0c1.4 1.6 2 3.7 1.7 5.8-.5 3-3.2 5.2-6.7 5.2s-6.2-2.2-6.7-5.2C5 12.7 5.6 10.6 7 9Z" />
      <circle cx="9.5" cy="12.5" r="0.7" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="0.7" fill="currentColor" />
      <circle cx="7.8" cy="15.2" r="1.1" />
      <circle cx="16.2" cy="15.2" r="1.1" />
      <path d="M10.8 15.3c.6.7 1.8.7 2.4 0" />
    </svg>
  );
}

export function PokeballIcon({ size = 20, className = '', ...props }: PokemonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6" />
      <path d="M15 12h6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function MasterballIcon({ size = 20, className = '', ...props }: PokemonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6" />
      <path d="M15 12h6" />
      <circle cx="12" cy="12" r="3" />
      <path d="M9.5 8 11 6l1 1.5L13 6l1.5 2" />
      <path d="M6.5 6.5c.8.6 1.2 1.2 1.5 2" />
      <path d="M17.5 6.5c-.8.6-1.2 1.2-1.5 2" />
    </svg>
  );
}

export function TcgCardStackIcon({ size = 20, className = '', ...props }: PokemonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="4" width="13" height="17" rx="2" />
      <path d="M4 7v12a2 2 0 0 0 2 2h10" />
      <circle cx="12.5" cy="11.5" r="2.5" />
      <path d="M10 11.5h5" />
    </svg>
  );
}

export function TdkCrownIcon({ size = 20, className = '', ...props }: PokemonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M3 17 5 7l4.5 4.5L12 5l2.5 6.5L19 7l2 10H3Z" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function ThunderboltIcon({ size = 20, className = '', ...props }: PokemonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M13 3 5 14h6l-1 7 9-11h-6l0-7Z" />
    </svg>
  );
}
