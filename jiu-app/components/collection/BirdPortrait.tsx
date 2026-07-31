import { CSSProperties } from 'react';
import { Bird } from '@/lib/constants';

interface BirdPortraitProps {
  bird: Bird;
  reveal?: number;
  className?: string;
}

export function BirdPortrait({
  bird,
  reveal = 1,
  className = '',
}: BirdPortraitProps) {
  const portraitIndex = bird.atlasPosition.row * 3 + bird.atlasPosition.column + 1;
  const portraitStyle: CSSProperties = {
    backgroundImage: `url('/images/birds/${portraitIndex}.png')`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
  };
  const safeReveal = Math.max(0, Math.min(reveal, 1));

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="img"
      aria-label={safeReveal > 0 ? bird.name : '尚未发现的鸟'}
    >
      <div
        className="absolute inset-0 opacity-55 grayscale"
        style={portraitStyle}
        aria-hidden="true"
      />
      {safeReveal > 0 && (
        <div
          className="absolute inset-0 transition-[clip-path] duration-700 ease-out"
          style={{
            ...portraitStyle,
            clipPath: `inset(${(1 - safeReveal) * 100}% 0 0 0)`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
