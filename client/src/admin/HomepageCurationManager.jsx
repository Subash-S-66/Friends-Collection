import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineShoppingBag,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineEye,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineViewGrid,
  HiOutlineChevronRight,
  HiOutlineAdjustments,
  HiOutlineInformationCircle
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { getImageUrl, formatPrice, CATEGORY_FALLBACK, PRODUCT_FALLBACK_1 } from '../utils/formatters';

const DEFAULT_CURATION_STATE = {
  categoriesSection: {
    mode: 'default', // 'default' | 'custom'
    title: 'Shop by Department & Category',
    subtitle: 'Explore Collections',
    selectedCategoryIds: []
  },
  trendingSection: {
    mode: 'default',
    title: 'Trending This Season',
    subtitle: 'Handpicked Favorites',
    selectedProductIds: []
  },
  newArrivalsSection: {
    mode: 'default',
    title: 'New Arrivals',
    subtitle: 'Fresh Drops',
    selectedProductIds: []
  }
};

const SECTIONS = [
  {
    id: 'categoriesSection',
    name: 'Shop by Department & Category',
    type: 'categories',
    icon: HiOutlineTag,
    desc: 'Boutique collections organized across Women, Men, Kids, and Unisex departments',
    defaultTitle: 'Shop by Department & Category',
    defaultSubtitle: 'Explore Collections',
    minRequired: 2
  },
  {
    id: 'trendingSection',
    name: 'Handpicked Favorites / Trending',
    type: 'products',
    icon: HiOutlineSparkles,
    desc: 'Customer favorites, bestsellers, and festive highlights (strictly 8 products)',
    defaultTitle: 'Trending This Season',
    defaultSubtitle: 'Handpicked Favorites',
    exactRequired: 8
  },
  {
    id: 'newArrivalsSection',
    name: 'Fresh Drops / New Arrivals',
    type: 'products',
    icon: HiOutlineShoppingBag,
    desc: 'Fresh boutique drops and newest seasonal arrivals (strictly 8 products)',
    defaultTitle: 'New Arrivals',
    defaultSubtitle: 'Fresh Drops',
    exactRequired: 8
  }
];

