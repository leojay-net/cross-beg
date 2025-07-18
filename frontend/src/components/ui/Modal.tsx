'use client';

import React, { createContext, useContext } from 'react';
import { X } from 'lucide-react';

interface ModalContextType {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({ isOpen, onClose, children, size = 'md', className = '' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <ModalContext.Provider value={{ isOpen, onClose }}>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />

          {/* Modal content */}
          <div className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-lg bg-white shadow-xl transition-all dark:bg-[#161B22] ${className}`}>
            {children}
          </div>
        </div>
      </div>
    </ModalContext.Provider>
  );
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export function ModalHeader({ children, className = '', showCloseButton = true }: ModalHeaderProps) {
  const context = useContext(ModalContext);

  return (
    <div className={`flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#30363D] ${className}`}>
      <div className="text-lg font-semibold text-[#343A40] dark:text-[#EAEBF0]">
        {children}
      </div>
      {showCloseButton && context && (
        <button
          onClick={context.onClose}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalContent({ children, className = '' }: ModalContentProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex justify-end space-x-2 p-6 border-t border-gray-200 dark:border-[#30363D] ${className}`}>
      {children}
    </div>
  );
}
