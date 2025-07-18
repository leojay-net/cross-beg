'use client';

import React from 'react';
import Image from 'next/image';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export function Avatar({ src, alt, size = 'md', fallback, className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`;

  if (src) {
    return (
      <div className={`${baseClasses} overflow-hidden`}>
        <Image
          src={src}
          alt={alt || 'Avatar'}
          width={size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          height={size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // Generate initials from fallback text
  const initials = fallback
    ? fallback.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={`${baseClasses} text-gray-600 dark:text-gray-300 font-medium`}>
      {initials}
    </div>
  );
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarGroup({ children, max = 3, size = 'md', className = '' }: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const hiddenCount = avatars.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className="relative ring-2 ring-white dark:ring-gray-800 rounded-full">
          {React.isValidElement(avatar)
            ? React.cloneElement(avatar, { size } as React.ComponentProps<typeof Avatar>)
            : avatar
          }
        </div>
      ))}
      {hiddenCount > 0 && (
        <Avatar
          size={size}
          fallback={`+${hiddenCount}`}
          className="ring-2 ring-white dark:ring-gray-800"
        />
      )}
    </div>
  );
}