export default function HomepageCurationManager() {
  const { confirm } = useConfirm();

  const [activeSectionId, setActiveSectionId] = useState('categoriesSection');
  const [curation, setCuration] = useState(DEFAULT_CURATION_STATE);
  const [initialCuration, setInitialCuration] = useState(DEFAULT_CURATION_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data pools
  const [allCategories, setAllCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Filter & Search states for category picker
  const [catDepartmentFilter, setCatDepartmentFilter] = useState('all');
  const [catSearchTerm, setCatSearchTerm] = useState('');

  // Filter & Search states for product picker
  const [prodDepartmentFilter, setProdDepartmentFilter] = useState('all');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('all');
  const [prodSearchTerm, setProdSearchTerm] = useState('');

  // Fetch initial settings, all categories, and products
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [settingsRes, catsRes, prodsRes] = await Promise.all([
          API.get('/settings').catch(() => ({ data: {} })),
          API.get('/categories/admin/all').catch(() => ({ data: [] })),
          API.get('/products/admin/all?limit=150').catch(() => ({ data: { products: [] } }))
        ]);

        const rawCuration = settingsRes.data?.homepageCuration;
        if (rawCuration && typeof rawCuration === 'object') {
          const merged = {
            categoriesSection: {
              ...DEFAULT_CURATION_STATE.categoriesSection,
              ...(rawCuration.categoriesSection || {})
            },
            trendingSection: {
              ...DEFAULT_CURATION_STATE.trendingSection,
              ...(rawCuration.trendingSection || {})
            },
            newArrivalsSection: {
              ...DEFAULT_CURATION_STATE.newArrivalsSection,
              ...(rawCuration.newArrivalsSection || {})
            }
          };
          setCuration(merged);
          setInitialCuration(JSON.parse(JSON.stringify(merged)));
        }

        setAllCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
        setAllProducts(Array.isArray(prodsRes.data?.products) ? prodsRes.data.products : []);
      } catch (err) {
        console.error('Failed to load curation data:', err);
        toast.error('Failed to load homepage display settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Map category by ID for fast lookups
  const categoryMap = useMemo(() => {
    const map = new Map();
    allCategories.forEach((c) => {
      if (c && c._id) map.set(String(c._id), c);
    });
    return map;
  }, [allCategories]);

  // Map product by ID for fast lookups
  const productMap = useMemo(() => {
    const map = new Map();
    allProducts.forEach((p) => {
      if (p && p._id) map.set(String(p._id), p);
    });
    return map;
  }, [allProducts]);

  // Search product API if not found locally
  const handleProductSearch = useCallback(async (query) => {
    setProdSearchTerm(query);
    if (!query.trim()) return;
    setLoadingProducts(true);
    try {
      const res = await API.get(`/products/admin/all?search=${encodeURIComponent(query)}&limit=50`);
      if (Array.isArray(res.data?.products)) {
        setAllProducts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p._id)));
          const fresh = res.data.products.filter((p) => !existingIds.has(String(p._id)));
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      console.warn('Error searching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Validation function: checks if requirements are satisfied
  // Admin must fulfill everything to save
  const validationErrors = useMemo(() => {
    const errors = [];

    // 1. Categories Section Validation
    const catSec = curation.categoriesSection;
    if (catSec.mode === 'custom') {
      if (!catSec.title || !catSec.title.trim()) {
        errors.push({
          sectionId: 'categoriesSection',
          sectionName: 'Shop by Department & Category',
          message: 'Title is required for the Category section.'
        });
      }
      const catCount = (catSec.selectedCategoryIds || []).length;
      if (catCount < 2) {
        errors.push({
          sectionId: 'categoriesSection',
          sectionName: 'Shop by Department & Category',
          message: `Category section is set to Custom Curation but has only ${catCount} item(s). You must select at least 2 categories to save.`
        });
      }
    }

    // 2. Trending Section Validation (Must be strictly 8 products)
    const trendSec = curation.trendingSection;
    if (trendSec.mode === 'custom') {
      if (!trendSec.title || !trendSec.title.trim()) {
        errors.push({
          sectionId: 'trendingSection',
          sectionName: 'Handpicked Favorites / Trending',
          message: 'Title is required for the Trending section.'
        });
      }
      const trendCount = (trendSec.selectedProductIds || []).length;
      if (trendCount !== 8) {
        errors.push({
          sectionId: 'trendingSection',
          sectionName: 'Handpicked Favorites / Trending',
          message:
            trendCount < 8
              ? `Trending section requires exactly 8 products (currently ${trendCount}/8 selected). Please select ${8 - trendCount} more product(s) to save.`
              : `Trending section requires exactly 8 products (currently ${trendCount}/8 selected). Please remove ${trendCount - 8} product(s) to save.`
        });
      }
    }

    // 3. New Arrivals Section Validation (Must be strictly 8 products)
    const newSec = curation.newArrivalsSection;
    if (newSec.mode === 'custom') {
      if (!newSec.title || !newSec.title.trim()) {
        errors.push({
          sectionId: 'newArrivalsSection',
          sectionName: 'Fresh Drops / New Arrivals',
          message: 'Title is required for the New Arrivals section.'
        });
      }
      const newCount = (newSec.selectedProductIds || []).length;
      if (newCount !== 8) {
        errors.push({
          sectionId: 'newArrivalsSection',
          sectionName: 'Fresh Drops / New Arrivals',
          message:
            newCount < 8
              ? `New Arrivals section requires exactly 8 products (currently ${newCount}/8 selected). Please select ${8 - newCount} more product(s) to save.`
              : `New Arrivals section requires exactly 8 products (currently ${newCount}/8 selected). Please remove ${newCount - 8} product(s) to save.`
        });
      }
    }

    return errors;
  }, [curation]);

  const isValid = validationErrors.length === 0;

  // Check if there are unsaved modifications
  const hasChanges = useMemo(() => {
    return JSON.stringify(curation) !== JSON.stringify(initialCuration);
  }, [curation, initialCuration]);

  // Mode changer for a section with confirmation prompt
  const handleModeChange = async (sectionId, mode) => {
    if (mode === 'default') {
      const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';
      const curCount = (curation[sectionId]?.[listKey] || []).length;
      if (curCount > 0) {
        const ok = await confirm({
          title: 'Switch to Default Automatic Mode?',
          message: 'This will restore automatic rotation on the live storefront for this section. Are you sure you want to switch?',
          type: 'primary',
          confirmText: 'Yes, Switch to Default',
          cancelText: 'Stay on Custom'
        });
        if (!ok) return;
      }
    }
    setCuration((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        mode
      }
    }));
  };

  // Text title / subtitle updater
  const handleTextChange = (sectionId, field, val) => {
    setCuration((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: val
      }
    }));
  };

  // Reset section text to boutique default
  const handleResetSectionDefaults = (sectionDef) => {
    setCuration((prev) => ({
      ...prev,
      [sectionDef.id]: {
        ...prev[sectionDef.id],
        title: sectionDef.defaultTitle,
        subtitle: sectionDef.defaultSubtitle
      }
    }));
    toast.success(`Reset titles to boutique defaults for "${sectionDef.name}"`);
  };

  // Reorder display position (Move Up / Down)
  const handleMoveItem = (sectionId, index, direction) => {
    const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';
    setCuration((prev) => {
      const currentList = [...(prev[sectionId][listKey] || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentList.length) return prev;

      // Swap items
      const temp = currentList[index];
      currentList[index] = currentList[targetIndex];
      currentList[targetIndex] = temp;

      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [listKey]: currentList
        }
      };
    });
  };

  // Move item directly to top (#1)
  const handleMoveToTop = (sectionId, index) => {
    if (index === 0) return;
    const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';
    setCuration((prev) => {
      const currentList = [...(prev[sectionId][listKey] || [])];
      const [item] = currentList.splice(index, 1);
      currentList.unshift(item);
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [listKey]: currentList
        }
      };
    });
  };

  // Move item directly to bottom
  const handleMoveToBottom = (sectionId, index) => {
    const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';
    setCuration((prev) => {
      const currentList = [...(prev[sectionId][listKey] || [])];
      if (index === currentList.length - 1) return prev;
      const [item] = currentList.splice(index, 1);
      currentList.push(item);
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [listKey]: currentList
        }
      };
    });
  };

  // Remove item from curated list
  const handleRemoveItem = (sectionId, idToRemove) => {
    const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';
    setCuration((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [listKey]: (prev[sectionId][listKey] || []).filter((id) => String(id) !== String(idToRemove))
      }
    }));
  };

  // Add item to curated list (strictly max 8 for product sections)
  const handleAddItem = (sectionId, idToAdd) => {
    const isProductSection = sectionId === 'trendingSection' || sectionId === 'newArrivalsSection';
    const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';

    setCuration((prev) => {
      const currentList = prev[sectionId][listKey] || [];
      if (currentList.some((id) => String(id) === String(idToAdd))) return prev;

      // Strictly limit product sections to 8 products
      if (isProductSection && currentList.length >= 8) {
        toast.error('You can only select exactly 8 products. Please remove an existing product first before adding another.', {
          icon: '⚠️',
          id: 'max-8-products-toast'
        });
        return prev;
      }

      const updated = [...currentList, String(idToAdd)];
      if (isProductSection) {
        if (updated.length === 8) {
          toast.success('🎉 Exactly 8 products selected! Section is ready to publish.', { id: 'product-count-toast' });
        } else {
          toast(`Selected ${updated.length} of 8 products (${8 - updated.length} more needed)`, {
            icon: '📦',
            id: 'product-count-toast'
          });
        }
      }

      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [listKey]: updated
        }
      };
    });
  };

  // Bulk add all active categories
  const handleAddAllActiveCategories = () => {
    const activeIds = allCategories
      .filter((c) => c.isActive !== false)
      .map((c) => String(c._id));

    setCuration((prev) => ({
      ...prev,
      categoriesSection: {
        ...prev.categoriesSection,
        selectedCategoryIds: activeIds
      }
    }));
    toast.success(`Added ${activeIds.length} active categories to curated list!`);
  };

  // Clear curated items for a section with confirmation popup
  const handleClearSectionItems = async (sectionId) => {
    const sec = SECTIONS.find((s) => s.id === sectionId);
    const ok = await confirm({
      title: `Clear All Items in "${sec?.name || 'Section'}"?`,
      message: 'Are you sure you want to remove all currently curated items from this section? You will need to re-select items before saving.',
      type: 'danger',
      confirmText: 'Yes, Clear All',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    const listKey = sectionId === 'categoriesSection' ? 'selectedCategoryIds' : 'selectedProductIds';
    setCuration((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [listKey]: []
      }
    }));
    toast.success('Curated items cleared');
  };

  // Revert all changes with confirmation popup
  const handleResetAll = async () => {
    const ok = await confirm({
      title: 'Discard All Unsaved Changes?',
      message: 'Are you sure you want to revert all changes made since your last publish? Any uncommitted edits to homepage sections will be lost.',
      type: 'warning',
      confirmText: 'Yes, Discard Changes',
      cancelText: 'Keep Editing'
    });
    if (!ok) return;

    setCuration(JSON.parse(JSON.stringify(initialCuration)));
    toast('Reverted all unsaved changes', { icon: '↩️' });
  };

  // Save with confirmation modal ("ask confromation")
  const handleSave = async () => {
    if (!isValid) {
      const firstErr = validationErrors[0];
      toast.error(firstErr.message, { duration: 5000 });
      if (firstErr.sectionId) setActiveSectionId(firstErr.sectionId);
      return;
    }

    const catModeText =
      curation.categoriesSection.mode === 'custom'
        ? `Custom (${curation.categoriesSection.selectedCategoryIds?.length || 0} categories)`
        : 'Default Automatic';
    const trendModeText =
      curation.trendingSection.mode === 'custom'
        ? `Custom (${curation.trendingSection.selectedProductIds?.length || 0} products)`
        : 'Default Automatic';
    const newModeText =
      curation.newArrivalsSection.mode === 'custom'
        ? `Custom (${curation.newArrivalsSection.selectedProductIds?.length || 0} products)`
        : 'Default Automatic';

    const confirmed = await confirm({
      title: 'Publish Homepage Display Settings?',
      message:
        'This will immediately update what visitors see on the storefront homepage (categories, trending favorites, and new arrivals) in your chosen order.',
      type: 'save',
      confirmText: 'Yes, Publish Changes',
      cancelText: 'Keep Editing',
      details: `• Categories: ${catModeText}\n• Trending Favorites: ${trendModeText}\n• Fresh Drops: ${newModeText}`
    });

    if (!confirmed) return;

    setSaving(true);
    const toastId = toast.loading('Publishing homepage display settings...');

    try {
      await API.put('/settings/admin/homepageCuration', {
        value: curation
      });

      setInitialCuration(JSON.parse(JSON.stringify(curation)));
      toast.success('✨ Homepage sections and display order published successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to save homepage curation:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings. Please try again.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Filtered available categories for picker
  const filteredAvailableCategories = useMemo(() => {
    return allCategories.filter((c) => {
      if (catDepartmentFilter !== 'all') {
        const dept = (c.gender || '').toLowerCase();
        if (dept !== catDepartmentFilter.toLowerCase()) return false;
      }
      if (catSearchTerm.trim()) {
        const term = catSearchTerm.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(term);
        const matchesSlug = (c.slug || '').toLowerCase().includes(term);
        if (!matchesName && !matchesSlug) return false;
      }
      return true;
    });
  }, [allCategories, catDepartmentFilter, catSearchTerm]);

  // Filtered available products for picker
  const filteredAvailableProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (prodDepartmentFilter !== 'all') {
        const pDept = (p.gender || p.category?.gender || '').toLowerCase();
        if (pDept !== prodDepartmentFilter.toLowerCase()) return false;
      }
      if (prodCategoryFilter !== 'all') {
        const catId = p.category?._id || p.category;
        if (String(catId) !== String(prodCategoryFilter)) return false;
      }
      if (prodSearchTerm.trim()) {
        const term = prodSearchTerm.toLowerCase();
        const matchesTitle = (p.title || '').toLowerCase().includes(term);
        const matchesTag = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(term));
        if (!matchesTitle && !matchesTag) return false;
      }
      return true;
    });
  }, [allProducts, prodDepartmentFilter, prodCategoryFilter, prodSearchTerm]);

  const currentSection = SECTIONS.find((s) => s.id === activeSectionId) || SECTIONS[0];
  const currentSectionData = curation[activeSectionId] || DEFAULT_CURATION_STATE[activeSectionId];

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-neutral-200/80 shadow-xs flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-semibold text-neutral-600">Loading Homepage Display & Curation Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent-100 text-accent-900 border border-accent-200">
                <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-700" />
                Storefront Homepage Curation
              </span>
              {hasChanges && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
              Homepage Sections & Display Order
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
              Choose what items are displayed in the 3 core homepage sections:{' '}
              <span className="font-semibold text-neutral-700">Shop by Department & Category</span>,{' '}
              <span className="font-semibold text-neutral-700">Trending This Season</span>, and{' '}
              <span className="font-semibold text-neutral-700">Fresh Drops</span>. Rearrange display order (#1, #2, #3...) to highlight your best merchandise.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {hasChanges && (
              <button
                type="button"
                onClick={handleResetAll}
                disabled={saving}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <HiOutlineRefresh className="w-4 h-4" />
                <span>Revert Changes</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                isValid
                  ? 'bg-primary hover:bg-primary-900 text-white shadow-primary/20 hover:scale-[1.02]'
                  : 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
              }`}
              title={isValid ? 'Publish to live storefront' : 'Resolve all validation errors before saving'}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <HiOutlineCheck className="w-4 h-4 text-accent-300" />
                  <span>Save & Publish Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Warning Alert (If Requirements are Incomplete) */}
        {!isValid && (
          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
            <HiOutlineExclamationCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1 text-xs">
              <p className="font-bold text-sm text-amber-950">Incomplete Requirements Before Publishing:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                {validationErrors.map((err, i) => (
                  <li key={i}>
                    <span className="font-semibold">{err.sectionName}:</span> {err.message}{' '}
                    <button
                      type="button"
                      onClick={() => setActiveSectionId(err.sectionId)}
                      className="ml-2 font-bold text-primary underline hover:text-primary-900 cursor-pointer"
                    >
                      Jump to Section →
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 italic pt-1">
                Note: Trending Favorites and Fresh Drops sections must have strictly 8 products selected (not more, not less) to completely fill the 4×2 storefront layout.
              </p>
            </div>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const secData = curation[sec.id];
            const isCustom = secData.mode === 'custom';
            const count =
              sec.type === 'categories'
                ? secData.selectedCategoryIds?.length || 0
                : secData.selectedProductIds?.length || 0;
            const hasError = validationErrors.some((e) => e.sectionId === sec.id);
            const isTabActive = activeSectionId === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`p-4 rounded-2xl text-left transition-all border cursor-pointer relative flex flex-col justify-between ${
                  isTabActive
                    ? 'bg-primary-950 text-white border-primary shadow-lg ring-2 ring-primary/20'
                    : 'bg-neutral-50/80 hover:bg-neutral-100 text-neutral-800 border-neutral-200/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isTabActive ? 'bg-primary text-accent-300' : 'bg-white text-neutral-600 shadow-xs'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm line-clamp-1">{sec.name}</h3>
                      <p className={`text-[11px] ${isTabActive ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {isCustom ? `Custom: ${count} items` : 'Default: Automatic'}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  {hasError ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      Action Needed
                    </span>
                  ) : isCustom ? (
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sec.type === 'products'
                          ? count === 8
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                          : isTabActive
                          ? 'bg-accent-500 text-white'
                          : 'bg-accent-100 text-accent-800'
                      }`}
                    >
                      {sec.type === 'products'
                        ? count === 8
                          ? '8/8 Complete ✓'
                          : `Need 8 (${count}/8)`
                        : `Curated (${count})`}
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isTabActive ? 'bg-white/10 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      Default
                    </span>
                  )}
                </div>

                <div className="text-[11px] flex items-center justify-between pt-2 border-t border-white/10">
                  <span className={`${isTabActive ? 'text-accent-300' : 'text-primary'} font-semibold truncate`}>
                    "{secData.title || sec.defaultTitle}"
                  </span>
                  <HiOutlineChevronRight className={`w-4 h-4 ${isTabActive ? 'text-accent-400' : 'text-neutral-400'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Editor Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-8">
        {/* Section Heading & Mode Selector */}
        <div className="space-y-6 pb-6 border-b border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-accent-100 text-accent-800">
                  <currentSection.icon className="w-4 h-4" />
                </span>
                <h3 className="font-serif text-xl font-bold text-neutral-900">{currentSection.name}</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">{currentSection.desc}</p>
            </div>

            {/* Mode Switcher: Default vs Custom */}
            <div className="inline-flex p-1 bg-neutral-100 rounded-2xl border border-neutral-200 shrink-0">
              <button
                type="button"
                onClick={() => handleModeChange(currentSection.id, 'default')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentSectionData.mode === 'default'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <HiOutlineRefresh className="w-3.5 h-3.5" />
                <span>Default (Automatic)</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange(currentSection.id, 'custom')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentSectionData.mode === 'custom'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-300" />
                <span>Custom Curation</span>
              </button>
            </div>
          </div>

          {/* Title & Subtitle Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                Section Main Title (Heading)
              </label>
              <input
                type="text"
                value={currentSectionData.title || ''}
                onChange={(e) => handleTextChange(currentSection.id, 'title', e.target.value)}
                placeholder={currentSection.defaultTitle}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-neutral-700">Section Subtitle / Tagline</label>
                <button
                  type="button"
                  onClick={() => handleResetSectionDefaults(currentSection)}
                  className="text-[11px] font-bold text-accent-800 hover:text-accent-950 underline cursor-pointer"
                >
                  Reset Titles to Default
                </button>
              </div>
              <input
                type="text"
                value={currentSectionData.subtitle || ''}
                onChange={(e) => handleTextChange(currentSection.id, 'subtitle', e.target.value)}
                placeholder={currentSection.defaultSubtitle}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Content depending on Mode */}
        {currentSectionData.mode === 'default' ? (
          /* DEFAULT AUTOMATIC MODE STATE */
          <div className="bg-neutral-50/80 rounded-2xl p-8 border border-dashed border-neutral-300 text-center space-y-4">
            <div className="w-14 h-14 bg-white rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-center mx-auto text-primary">
              <HiOutlineRefresh className="w-7 h-7 text-accent-600 animate-spin-slow" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="font-serif text-lg font-bold text-neutral-900">
                Default Automatic Selection is Active
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {currentSection.type === 'categories'
                  ? 'The boutique algorithm automatically balances top-level active categories across Women, Men, and Kids departments, ensuring active department filters are respected.'
                  : currentSection.id === 'trendingSection'
                  ? 'The boutique algorithm automatically displays featured bestseller products and high-demand pieces balanced across active departments.'
                  : 'The boutique algorithm automatically serves the latest dress drops ordered by arrival date.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleModeChange(currentSection.id, 'custom')}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-xs cursor-pointer"
            >
              <HiOutlineSparkles className="w-4 h-4 text-accent-600" />
              <span>Switch to Custom Handpicked Curation</span>
            </button>
          </div>
        ) : (
          /* CUSTOM CURATION MODE STATE */
          <div className="space-y-8">
            {/* Curated List (Display Order) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-neutral-900">Curated Display Order</h4>
                    {currentSection.type === 'products' ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                          (currentSectionData.selectedProductIds || []).length === 8
                            ? 'bg-emerald-600 text-white'
                            : (currentSectionData.selectedProductIds || []).length < 8
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-red-100 text-red-900 border border-red-300'
                        }`}
                      >
                        {(currentSectionData.selectedProductIds || []).length === 8
                          ? '8/8 Selected (Complete ✓)'
                          : (currentSectionData.selectedProductIds || []).length < 8
                          ? `${(currentSectionData.selectedProductIds || []).length}/8 Selected (Need ${8 - (currentSectionData.selectedProductIds || []).length} more)`
                          : `${(currentSectionData.selectedProductIds || []).length}/8 Selected (Remove ${(currentSectionData.selectedProductIds || []).length - 8})`}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-white">
                        {(currentSectionData.selectedCategoryIds || []).length} Categories
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {currentSection.type === 'products' ? (
                      <>
                        Select <span className="font-bold text-neutral-800">exactly 8 products</span> (not more or less) to fill the 4×2 storefront layout. Use <span className="font-semibold text-neutral-700">Move Up (▲)</span> and <span className="font-semibold text-neutral-700">Move Down (▼)</span> to change order (#1 to #8).
                      </>
                    ) : (
                      <>
                        Use <span className="font-semibold text-neutral-700">Move Up (▲)</span> and <span className="font-semibold text-neutral-700">Move Down (▼)</span> to change exact display position (#1, #2, #3...) on the homepage.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {currentSection.type === 'categories' && (
                    <button
                      type="button"
                      onClick={handleAddAllActiveCategories}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary-50 hover:bg-primary-100 border border-primary/20 transition-all cursor-pointer"
                    >
                      + Add All Active Categories
                    </button>
                  )}
                  {((currentSection.type === 'categories'
                    ? currentSectionData.selectedCategoryIds
                    : currentSectionData.selectedProductIds) || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearSectionItems(currentSection.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* CURATED LIST RENDERING */}
              {currentSection.type === 'categories' ? (
                /* CATEGORY ORDER LIST */
                <CuratedCategoryList
                  selectedIds={currentSectionData.selectedCategoryIds || []}
                  categoryMap={categoryMap}
                  onMove={handleMoveItem}
                  onMoveToTop={handleMoveToTop}
                  onMoveToBottom={handleMoveToBottom}
                  onRemove={handleRemoveItem}
                  sectionId={currentSection.id}
                />
              ) : (
                /* PRODUCT ORDER LIST */
                <CuratedProductList
                  selectedIds={currentSectionData.selectedProductIds || []}
                  productMap={productMap}
                  onMove={handleMoveItem}
                  onMoveToTop={handleMoveToTop}
                  onMoveToBottom={handleMoveToBottom}
                  onRemove={handleRemoveItem}
                  sectionId={currentSection.id}
                />
              )}
            </div>

            {/* ITEM PICKER BROWSER */}
            <div className="pt-6 border-t border-neutral-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <HiOutlineShoppingBag className="w-4 h-4 text-accent-700" />
                    <span>
                      {currentSection.type === 'categories'
                        ? 'Select Categories Across Departments'
                        : 'Select Products to Add'}
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Click <span className="font-semibold text-primary">+ Add to Section</span> below. New items are appended to the curated list where you can reorder them.
                  </p>
                </div>
              </div>

              {/* CATEGORY PICKER */}
              {currentSection.type === 'categories' ? (
                <div className="space-y-4">
                  {/* Department and Search filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    {/* Department tabs: All, Women, Men, Kids, Unisex */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {['all', 'women', 'men', 'kids', 'unisex'].map((dept) => {
                        const active = catDepartmentFilter === dept;
                        const label =
                          dept === 'all'
                            ? 'All Departments'
                            : dept === 'women'
                            ? "Women's Studio"
                            : dept === 'men'
                            ? "Men's Studio"
                            : dept === 'kids'
                            ? "Kids' Studio"
                            : 'Unisex';
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setCatDepartmentFilter(dept)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search box */}
                    <div className="relative sm:w-64">
                      <HiOutlineSearch className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={catSearchTerm}
                        onChange={(e) => setCatSearchTerm(e.target.value)}
                        placeholder="Search category name..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {catSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setCatSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <HiOutlineX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1 border border-neutral-100 rounded-2xl">
                    {filteredAvailableCategories.map((cat) => {
                      const isAdded = (currentSectionData.selectedCategoryIds || []).includes(String(cat._id));
                      const orderIdx = (currentSectionData.selectedCategoryIds || []).indexOf(String(cat._id));

                      return (
                        <div
                          key={cat._id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                            isAdded
                              ? 'bg-accent-50/60 border-accent-300 ring-1 ring-accent-400/40'
                              : 'bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-xs'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100">
                              <img
                                src={getImageUrl(cat.image, CATEGORY_FALLBACK)}
                                alt={cat.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {isAdded && (
                                <div className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs">
                                  #{orderIdx + 1}
                                </div>
                              )}
                              {cat.gender && (
                                <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md">
                                  {cat.gender}
                                </span>
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-neutral-900 line-clamp-1" title={cat.name}>
                                {cat.name}
                              </h5>
                              <p className="text-[10px] text-neutral-400 truncate">
                                {cat.parent?.name ? `In ${cat.parent.name}` : 'Main Category'}
                              </p>
                            </div>
                          </div>

                          {isAdded ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(currentSection.id, cat._id)}
                              className="w-full py-1.5 rounded-xl text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <HiOutlineX className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddItem(currentSection.id, cat._id)}
                              className="w-full py-1.5 rounded-xl text-[11px] font-bold text-primary bg-primary-50 hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>+ Add</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* PRODUCT PICKER */
                <div className="space-y-4">
                  {/* Department, Category, and Search filters */}
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Department tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {['all', 'women', 'men', 'kids'].map((dept) => {
                          const active = prodDepartmentFilter === dept;
                          return (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => setProdDepartmentFilter(dept)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                active
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              }`}
                            >
                              {dept === 'all' ? 'All Depts' : dept.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>

                      {/* Category dropdown */}
                      <select
                        value={prodCategoryFilter}
                        onChange={(e) => setProdCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="all">All Categories</option>
                        {allCategories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.gender})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search box */}
                    <div className="relative md:w-64">
                      <HiOutlineSearch className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={prodSearchTerm}
                        onChange={(e) => handleProductSearch(e.target.value)}
                        placeholder="Search product title / tag..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {prodSearchTerm && (
                        <button
                          type="button"
                          onClick={() => handleProductSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <HiOutlineX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1 border border-neutral-100 rounded-2xl">
                    {loadingProducts ? (
                      <div className="col-span-full py-8 text-center text-xs text-neutral-500">
                        Searching products...
                      </div>
                    ) : filteredAvailableProducts.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-xs text-neutral-500">
                        No products match your filter. Try searching by keyword above.
                      </div>
                    ) : (
                      filteredAvailableProducts.map((prod) => {
                        const isAdded = (currentSectionData.selectedProductIds || []).includes(String(prod._id));
                        const orderIdx = (currentSectionData.selectedProductIds || []).indexOf(String(prod._id));
                        const mainImg = prod.images?.[0] || prod.image;

                        return (
                          <div
                            key={prod._id}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                              isAdded
                                ? 'bg-accent-50/60 border-accent-300 ring-1 ring-accent-400/40'
                                : 'bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-xs'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-100">
                                <img
                                  src={getImageUrl(mainImg, PRODUCT_FALLBACK_1)}
                                  alt={prod.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {isAdded && (
                                  <div className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs">
                                    #{orderIdx + 1}
                                  </div>
                                )}
                                {prod.gender && (
                                  <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md">
                                    {prod.gender}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-neutral-900 line-clamp-1" title={prod.title}>
                                  {prod.title}
                                </h5>
                                <p className="text-[11px] font-extrabold text-primary">
                                  {formatPrice(prod.salePrice || prod.price)}
                                </p>
                              </div>
                            </div>

                            {isAdded ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(currentSection.id, prod._id)}
                                className="w-full py-1.5 rounded-xl text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <HiOutlineX className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddItem(currentSection.id, prod._id)}
                                disabled={(currentSectionData.selectedProductIds || []).length >= 8}
                                className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                  (currentSectionData.selectedProductIds || []).length >= 8
                                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                                    : 'text-primary bg-primary-50 hover:bg-primary hover:text-white cursor-pointer shadow-2xs'
                                }`}
                                title={
                                  (currentSectionData.selectedProductIds || []).length >= 8
                                    ? '8 products are already selected. Remove one from the curated list above to add this one.'
                                    : 'Add to curated products'
                                }
                              >
                                <span>{(currentSectionData.selectedProductIds || []).length >= 8 ? '8/8 Max Selected' : '+ Add'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-component: Curated Category List with Move Up/Down
// -------------------------------------------------------------
function CuratedCategoryList({
  selectedIds = [],
  categoryMap,
  onMove,
  onMoveToTop,
  onMoveToBottom,
  onRemove,
  sectionId
}) {
  if (selectedIds.length === 0) {
    return (
      <div className="p-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 text-center space-y-2">
        <p className="text-xs font-bold text-neutral-700">No categories selected yet</p>
        <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
          Choose categories from the catalog list below to showcase in this homepage section. You must select at least 2 categories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedIds.map((id, index) => {
        const cat = categoryMap.get(String(id));
        const isFirst = index === 0;
        const isLast = index === selectedIds.length - 1;

        return (
          <div
            key={id}
            className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 transition-all shadow-xs"
          >
            {/* Position and Category Info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-7 h-7 shrink-0 rounded-xl bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center border border-primary/20">
                #{index + 1}
              </span>

              <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                <img
                  src={getImageUrl(cat?.image, CATEGORY_FALLBACK)}
                  alt={cat?.name || 'Category'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-neutral-900 truncate">
                    {cat?.name || `Category ID: ${id}`}
                  </h5>
                  {cat?.gender && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                      {cat.gender}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 truncate">
                  Display Position #{index + 1} on Homepage
                </p>
              </div>
            </div>

            {/* Reorder and Remove Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Move Up */}
              <button
                type="button"
                onClick={() => onMove(sectionId, index, 'up')}
                disabled={isFirst}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isFirst
                    ? 'text-neutral-300 cursor-not-allowed bg-neutral-50'
                    : 'text-neutral-700 bg-neutral-100 hover:bg-primary hover:text-white shadow-xs'
                }`}
                title="Move Up"
              >
                <HiOutlineArrowUp className="w-3.5 h-3.5" />
              </button>

              {/* Move Down */}
              <button
                type="button"
                onClick={() => onMove(sectionId, index, 'down')}
                disabled={isLast}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isLast
                    ? 'text-neutral-300 cursor-not-allowed bg-neutral-50'
                    : 'text-neutral-700 bg-neutral-100 hover:bg-primary hover:text-white shadow-xs'
                }`}
                title="Move Down"
              >
                <HiOutlineArrowDown className="w-3.5 h-3.5" />
              </button>

              {/* Quick Move to Top */}
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => onMoveToTop(sectionId, index)}
                  className="hidden sm:inline-flex px-2 py-1.5 rounded-xl text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                  title="Move to First Position (#1)"
                >
                  To Top
                </button>
              )}

              {/* Remove */}
              <button
                type="button"
                onClick={() => onRemove(sectionId, id)}
                className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer ml-1"
                title="Remove from curated list"
              >
                <HiOutlineX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-component: Curated Product List with Move Up/Down
// -------------------------------------------------------------
function CuratedProductList({
  selectedIds = [],
  productMap,
  onMove,
  onMoveToTop,
  onMoveToBottom,
  onRemove,
  sectionId
}) {
  if (selectedIds.length === 0) {
    return (
      <div className="p-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 text-center space-y-2">
        <p className="text-xs font-bold text-neutral-700">No products selected yet</p>
        <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
          Choose dresses and products from the catalog list below to showcase in this section. You must select <span className="font-bold text-neutral-800">exactly 8 products</span> (not more or less).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedIds.map((id, index) => {
        const prod = productMap.get(String(id));
        const isFirst = index === 0;
        const isLast = index === selectedIds.length - 1;
        const mainImg = prod?.images?.[0] || prod?.image;

        return (
          <div
            key={id}
            className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 transition-all shadow-xs"
          >
            {/* Position and Product Info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-7 h-7 shrink-0 rounded-xl bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center border border-primary/20">
                #{index + 1}
              </span>

              <div className="w-11 h-14 shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                <img
                  src={getImageUrl(mainImg, PRODUCT_FALLBACK_1)}
                  alt={prod?.title || 'Product'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-neutral-900 truncate">
                    {prod?.title || `Product ID: ${id}`}
                  </h5>
                  {prod?.gender && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                      {prod.gender}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                  <span className="font-bold text-primary">
                    {prod ? formatPrice(prod.salePrice || prod.price) : ''}
                  </span>
                  <span>•</span>
                  <span>Display Position #{index + 1} on Homepage</span>
                </div>
              </div>
            </div>

            {/* Reorder and Remove Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Move Up */}
              <button
                type="button"
                onClick={() => onMove(sectionId, index, 'up')}
                disabled={isFirst}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isFirst
                    ? 'text-neutral-300 cursor-not-allowed bg-neutral-50'
                    : 'text-neutral-700 bg-neutral-100 hover:bg-primary hover:text-white shadow-xs'
                }`}
                title="Move Up"
              >
                <HiOutlineArrowUp className="w-3.5 h-3.5" />
              </button>

              {/* Move Down */}
              <button
                type="button"
                onClick={() => onMove(sectionId, index, 'down')}
                disabled={isLast}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isLast
                    ? 'text-neutral-300 cursor-not-allowed bg-neutral-50'
                    : 'text-neutral-700 bg-neutral-100 hover:bg-primary hover:text-white shadow-xs'
                }`}
                title="Move Down"
              >
                <HiOutlineArrowDown className="w-3.5 h-3.5" />
              </button>

              {/* Quick Move to Top */}
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => onMoveToTop(sectionId, index)}
                  className="hidden sm:inline-flex px-2 py-1.5 rounded-xl text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                  title="Move to First Position (#1)"
                >
                  To Top
                </button>
              )}

              {/* Remove */}
              <button
                type="button"
                onClick={() => onRemove(sectionId, id)}
                className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer ml-1"
                title="Remove from curated list"
              >
                <HiOutlineX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
