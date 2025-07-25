import { useEffect, useRef } from "react";
import { default as jazzicon } from "@metamask/jazzicon";

interface JazziconProps {
  address: string;
  size?: number;
  className?: string;
}

export function Jazzicon({
  address,
  size = 40,
  className = "",
}: JazziconProps) {
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (avatarRef.current && address) {
      avatarRef.current.innerHTML = "";
      const seed = parseInt(address.slice(2, 10), 16);
      const icon = jazzicon(size, seed);
      avatarRef.current.appendChild(icon);
    }
  }, [address, size]);

  return <div ref={avatarRef} className={`rounded-full ${className}`} />;
}
