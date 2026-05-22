import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}

export default function BrandLogo({
  size = 24,
  className = '',
  alt = 'Familiar logo',
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={alt ? undefined : true}
    >
      <Image
        src="/brand/aangan-logo.png"
        alt={alt}
        fill
        priority={priority}
        sizes={`${size}px`}
        className="object-contain"
      />
    </div>
  );
}
