import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiOutlineFilter, HiOutlineX, HiOutlineAdjustments, HiOutlineSearch, HiCheck } from 'react-icons/hi';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

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

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Load categories and tree
  useEffect(() => {
    Promise.all([
      API.get('/categories').catch(() => ({ data: [] })),
      API.get('/categories/tree').catch(() => ({ data: [] }))
    ])
      .then(([catRes, treeRes]) => {
        const rawCats = Array.isArray(catRes?.data) ? catRes.data : [];
        const rawTree = Array.isArray(treeRes?.data) ? treeRes.data : [];
        setCategories(rawCats);
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

  // Fetch products whenever filters or page changes
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
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
        setProducts(res.data.products || []);
        setTotalPages(res.data.pages || 1);
        setTotalProducts(res.data.total || 0);
      } catch (error) {
        console.error('Error fetching shop products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedGender, selectedCategory, selectedSubcategory, inStockOnly, searchQuery, selectedTag, selectedSort, minPrice, maxPrice, page]);

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

  const clearFilters = () => {
    setSearchParams({});
    setPage(1);
    setFilterDrawerOpen(false);
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

  // Filtered categories based on selected gender
  const safeCategoryTree = Array.isArray(categoryTree) ? categoryTree : [];
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
        </div>

        {/* Department / Gender Switcher Tabs */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => updateParam('gender', '')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
              !selectedGender
                ? 'bg-neutral-900 text-white shadow-md'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            ✨ All Departments
          </button>
          <button
            onClick={() => updateParam('gender', 'women')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
              selectedGender === 'women'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
            }`}
          >
            🌸 Women's Studio
          </button>
          <button
            onClick={() => updateParam('gender', 'men')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
              selectedGender === 'men'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
            }`}
          >
            👔 Men's Studio
          </button>
          <button
            onClick={() => updateParam('gender', 'kids')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
              selectedGender === 'kids'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
            }`}
          >
            🧒 Kids' Studio
          </button>
        </div>

        {/* Primary Category Pills Bar (Filtered by Gender) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          <button
            onClick={() => updateParam('category', '')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
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
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
                selectedCategory === cat.slug
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sub-Category Sub-Pills Bar (like Zantum when a category is selected) */}
        {selectedCategory && activeSubcategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar animate-fade-in pl-2 border-l-2 border-primary">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 whitespace-nowrap mr-1">
              Types:
            </span>
            <button
              onClick={() => updateParam('subcategory', '')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSubcategory === sub.slug
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-white/80 text-neutral-600 hover:text-primary hover:bg-white border border-neutral-200'
                }`}
              >
                {sub.name}
              </button>
            ))}
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

            {/* Department (Gender) Filter */}
            <div className="space-y-3 pb-3 border-b border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Department</h4>
              <div className="space-y-2 text-sm text-neutral-700">
                {[
                  { label: 'All Departments', value: '' },
                  { label: "Women's Studio", value: 'women' },
                  { label: "Men's Studio", value: 'men' },
                  { label: "Kids' Studio", value: 'kids' },
                ].map((item, idx) => (
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
          <div className="lg:col-span-3 space-y-6">
            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 bg-white/70 p-3 rounded-2xl border border-accent-100 text-xs shadow-xs">
                <span className="text-neutral-500 font-medium">Applied Filters:</span>
                {selectedGender && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">
                    Studio: {selectedGender === 'women' ? "Women's" : "Men's"}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 rounded-xl border border-accent-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white shadow-xs"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setPage(idx + 1)}
                    disabled={loading}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 ${
                      page === idx + 1
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white border border-accent-200 text-neutral-700 hover:bg-accent-100/60'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="px-4 py-2 rounded-xl border border-accent-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white shadow-xs"
                >
                  Next
                </button>
              </div>
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

            <div className="py-6 space-y-6 flex-1">
              {/* Department (Gender) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">Department</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'All Departments', value: '' },
                    { label: "🌸 Women's Studio", value: 'women' },
                    { label: "👔 Men's Studio", value: 'men' },
                    { label: "🧒 Kids' Studio", value: 'kids' },
                  ].map((item, idx) => (
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

