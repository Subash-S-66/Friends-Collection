import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiOutlineFilter, HiOutlineX, HiOutlineAdjustments, HiOutlineSearch, HiCheck } from 'react-icons/hi';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';
import SearchAutocomplete from '../components/SearchAutocomplete';
import HorizontalScrollContainer from '../components/HorizontalScrollContainer';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const loadMoreRef = useRef(null);
  const productsSectionRef = useRef(null);

  // Filter state
  const selectedGender = searchParams.get('gender') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('subcategory') || '';
  const inStockOnly = searchParams.get('inStock') === 'true';
  const searchQuery = searchParams.get('search') || '';
  const selectedTag = searchParams.get('tag') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  // Pagination & Infinite Scroll
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hiddenDepartments, setHiddenDepartments] = useState([]);

  // Load categories, tree, and store settings
  useEffect(() => {
    Promise.all([
      API.get('/categories').catch(() => ({ data: [] })),
      API.get('/categories/tree').catch(() => ({ data: [] })),
      API.get('/settings').catch(() => ({ data: {} }))
    ])
      .then(([catRes, treeRes, settingsRes]) => {
        const rawCats = Array.isArray(catRes?.data) ? catRes.data : [];
        const rawTree = Array.isArray(treeRes?.data) ? treeRes.data : [];
        setCategories(rawCats);
        if (Array.isArray(settingsRes?.data?.hiddenDepartments)) {
          setHiddenDepartments(
            settingsRes.data.hiddenDepartments
              .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
              .filter(Boolean)
          );
        }
        if (rawTree.length > 0) {
          setCategoryTree(rawTree);
        } else {
          // Group flat categories if tree is empty
          const flat = rawCats;
          const parents = flat.filter((c) => c && !c.parent);
          const tree = parents.map((p) => ({
            ...p,
            subcategories: flat.filter((c) => c && c.parent && ((c.parent._id || c.parent) === p._id))
          }));
          setCategoryTree(tree);
        }
      })
      .catch((err) => console.error('Categories load error:', err));
  }, []);

  // If currently active gender is hidden by admin, reset to All Departments
  useEffect(() => {
    if (selectedGender && hiddenDepartments.includes(selectedGender.toLowerCase())) {
      updateParam('gender', '');
    }
  }, [hiddenDepartments, selectedGender]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasMore(true);
  }, [
    selectedGender,
    selectedCategory,
    selectedSubcategory,
    inStockOnly,
    searchQuery,
    selectedTag,
    selectedSort,
    minPrice,
    maxPrice
  ]);

  // Fetch products incrementally whenever filters or page changes
  useEffect(() => {
    let isCancelled = false;

    const fetchProducts = async () => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        if (selectedGender) params.append('gender', selectedGender);
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
        if (inStockOnly) params.append('inStock', 'true');
        if (searchQuery) params.append('search', searchQuery);
        if (selectedTag) params.append('tag', selectedTag);
        if (selectedSort) params.append('sort', selectedSort);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        params.append('page', page.toString());
        params.append('limit', '12');

        const res = await API.get(`/products?${params.toString()}`);
        if (!isCancelled) {
          const fetchedItems = res.data.products || [];
          const totalP = res.data.pages || 1;
          const totalCount = res.data.total || 0;

          setTotalPages(totalP);
          setTotalProducts(totalCount);
          setHasMore(page < totalP);

          if (page === 1) {
            setProducts(fetchedItems);
          } else {
            setProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p._id));
              const uniqueNew = fetchedItems.filter((p) => !existingIds.has(p._id));
              return [...prev, ...uniqueNew];
            });
          }
        }
      } catch (error) {
        console.error('Error fetching shop products:', error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedGender,
    selectedCategory,
    selectedSubcategory,
    inStockOnly,
    searchQuery,
    selectedTag,
    selectedSort,
    minPrice,
    maxPrice,
    page
  ]);

  // Infinite scroll intersection observer: trigger next page when user scrolls near bottom
  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: '350px 0px',
        threshold: 0.1
      }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // If user changes gender, clear category & subcategory
    if (key === 'gender') {
      newParams.delete('category');
      newParams.delete('subcategory');
    }
    // If user changes category, clear subcategory
    if (key === 'category') {
      newParams.delete('subcategory');
    }
    setPage(1);
    setSearchParams(newParams);
  };

  const hasActiveFilters =
    Boolean(selectedGender) ||
    Boolean(selectedCategory) ||
    Boolean(selectedSubcategory) ||
    inStockOnly ||
    Boolean(searchQuery) ||
    Boolean(selectedTag) ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

  const clearFilters = () => {
    setSearchParams({});
    setPage(1);
    setFilterDrawerOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // On mobile view (< 1024px), automatically scroll to the applied filters and products grid when filters are active
  useEffect(() => {
    if (hasActiveFilters && typeof window !== 'undefined' && window.innerWidth < 1024) {
      const scrollToAppliedFilters = () => {
        if (!productsSectionRef.current) return;
        const navElement = document.querySelector('header');
        const navHeight = navElement ? navElement.offsetHeight : 70;
        // Position applied filters bar right below header with comfortable offset
        const targetY = productsSectionRef.current.getBoundingClientRect().top + window.pageYOffset - (navHeight + 10);

        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth'
        });
      };

      // Slight timeout to let route navigation, header height, and DOM layout settle
      const timer1 = setTimeout(scrollToAppliedFilters, 120);
      const timer2 = setTimeout(() => {
        // Confirmation check in case category chips or fonts shifted layout
        if (!productsSectionRef.current) return;
        const navElement = document.querySelector('header');
        const navHeight = navElement ? navElement.offsetHeight : 70;
        const targetY = productsSectionRef.current.getBoundingClientRect().top + window.pageYOffset - (navHeight + 10);
        // Only adjust if still significantly above the target section
        if (window.pageYOffset < targetY - 40) {
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
      }, 350);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [
    hasActiveFilters,
    selectedGender,
    selectedCategory,
    selectedSubcategory,
    inStockOnly,
    searchQuery,
    selectedTag,
    minPrice,
    maxPrice
  ]);

  // Filtered categories based on selected gender & excluding hidden departments
  const safeCategoryTree = (Array.isArray(categoryTree) ? categoryTree : []).filter(
    (c) => !c?.gender || !hiddenDepartments.includes(c.gender.toLowerCase())
  );

  const isWomenVisible = !hiddenDepartments.includes('women') && safeCategoryTree.some((c) => c && (c.gender === 'women' || !c.gender));
  const isMenVisible = !hiddenDepartments.includes('men') && safeCategoryTree.some((c) => c && c.gender === 'men');
  const isKidsVisible = !hiddenDepartments.includes('kids') && safeCategoryTree.some((c) => c && c.gender === 'kids');

  const displayedCategories = selectedGender
    ? safeCategoryTree.filter((c) => c && (c.gender === selectedGender || c.gender === 'all' || !c.gender))
    : safeCategoryTree;

  // Active category object and its subcategories
  const activeCatObj = safeCategoryTree.find((c) => c?.slug === selectedCategory);
  const activeSubcategories = Array.isArray(activeCatObj?.subcategories) ? activeCatObj.subcategories : [];

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <nav className="text-xs text-neutral-500 mb-2 flex flex-wrap items-center gap-1.5">
            <span>Home</span>
            <span>/</span>
            <span className="text-primary font-medium">Shop</span>
            {selectedGender && (
              <>
                <span>/</span>
                <span className="capitalize text-neutral-800 font-semibold">
                  {selectedGender === 'women' ? "Women's Collection" : selectedGender === 'men' ? "Men's Collection" : "Kids' Collection"}
                </span>
              </>
            )}
            {selectedCategory && (
              <>
                <span>/</span>
                <span className="capitalize text-neutral-800 font-semibold">{activeCatObj?.name || selectedCategory}</span>
              </>
            )}
            {selectedSubcategory && (
              <>
                <span>/</span>
                <span className="capitalize text-primary font-bold">
                  {categories.find((c) => c.slug === selectedSubcategory)?.name || selectedSubcategory}
                </span>
              </>
            )}
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">
                {selectedSubcategory
                  ? categories.find((c) => c.slug === selectedSubcategory)?.name || 'Dresses'
                  : selectedCategory
                  ? activeCatObj?.name || 'Dresses'
                  : selectedGender === 'women'
                  ? "Women's Collection"
                  : selectedGender === 'men'
                  ? "Men's Collection"
                  : selectedGender === 'kids'
                  ? "Kids' Collection"
                  : searchQuery
                  ? `Search: "${searchQuery}"`
                  : 'All Dresses & Collections'}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Showing {totalProducts} hand-selected designs
              </p>
            </div>

            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFilterDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-accent-200 bg-white text-sm font-medium text-neutral-800 shadow-sm"
              >
                <HiOutlineFilter className="w-4 h-4 text-primary" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-neutral-500">Sort by:</span>
                <select
                  value={selectedSort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="bg-white border border-accent-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shop All Search Bar with Amazon & Flipkart Style Dropdown */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="max-w-2xl">
              <SearchAutocomplete
                autoFocus={false}
                initialQuery={searchQuery}
                onSearch={(term) => updateParam('search', term)}
                onClear={() => updateParam('search', '')}
                placeholder="Search dresses, silk sarees, kurtis, lehengas, shirts, fabrics..."
              />
            </div>
          </div>
        </div>

        {/* Department / Gender Switcher Tabs */}
        <HorizontalScrollContainer
          className="mb-3"
          innerClassName="gap-2 py-1 px-1"
          activeKey={selectedGender || 'all'}
        >
          <button
            onClick={() => updateParam('gender', '')}
            data-active={!selectedGender ? 'true' : undefined}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
              !selectedGender
                ? 'bg-neutral-900 text-white shadow-md'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            ✨ All Departments
          </button>
          {isWomenVisible && (
            <button
              onClick={() => updateParam('gender', 'women')}
              data-active={selectedGender === 'women' ? 'true' : undefined}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                selectedGender === 'women'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
              }`}
            >
              🌸 Women's Studio
            </button>
          )}
          {isMenVisible && (
            <button
              onClick={() => updateParam('gender', 'men')}
              data-active={selectedGender === 'men' ? 'true' : undefined}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                selectedGender === 'men'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
              }`}
            >
              👔 Men's Studio
            </button>
          )}
          {isKidsVisible && (
            <button
              onClick={() => updateParam('gender', 'kids')}
              data-active={selectedGender === 'kids' ? 'true' : undefined}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                selectedGender === 'kids'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
              }`}
            >
              🧒 Kids' Studio
            </button>
          )}
        </HorizontalScrollContainer>

        {/* Primary Category Pills Bar (Filtered by Gender) */}
        <HorizontalScrollContainer
          className="mb-4"
          innerClassName="gap-2 py-1 px-1"
          activeKey={selectedCategory || 'all'}
        >
          <button
            onClick={() => updateParam('category', '')}
            data-active={!selectedCategory ? 'true' : undefined}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
              !selectedCategory
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
            }`}
          >
            All {selectedGender === 'women' ? "Women's" : selectedGender === 'men' ? "Men's" : selectedGender === 'kids' ? "Kids'" : 'Categories'}
          </button>
          {displayedCategories.map((cat) => (
            <button
              key={cat._id || cat.slug}
              onClick={() => updateParam('category', cat.slug)}
              data-active={selectedCategory === cat.slug ? 'true' : undefined}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </HorizontalScrollContainer>

        {/* Sub-Category Sub-Pills Bar (like Zantum when a category is selected) */}
        {selectedCategory && activeSubcategories.length > 0 && (
          <div className="mb-6 pl-2 border-l-2 border-primary">
            <HorizontalScrollContainer
              innerClassName="gap-2 py-1 px-1"
              activeKey={selectedSubcategory || 'all'}
            >
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-400 whitespace-nowrap mr-1 select-none">
                Types:
              </span>
              <button
                onClick={() => updateParam('subcategory', '')}
                data-active={!selectedSubcategory ? 'true' : undefined}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  !selectedSubcategory
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-white/80 text-neutral-600 hover:text-primary hover:bg-white border border-neutral-200'
                }`}
              >
                All {activeCatObj?.name}
              </button>
              {activeSubcategories.map((sub) => (
                <button
                  key={sub._id || sub.slug}
                  onClick={() => updateParam('subcategory', sub.slug)}
                  data-active={selectedSubcategory === sub.slug ? 'true' : undefined}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedSubcategory === sub.slug
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-white/80 text-neutral-600 hover:text-primary hover:bg-white border border-neutral-200'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </HorizontalScrollContainer>
          </div>
        )}

        {/* Main Content Layout with Desktop Sidebar Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block bg-white p-6 rounded-3xl border border-accent-100 shadow-sm space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                <HiOutlineAdjustments className="w-5 h-5 text-primary" />
                <span>Filters</span>
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-accent-700 hover:text-primary transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Quick Search in Filter Sidebar */}
            <div className="space-y-2 pb-3 border-b border-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">Keyword Search</span>
              <SearchAutocomplete
                autoFocus={false}
                initialQuery={searchQuery}
                onSearch={(term) => updateParam('search', term)}
                onClear={() => updateParam('search', '')}
                placeholder="Search catalog..."
              />
            </div>

            {/* Department (Gender) Filter */}
            <div className="space-y-3 pb-3 border-b border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Department</h4>
              <div className="space-y-2 text-sm text-neutral-700">
                {[
                  { label: 'All Departments', value: '' },
                  { label: "Women's Studio", value: 'women' },
                  { label: "Men's Studio", value: 'men' },
                  { label: "Kids' Studio", value: 'kids' },
                ]
                  .filter((item) => !item.value || !hiddenDepartments.includes(item.value))
                  .map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                    <input
                      type="radio"
                      name="genderFilter"
                      checked={selectedGender === item.value}
                      onChange={() => updateParam('gender', item.value)}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Flipkart-Style In-Stock Availability Filter */}
            <div className="space-y-3 pb-3 border-b border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Availability</h4>
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary group">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs sm:text-sm font-semibold text-neutral-800 group-hover:text-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  In Stock Only
                </span>
              </label>
              <p className="text-[11px] text-neutral-400 pl-6">
                Excludes designs that are currently sold out
              </p>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-3 pb-3 border-b border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Price Range</h4>
              <div className="space-y-2 text-sm text-neutral-700">
                {[
                  { label: 'All Prices', min: '', max: '' },
                  { label: 'Under ₹999', min: '0', max: '999' },
                  { label: '₹1,000 – ₹1,999', min: '1000', max: '1999' },
                  { label: '₹2,000 – ₹3,999', min: '2000', max: '3999' },
                  { label: '₹4,000 & Above', min: '4000', max: '' },
                ].map((item, idx) => {
                  const isChecked = minPrice === item.min && maxPrice === item.max;
                  return (
                    <label key={idx} className="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                      <input
                        type="radio"
                        name="priceFilter"
                        checked={isChecked}
                        onChange={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (item.min) newParams.set('minPrice', item.min);
                          else newParams.delete('minPrice');
                          if (item.max) newParams.set('maxPrice', item.max);
                          else newParams.delete('maxPrice');
                          setPage(1);
                          setSearchParams(newParams);
                        }}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-xs sm:text-sm">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tags / Collections */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Collections</h4>
              <div className="space-y-2 text-sm text-neutral-700">
                {[
                  { label: 'All Items', tag: '' },
                  { label: 'Trending Styles', tag: 'trending' },
                  { label: 'New Arrivals', tag: 'new-arrival' },
                  { label: 'Festive Wear', tag: 'festive' },
                ].map((t, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                    <input
                      type="radio"
                      name="tagFilter"
                      checked={selectedTag === t.tag}
                      onChange={() => updateParam('tag', t.tag)}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs sm:text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div ref={productsSectionRef} id="shop-products-section" className="lg:col-span-3 space-y-6 scroll-mt-24">
            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div id="applied-filters-bar" className="flex flex-wrap items-center gap-2 bg-white/70 p-3 rounded-2xl border border-accent-100 text-xs shadow-xs">
                <span className="text-neutral-500 font-medium">Applied Filters:</span>
                {selectedGender && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">
                    Studio: {selectedGender === 'women' ? "Women's" : selectedGender === 'men' ? "Men's" : "Kids'"}
                    <button onClick={() => updateParam('gender', '')}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-primary font-semibold">
                    Category: {activeCatObj?.name || selectedCategory}
                    <button onClick={() => updateParam('category', '')}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {selectedSubcategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white font-semibold">
                    Type: {categories.find((c) => c.slug === selectedSubcategory)?.name || selectedSubcategory}
                    <button onClick={() => updateParam('subcategory', '')}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    In Stock Only
                    <button onClick={() => updateParam('inStock', '')}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-primary font-semibold">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => updateParam('search', '')}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-primary font-semibold">
                    Price: {minPrice ? `₹${minPrice}` : '₹0'} - {maxPrice ? `₹${maxPrice}` : 'Above'}
                    <button onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('minPrice');
                      newParams.delete('maxPrice');
                      setSearchParams(newParams);
                    }}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {selectedTag && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-primary font-semibold">
                    Collection: {selectedTag}
                    <button onClick={() => updateParam('tag', '')}><HiOutlineX className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-primary underline ml-auto font-bold hover:text-accent-700"
                >
                  Reset All
                </button>
              </div>
            )}

            {/* Products Listing */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 space-y-3 animate-pulse border border-accent-100">
                    <div className="aspect-[3/4] bg-neutral-200 rounded-xl w-full" />
                    <div className="h-4 bg-neutral-200 rounded w-3/4" />
                    <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-accent-100 shadow-sm max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center mx-auto">
                  <HiOutlineSearch className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-neutral-900">No designs found</h3>
                <p className="text-sm text-neutral-500">
                  {inStockOnly
                    ? 'All matching designs in this category are currently sold out. Try turning off "In Stock Only" to view them.'
                    : 'We could not find any designs matching your criteria. Try adjusting your filters or browsing all collections.'}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary-light transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Infinite Scroll Trigger Sentinel & Loading Indicator */}
                <div ref={loadMoreRef} className="w-full py-8 flex flex-col items-center justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white border border-accent-200 shadow-sm text-primary text-xs font-semibold animate-pulse">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading more boutique designs...</span>
                    </div>
                  )}

                  {!hasMore && products.length > 0 && !loading && (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-12 h-0.5 bg-accent-200 mx-auto rounded-full" />
                      <p className="text-xs text-neutral-400 font-medium tracking-wide">
                        ✨ You've viewed all {products.length} designs
                      </p>
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="text-[11px] font-bold text-accent-700 hover:text-primary transition-colors underline pt-1 cursor-pointer"
                      >
                        Back to Top ↑
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          <div className="fixed inset-0 bg-black/50" onClick={() => setFilterDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl p-6 flex flex-col z-10 animate-slide-left overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="font-serif text-lg font-bold text-neutral-900">Filters</h3>
              <button onClick={() => setFilterDrawerOpen(false)} className="p-1 rounded-lg hover:bg-neutral-100">
                <HiOutlineX className="w-6 h-6 text-neutral-500" />
              </button>
            </div>

            <div className="py-4 space-y-6 flex-1">
              {/* Quick Search in Mobile Drawer */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">Search Catalog</h4>
                <SearchAutocomplete
                  autoFocus={false}
                  initialQuery={searchQuery}
                  onSearch={(term) => {
                    updateParam('search', term);
                    setFilterDrawerOpen(false);
                  }}
                  onClear={() => updateParam('search', '')}
                  placeholder="Search dresses..."
                />
              </div>

              {/* Department (Gender) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">Department</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'All Departments', value: '' },
                    { label: "🌸 Women's Studio", value: 'women' },
                    { label: "👔 Men's Studio", value: 'men' },
                    { label: "🧒 Kids' Studio", value: 'kids' },
                  ]
                    .filter((item) => !item.value || !hiddenDepartments.includes(item.value))
                    .map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { updateParam('gender', item.value); }}
                      className={`block w-full text-left text-xs py-2 px-3 rounded-lg font-semibold transition-all ${
                        selectedGender === item.value
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flipkart In Stock Toggle */}
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">Availability</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    In Stock Only
                  </span>
                </label>
              </div>

              {/* Categories */}
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3">Categories & Types</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => { updateParam('category', ''); setFilterDrawerOpen(false); }}
                    className={`block w-full text-left text-sm py-1.5 px-2 rounded-lg ${!selectedCategory ? 'font-bold text-primary bg-primary-50' : 'text-neutral-700'}`}
                  >
                    All {selectedGender === 'women' ? "Women's" : selectedGender === 'men' ? "Men's" : ''} Categories
                  </button>
                  {displayedCategories.map((c) => (
                    <div key={c._id || c.slug} className="space-y-1">
                      <button
                        onClick={() => { updateParam('category', c.slug); setFilterDrawerOpen(false); }}
                        className={`block w-full text-left text-sm py-1.5 px-2 rounded-lg font-semibold ${selectedCategory === c.slug ? 'text-primary bg-primary-50' : 'text-neutral-700'}`}
                      >
                        {c.name}
                      </button>
                      {selectedCategory === c.slug && c.subcategories && (
                        <div className="pl-4 space-y-1 border-l-2 border-accent-300 ml-2">
                          <button
                            onClick={() => { updateParam('subcategory', ''); setFilterDrawerOpen(false); }}
                            className={`block w-full text-left text-xs py-1 px-2 rounded ${!selectedSubcategory ? 'font-bold text-accent-700' : 'text-neutral-500'}`}
                          >
                            All {c.name}
                          </button>
                          {c.subcategories.map((s) => (
                            <button
                              key={s._id || s.slug}
                              onClick={() => { updateParam('subcategory', s.slug); setFilterDrawerOpen(false); }}
                              className={`block w-full text-left text-xs py-1 px-2 rounded ${selectedSubcategory === s.slug ? 'font-bold text-accent-700 bg-accent-50' : 'text-neutral-500'}`}
                            >
                              ↳ {s.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3">Price</h4>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'All Prices', min: '', max: '' },
                    { label: 'Under ₹999', min: '0', max: '999' },
                    { label: '₹1,000 – ₹1,999', min: '1000', max: '1999' },
                    { label: '₹2,000 – ₹3,999', min: '2000', max: '3999' },
                    { label: '₹4,000 & Above', min: '4000', max: '' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        if (item.min) newParams.set('minPrice', item.min);
                        else newParams.delete('minPrice');
                        if (item.max) newParams.set('maxPrice', item.max);
                        else newParams.delete('maxPrice');
                        setPage(1);
                        setSearchParams(newParams);
                        setFilterDrawerOpen(false);
                      }}
                      className={`block w-full text-left py-1.5 px-2 rounded-lg ${minPrice === item.min && maxPrice === item.max ? 'font-bold text-primary bg-primary-50' : 'text-neutral-700'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-2">
              <button
                onClick={clearFilters}
                className="w-full py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Clear All
              </button>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary-light"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;

