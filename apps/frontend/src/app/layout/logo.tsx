interface LogoProps {
  className?: string;
}

const CALYX =
  'M0,-2.2 L0.53,-0.73 L2.09,-0.68 L0.86,0.28 L1.29,1.78 L0,0.9 L-1.29,1.78 L-0.86,0.28 L-2.09,-0.68 L-0.53,-0.73 Z';

/** Three blueberries on green twigs. */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Blueberry"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="logo-blueberry" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#9fb0ff" />
          <stop offset="45%" stopColor="#4f63e6" />
          <stop offset="100%" stopColor="#232c78" />
        </radialGradient>
      </defs>

      <g stroke="#3f9d4f" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <path d="M16.8 2.4 V5.2" />
        <path d="M16.8 5.2 C14.6 7.8 12.6 10.6 11.8 13.4" />
        <path d="M16.8 5.2 C18.4 8 20.4 11.4 21.4 14.2" />
      </g>

      <g fill="#4caf50">
        <path d="M16.8 2.2 C19.1 2.2 20.8 3.9 20.8 5.9 C18.5 6.3 16.8 4.5 16.8 2.2 Z" />
        <path
          d="M16.8 2.2 C14.5 2.2 12.8 3.9 12.8 5.9 C15.1 6.3 16.8 4.5 16.8 2.2 Z"
          opacity="0.85"
        />
      </g>

      <circle cx="11.8" cy="19.4" r="6" fill="url(#logo-blueberry)" />
      <circle cx="21.4" cy="19.6" r="5.3" fill="url(#logo-blueberry)" />
      <circle cx="16.8" cy="9.8" r="4.6" fill="url(#logo-blueberry)" />

      <g fill="#151b4d">
        <path d={CALYX} transform="translate(11.8 13.6) scale(1.15)" />
        <path d={CALYX} transform="translate(21.4 14.5) scale(1.05)" />
        <path d={CALYX} transform="translate(16.8 5.4) scale(0.9)" />
      </g>

      <g fill="#ffffff" opacity="0.32">
        <circle cx="9.6" cy="17" r="1.5" />
        <circle cx="19.5" cy="17.5" r="1.35" />
        <circle cx="15.1" cy="8" r="1.2" />
      </g>
    </svg>
  );
}
