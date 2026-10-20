import { useRef, useState, useEffect, useCallback } from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

/**
 * Universal desktop & mobile horizontal scroll container.
 * Features:
 * - Desktop click-to-scroll navigation arrow buttons (< and >)
 * - Mouse wheel vertical-to-horizontal scrolling with natural responsiveness
 * - Mouse click-and-drag panning with grab cursor & drag threshold protection
 * - Touch-friendly native momentum scrolling on mobile
 * - Edge fade masks so contents never look abruptly sliced off
 * - Auto-scrolls active pill into view
 */
const HorizontalScrollContainer = ({
  children,
  className = '',
  innerClassName = '',
  gradientFrom = 'from-cream',
  gradientTo = 'to-transparent',
  scrollAmount = 300,
  activeKey = null
}) => {
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag tracking refs
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Check scroll boundary state
  const updateScrollBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < maxScroll - 4);
  }, []);

  // Update bounds on mount, resize, content mutation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollBounds();

    const handleScroll = () => updateScrollBounds();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => updateScrollBounds());
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => resizeObserver.observe(child));
    }

    window.addEventListener('resize', updateScrollBounds);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollBounds);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateScrollBounds, children]);

  // Mouse wheel listener: Convert mouse wheel deltaY to horizontal scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // If user is holding shift, browser already scrolls horizontally
      if (e.shiftKey) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const goingRight = e.deltaY > 0;
      const goingLeft = e.deltaY < 0;

      const canMoveRight = el.scrollLeft < maxScroll - 2;
      const canMoveLeft = el.scrollLeft > 2;

      // Only intercept if we have room to scroll horizontally in the desired direction
      if ((goingRight && canMoveRight) || (goingLeft && canMoveLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.1;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Auto-scroll active item into view whenever activeKey changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      const activeEl = el.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'nearest',
          block: 'nearest'
        });
      }
      updateScrollBounds();
    }, 60);

    return () => clearTimeout(timer);
  }, [activeKey, updateScrollBounds]);

  // Click & drag handlers for desktop mouse users with window-level listeners
  const onMouseDown = (e) => {
    if (e.button !== 0) return; // Only drag with left mouse button
    const el = containerRef.current;
    if (!el) return;

    isMouseDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;

    const onMouseMove = (moveEvent) => {
      if (!isMouseDownRef.current) return;
      const currentX = moveEvent.pageX - el.offsetLeft;
      const walk = (currentX - startXRef.current) * 1.3;

      if (Math.abs(walk) > 4) {
        setIsDragging(true);
        hasMovedRef.current = true;
        moveEvent.preventDefault();
        el.scrollLeft = scrollLeftStartRef.current - walk;
      }
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => {
        setIsDragging(false);
        hasMovedRef.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Block clicks if user dragged rather than clicked
  const onClickCapture = (e) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const scrollByAmount = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div className={`relative group/hscroll select-none ${className}`}>
      {/* Left Edge Fade Mask */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r ${gradientFrom} ${gradientTo} pointer-events-none z-10 transition-opacity duration-300 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Right Edge Fade Mask */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l ${gradientFrom} ${gradientTo} pointer-events-none z-10 transition-opacity duration-300 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Left Navigation Arrow (Desktop) */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByAmount('left')}
        className={`hidden sm:flex absolute left-0.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-neutral-200 text-neutral-700 hover:text-primary hover:bg-white hover:scale-110 active:scale-95 items-center justify-center transition-all duration-200 cursor-pointer ${
          canScrollLeft
            ? 'opacity-90 hover:opacity-100 translate-x-0'
            : 'opacity-0 pointer-events-none -translate-x-2'
        }`}
      >
        <HiOutlineChevronLeft className="w-4 h-4" />
      </button>

      {/* Right Navigation Arrow (Desktop) */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByAmount('right')}
        className={`hidden sm:flex absolute right-0.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-neutral-200 text-neutral-700 hover:text-primary hover:bg-white hover:scale-110 active:scale-95 items-center justify-center transition-all duration-200 cursor-pointer ${
          canScrollRight
            ? 'opacity-90 hover:opacity-100 translate-x-0'
            : 'opacity-0 pointer-events-none translate-x-2'
        }`}
      >
        <HiOutlineChevronRight className="w-4 h-4" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onClickCapture={onClickCapture}
        className={`flex items-center overflow-x-auto scrollbar-none no-scrollbar ${
          hasOverflow ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        } ${innerClassName}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default HorizontalScrollContainer;
