'use client';

import React, { useState } from 'react';

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabChildProps {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export function Tabs({ defaultValue, value, onValueChange, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue || '');

  const currentValue = value !== undefined ? value : activeTab;

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setActiveTab(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            activeTab: currentValue,
            onTabChange: handleTabChange
          } as TabChildProps);
        }
        return child;
      })}
    </div>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export function TabsList({ children, className = '', activeTab, onTabChange }: TabsListProps) {
  return (
    <div className={`flex space-x-1 bg-gray-100 p-1 rounded-lg dark:bg-[#1A1A22] ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            activeTab,
            onTabChange
          } as TabChildProps);
        }
        return child;
      })}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export function TabsTrigger({ value, children, className = '', activeTab, onTabChange }: TabsTriggerProps) {
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => onTabChange?.(value)}
      className={`
        flex-1 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6F42C1] focus:ring-offset-2
        ${isActive
          ? 'bg-white text-[#6F42C1] shadow-sm dark:bg-[#161B22] dark:text-[#6F42C1]'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
}

export function TabsContent({ value, children, className = '', activeTab }: TabsContentProps) {
  if (activeTab !== value) return null;

  return (
    <div className={`mt-4 focus:outline-none ${className}`}>
      {children}
    </div>
  );
}
