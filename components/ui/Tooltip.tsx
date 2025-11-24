import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      // Simple offset logic for fixed positioning
      switch (position) {
        case 'top':
          top = rect.top - 10; // 10px offset above
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 10;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 10;
          break;
      }

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  const tooltipContent = (
    <div 
      className="fixed z-[9999] pointer-events-none"
      style={{ top: coords.top, left: coords.left }}
    >
      <div 
        className={`bg-slate-800 text-slate-200 text-xs px-2 py-1.5 rounded border border-white/10 shadow-xl max-w-[200px] whitespace-normal break-words transform ${
          position === 'top' ? '-translate-x-1/2 -translate-y-full' : 
          position === 'bottom' ? '-translate-x-1/2' :
          position === 'left' ? '-translate-x-full -translate-y-1/2' : 
          '-translate-y-1/2'
        }`}
      >
        {content}
        {/* Tiny arrow */}
        <div 
          className={`absolute w-2 h-2 bg-slate-800 border-white/10 transform rotate-45 ${
            position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' :
            position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' :
            position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' :
            'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l'
          }`}
        />
      </div>
    </div>
  );

  return (
    <>
      <div 
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
};

export default Tooltip;