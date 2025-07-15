'use client';

import React, { useEffect, useState } from 'react';

interface NumberAnimationProps {
  number: string;
  className?: string;
}

export default function NumberAnimation({ number, className = '' }: NumberAnimationProps) {
  const [displayNumber, setDisplayNumber] = useState(number);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (number !== displayNumber) {
      setIsAnimating(true);
      
      // Animation sequence
      setTimeout(() => {
        setDisplayNumber(number);
      }, 150);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  }, [number, displayNumber]);

  return (
    <span 
      className={`inline-block transition-all duration-300 ${
        isAnimating ? 'scale-110 text-yellow-300' : 'scale-100'
      } ${className}`}
    >
      {displayNumber}
    </span>
  );
}
