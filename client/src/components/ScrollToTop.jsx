import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Resets scroll position to top on page navigations, except on mobile Shop view when filters are active
 * so Shop.jsx can smoothly scroll to the applied filters and products grid.
 */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const hasShopFilters = pathname === '/shop' && Boolean(
      search.includes('gender=') ||
      search.includes('category=') ||
      search.includes('subcategory=') ||
      search.includes('search=') ||
      search.includes('tag=') ||
      search.includes('minPrice=') ||
      search.includes('maxPrice=') ||
      search.includes('inStock=')
    );

    // If on mobile shop with active filters, let Shop.jsx handle smooth scrolling to applied filters
    if (isMobile && hasShopFilters) {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
