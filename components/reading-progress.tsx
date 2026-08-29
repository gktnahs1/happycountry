'use client';

import { useEffect, useState } from 'react';

import { Progress } from '@/components/ui/progress';

export function ReadingProgress() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setValue(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <Progress
      aria-label="글 읽기 진행률"
      className="reading-progress"
      value={value}
    />
  );
}
