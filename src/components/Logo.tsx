// The logo: the alto's side profile with its reed (the gap at the tip is the tip opening). Drawn
// in the current text colour; the same shapes are in public/favicon.svg and docs/images/logo-*.svg.
export function Logo({ height = 16 }: { height?: number }) {
  return (
    <svg className="logo" viewBox="0 2 92 32" height={height} width={(height * 92) / 32} aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 4.5 L10 4.6 C13 4.6 15 2.4 18.5 2.4 L51 7.1 C52.6 7.4 53.2 9 54.4 10.4 C55.6 11.6 57 12.4 59 13.3 L87 24.6 C89.2 25.5 89.6 26.4 89.2 27.2 C80 29.4 70 30 60 30 L13 30 C11.5 30 11 27.8 10 27.6 L0 26.5 Z"
      />
      <path fill="currentColor" d="M16 30.9 H90.4 Q91.4 30.9 91.2 31.5 L40 33.8 H16 Z" />
    </svg>
  );
}
