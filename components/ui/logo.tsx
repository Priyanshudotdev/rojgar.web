import Image from 'next/image';
import React from 'react';

type LogoProps = {
  size?: number; // square size in px
  className?: string;
  alt?: string;
  priority?: boolean;
};

const Logo: React.FC<LogoProps> = ({ size = 35, className = '', alt = 'Logo', priority }) => {
  // Always use absolute path so Next resolves from /public; relative paths can fail on nested routes.
  const src = '/logo.png';
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
      onError={(e) => {
        // Provide a lightweight fallback if image fails (rare, but helps in low connectivity or missing asset scenario)
        const target = e.currentTarget as any;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent && !parent.querySelector('[data-logo-fallback]')) {
          const span = document.createElement('span');
          span.setAttribute('data-logo-fallback', '');
            span.className = 'inline-flex items-center justify-center font-bold bg-green-600 text-white rounded';
          span.style.width = span.style.height = size + 'px';
          span.textContent = 'R';
          parent.appendChild(span);
        }
      }}
    />
  );
};

export default Logo;