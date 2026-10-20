import { useState, useEffect, useRef } from 'react';
import { HiOutlineSparkles } from 'react-icons/hi';

const AnnouncementBar = ({ announcement }) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    if (!announcement?.text) return;

    const measure = () => {
      if (!containerRef.current || !contentRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      // Allow 32px horizontal padding safety margin
      const availableWidth = Math.max(0, containerWidth - 32);
      const contentWidth = contentRef.current.scrollWidth;

      if (contentWidth > availableWidth + 4) {
        const distance = contentWidth - availableWidth + 16;
        setOverflowDistance(distance);
        setIsOverflowing(true);
        // Calm readable speed: ~25px per second + 5s pause time
        setDuration(Math.max(7, Math.min(22, Math.round(distance / 25) + 5)));
      } else {
        setOverflowDistance(0);
        setIsOverflowing(false);
      }
    };

    measure();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      if (containerRef.current) ro.observe(containerRef.current);
      if (contentRef.current) ro.observe(contentRef.current);
    }

    window.addEventListener('resize', measure);
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [announcement?.text]);

  if (!announcement?.isActive || !announcement?.text) return null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-gradient-to-r from-primary-950 via-primary-900 to-primary-950 text-white text-[11px] sm:text-xs py-1.5 px-4 font-medium tracking-wide border-b border-accent-400/20 shadow-xs overflow-hidden flex items-center select-none ${
        isOverflowing ? 'justify-start' : 'justify-center'
      }`}
    >
      {/* Subtle fade gradient edge masks on left and right when overflowing */}
      {isOverflowing && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-primary-950 via-primary-950/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-primary-950 via-primary-950/80 to-transparent z-10" />
        </>
      )}

      <div
        ref={contentRef}
        className={`inline-flex items-center gap-2 whitespace-nowrap will-change-transform ${
          isOverflowing ? 'animate-marquee-bounce' : ''
        }`}
        style={
          isOverflowing
            ? {
                '--marquee-distance': `-${overflowDistance}px`,
                '--marquee-duration': `${duration}s`,
              }
            : undefined
        }
        title={announcement.text}
      >
        <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-300 shrink-0 animate-pulse" />
        <span className="font-medium tracking-wide">{announcement.text}</span>
      </div>
    </div>
  );
};

export default AnnouncementBar;
