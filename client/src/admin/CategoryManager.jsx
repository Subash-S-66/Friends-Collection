import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineFolder,
  HiOutlineTag,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineSearch,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlinePhotograph,
  HiOutlineShoppingBag,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineArrowRight,
  HiOutlineArrowLeft
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const CategoryManager = () => {
  const { confirm } = useConfirm();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedItemsCatId, setExpandedItemsCatId] = useState(null);

  // View mode: 'table' (default) or 'cards'
  const [viewMode, setViewMode] = useState('table');

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'main', 'sub'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Pagination states
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search, department, type, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, genderFilter, typeFilter, statusFilter, itemsPerPage]);

  // Form states for Add / Edit
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [gender, setGender] = useState('women');
  const [priority, setPriority] = useState('1');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [hiddenDepartments, setHiddenDepartments] = useState([]);
  const [togglingDept, setTogglingDept] = useState(false);
  const [togglingDeptAction, setTogglingDeptAction] = useState(null);

  const fetchCategories = async (silent = false) => {
    if (!silent && categories.length === 0) setLoading(true);
    try {
      const [catRes, prodRes, settingsRes] = await Promise.all([
        API.get('/categories/admin/all'),
        API.get('/products/admin/all?limit=300').catch(() => ({ data: [] })),
        API.get('/settings').catch(() => ({ data: {} }))
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      const prods = Array.isArray(prodRes.data?.products)
        ? prodRes.data.products
        : (Array.isArray(prodRes.data) ? prodRes.data : []);
      setProducts(prods);
      if (Array.isArray(settingsRes?.data?.hiddenDepartments)) {
        setHiddenDepartments(
          settingsRes.data.hiddenDepartments
            .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
            .filter(Boolean)
        );
      }
    } catch (err) {
      console.error('Error fetching categories & products:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartmentVisibility = async (deptKey) => {
    const isCurrentlyHidden = hiddenDepartments.includes(deptKey);
    const newIsActive = isCurrentlyHidden; // If hidden, make active (true); if active, make hidden (false)
    const names = { women: "Women's Studio", men: "Men's Studio", kids: "Kids' Studio" };
    const deptName = names[deptKey] || deptKey;

    const catCount = safeCategories.filter((c) => {
      const g = (c.gender || 'women').toLowerCase();
      return g === deptKey || (deptKey === 'women' && (!c.gender || c.gender === 'women'));
    }).length;

    // Safety guard when turning OFF: at least one department must remain visible
    if (!newIsActive) {
      const allDepts = ['women', 'men', 'kids'];
      const activeDepts = allDepts.filter((k) => !hiddenDepartments.includes(k));
      if (activeDepts.length <= 1 && activeDepts.includes(deptKey)) {
        toast.error('At least one department must remain visible on the store.');
        return;
      }
    }

    // Confirmation Popup before turning ON or turning OFF
    const ok = await confirm({
      title: newIsActive
        ? `Turn ON Entire ${deptName}?`
        : `Turn OFF Entire ${deptName}?`,
      message: newIsActive
        ? `This will restore ${deptName} across the storefront navigation bar, shop catalog, filters, search, and homepage, and reactivate all ${catCount} categories.`
        : `This will immediately hide ${deptName} everywhere (navigation bar, mega-menu, shop catalog, filters, homepage, search) from customers, and turn off all ${catCount} categories. Are you sure?`,
      type: newIsActive ? 'primary' : 'danger',
      confirmText: newIsActive ? `Yes, Turn ON ${deptName}` : `Yes, Turn OFF ${deptName}`,
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setTogglingDept(deptKey);
    setTogglingDeptAction(newIsActive ? 'on' : 'off');
    const toastId = toast.loading(
      newIsActive ? `Turning ON entire ${deptName}...` : `Turning OFF entire ${deptName}...`
    );

    // Optimistically update local categories & hiddenDepartments (both parent categories and nested subcategories)
    setCategories((prev) => {
      const parentIds = new Set(
        prev
          .filter((c) => {
            const catGender = (c.gender || 'women').toLowerCase();
            return catGender === deptKey || (deptKey === 'women' && (!c.gender || c.gender === 'women'));
          })
          .map((c) => String(c._id))
      );

      return prev.map((c) => {
        const catGender = (c.gender || 'women').toLowerCase();
        const isDirect = catGender === deptKey || (deptKey === 'women' && (!c.gender || c.gender === 'women'));
        const isChild = c.parent && parentIds.has(String(c.parent._id || c.parent));
        if (isDirect || isChild) {
          return { ...c, isActive: newIsActive };
        }
        return c;
      });
    });

    if (newIsActive) {
      setHiddenDepartments((prev) => prev.filter((d) => d !== deptKey));
    } else {
      setHiddenDepartments((prev) => (prev.includes(deptKey) ? prev : [...prev, deptKey]));
    }

    try {
      const res = await API.patch(`/categories/admin/department/${deptKey}/toggle`, {
        isActive: newIsActive
      });
      toast.success(res.data?.message || `Entire ${deptName} updated successfully!`, { id: toastId });
      await fetchCategories(true);
    } catch (err) {
      console.error('Error toggling entire department:', err);
      toast.error(err.response?.data?.message || 'Failed to update department visibility', { id: toastId });
      fetchCategories(true);
    } finally {
      setTogglingDept(null);
      setTogglingDeptAction(null);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Get products inside a category
  const getCategoryProducts = (catId) =>
    products.filter(
      (p) => (p.category?._id || p.category) === catId || (p.subcategory?._id || p.subcategory) === catId
    );

  // Separate parent categories from subcategories
  const safeCategories = Array.isArray(categories) ? categories : [];
  const parentCategories = safeCategories.filter((c) => c && !c.parent);

  // Get subcategories for a given parent ID
  const getSubcategories = (pId) =>
    safeCategories.filter((c) => c && c.parent && ((c.parent._id || c.parent) === pId));

  // Quick visibility toggle in table
  const handleToggleStatus = async (cat) => {
    setTogglingId(cat._id);
    const updatedStatus = !cat.isActive;

    // Optimistic UI update: cascade to child subcategories if toggling a main category
    setCategories((prev) =>
      prev.map((c) => {
        if (c._id === cat._id) return { ...c, isActive: updatedStatus };
        if (!cat.parent && c.parent && ((c.parent._id || c.parent) === cat._id)) {
          return { ...c, isActive: updatedStatus };
        }
        return c;
      })
    );

    try {
      let res;
      try {
        res = await API.patch(`/categories/admin/${cat._id}/toggle`);
      } catch {
        res = await API.put(`/categories/admin/${cat._id}`, { isActive: updatedStatus });
      }
      const cascadeCount = res?.data?.cascadeCount || 0;
      toast.success(
        cascadeCount > 0
          ? `"${cat.name}" and ${cascadeCount} subcategories are now ${updatedStatus ? 'VISIBLE' : 'HIDDEN'} on store`
          : `"${cat.name}" is now ${updatedStatus ? 'VISIBLE' : 'HIDDEN'} on store`,
        { icon: updatedStatus ? '👁️' : '🙈' }
      );
      fetchCategories(true);
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Failed to update visibility');
      fetchCategories(true);
    } finally {
      setTogglingId(null);
    }
  };

  // Open modal for adding a new category
  const openAddModal = (presetParentId = '', presetGender = 'women') => {
    setEditingCategory(null);
    setName('');
    setParentId(presetParentId || '');
    setGender(presetGender);
    setPriority((categories.length + 1).toString());
    setDescription('');
    setIsActive(true);
    setImageFile(null);
    setImagePreview('');
    setModalOpen(true);
  };

  // Open modal for editing an existing category
  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setParentId(cat.parent?._id || cat.parent || '');
    setGender(cat.gender || 'women');
    setPriority(cat.priority?.toString() || '1');
    setDescription(cat.description || '');
    setIsActive(cat.isActive !== false);
    setImageFile(null);
    setImagePreview(cat.image ? getImageUrl(cat.image) : '');
    setModalOpen(true);
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const isEditing = Boolean(editingCategory);
    const ok = await confirm({
      title: isEditing ? 'Save Category Changes?' : 'Create Category?',
      message: isEditing
        ? `Are you sure you want to save updates to category "${name.trim()}"?`
        : `Are you sure you want to create category "${name.trim()}"?`,
      type: 'save',
      confirmText: isEditing ? 'Save Changes' : 'Create Category',
      cancelText: 'Keep Editing',
      details: `Department: ${gender.toUpperCase()} • Type: ${parentId ? 'Subcategory' : 'Main Department'}`
    });
    if (!ok) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('parent', parentId || '');
      formData.append('gender', gender);
      formData.append('priority', priority || '0');
      formData.append('description', description.trim());
      formData.append('isActive', isActive);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingCategory) {
        await API.put(`/categories/admin/${editingCategory._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Category "${name}" updated successfully!`);
      } else {
        await API.post('/categories/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(parentId ? `Sub-category "${name}" created!` : `Main category "${name}" created!`);
      }

      setModalOpen(false);
      fetchCategories(true);
    } catch (err) {
      console.error('Save category error:', err);
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // Delete category handler
  const handleDelete = async (cat, isParent = false) => {
    const subsCount = isParent ? getSubcategories(cat._id).length : 0;
    const msg = isParent && subsCount > 0
      ? `Deleting "${cat.name}" will also remove ${subsCount} nested subcategory varieties. Continue?`
      : `Are you sure you want to delete "${cat.name}"?`;

    const ok = await confirm({
      title: 'Delete Category?',
      message: msg,
      type: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    try {
      await API.delete(`/categories/admin/${cat._id}`);
      toast.success('Category deleted successfully');
      fetchCategories(true);
    } catch {
      toast.error('Failed to delete category');
    }
  };

  // Filtered categories for Table view
  const filteredCategories = safeCategories.filter((cat) => {
    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchesName = cat.name.toLowerCase().includes(query);
      const matchesSlug = cat.slug.toLowerCase().includes(query);
      const matchesParent = cat.parent?.name?.toLowerCase().includes(query);
      if (!matchesName && !matchesSlug && !matchesParent) return false;
    }

    // Gender filter
    if (genderFilter !== 'all') {
      if (cat.gender !== genderFilter && cat.gender !== 'all') return false;
    }

    // Type filter
    if (typeFilter === 'main' && cat.parent) return false;
    if (typeFilter === 'sub' && !cat.parent) return false;

    // Status filter
    if (statusFilter === 'active' && !cat.isActive) return false;
    if (statusFilter === 'inactive' && cat.isActive) return false;

    return true;
  });

  // Pagination calculations
  const totalItems = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Helper for pagination page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Department counts
  const womenCount = safeCategories.filter((c) => c.gender === 'women' || !c.gender).length;
  const menCount = safeCategories.filter((c) => c.gender === 'men').length;
  const kidsCount = safeCategories.filter((c) => c.gender === 'kids').length;
  const unisexCount = safeCategories.filter((c) => c.gender === 'all').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            Category & Subcategory Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Manage storefront taxonomy for Women, Men, Kids, and Unisex collections. Toggle visibility or edit details in table format.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle (Table vs Cards) */}
          <div className="bg-neutral-100 p-1 rounded-xl flex items-center border border-neutral-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white text-primary shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Table Format View"
            >
              <HiOutlineViewList className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-white text-primary shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Hierarchical Cards View"
            >
              <HiOutlineViewGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Add Category Button */}
          <button
            onClick={() => openAddModal('', genderFilter !== 'all' ? genderFilter : 'women')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light active:scale-95 text-white text-xs font-bold shadow-md transition-all"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {/* Storefront Department Visibility Master Control Panel */}
      <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-primary-950 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-accent-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                Storefront Department Visibility Control
              </h2>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Turn OFF any section below to immediately hide it everywhere (Navigation, Shop catalog, filters, search, trending) from customers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hiddenDepartments.length > 0 ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                🔒 {hiddenDepartments.length} Section{hiddenDepartments.length > 1 ? 's' : ''} Hidden
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                ✨ All Departments Live
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { key: 'women', name: "Women's Studio", emoji: '🌸', count: womenCount, desc: 'Sarees, Kurtis, Lehengas' },
            { key: 'men', name: "Men's Studio", emoji: '👔', count: menCount, desc: 'Shirts, Kurtas, Trousers' },
            { key: 'kids', name: "Kids' Studio", emoji: '🧒', count: kidsCount, desc: 'Boys Ethnic, Girls Pavadai' }
          ].map((dept) => {
            const isHidden = hiddenDepartments.includes(dept.key);
            return (
              <div
                key={dept.key}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isHidden
                    ? 'bg-white/5 border-white/10 opacity-75'
                    : 'bg-white/10 border-accent-300/30 shadow-inner'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl shrink-0">{dept.emoji}</span>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{dept.name}</span>
                      <span
                        className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-extrabold ${
                          isHidden ? 'bg-neutral-800 text-neutral-300 border border-white/10' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isHidden ? 'Hidden' : 'Live'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-300 block truncate">
                      {dept.count} categories • {dept.desc}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={Boolean(togglingDept)}
                  onClick={() => toggleDepartmentVisibility(dept.key)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    togglingDept === dept.key
                      ? 'bg-white/20 text-white cursor-wait'
                      : isHidden
                      ? 'bg-accent-500 hover:bg-accent-400 text-primary-950 shadow-md active:scale-95'
                      : 'bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-neutral-200 border border-white/20 active:scale-95'
                  }`}
                  title={isHidden ? `Click to Show ${dept.name} on storefront` : `Click to Hide ${dept.name} from storefront`}
                >
                  {togglingDept === dept.key ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>{togglingDeptAction === 'on' ? 'Turning ON...' : 'Turning OFF...'}</span>
                    </>
                  ) : (
                    <span>{isHidden ? 'Show on Store' : 'Hide Section'}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Tabs & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-3.5">
        {/* Department Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                genderFilter === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All Departments ({safeCategories.length})
            </button>
            <button
              onClick={() => setGenderFilter('women')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                genderFilter === 'women'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>🌸 Women ({womenCount})</span>
              {hiddenDepartments.includes('women') && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/30 text-white">Hidden</span>
              )}
            </button>
            <button
              onClick={() => setGenderFilter('men')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                genderFilter === 'men'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>👔 Men ({menCount})</span>
              {hiddenDepartments.includes('men') && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/30 text-white">Hidden</span>
              )}
            </button>
            <button
              onClick={() => setGenderFilter('kids')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                genderFilter === 'kids'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>🧒 Kids ({kidsCount})</span>
              {hiddenDepartments.includes('kids') && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/30 text-white">Hidden</span>
              )}
            </button>
            {unisexCount > 0 && (
              <button
                onClick={() => setGenderFilter('all')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              >
                ✨ Unisex ({unisexCount})
              </button>
            )}
          </div>

          {/* Master 1-Click Button to Turn Off / Turn On Entire Department */}
          <div className="flex items-center gap-2">
            {genderFilter === 'kids' && (
              <button
                type="button"
                disabled={Boolean(togglingDept)}
                onClick={() => toggleDepartmentVisibility('kids')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  togglingDept === 'kids'
                    ? 'bg-neutral-700 text-white cursor-wait opacity-90'
                    : hiddenDepartments.includes('kids')
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {togglingDept === 'kids' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{togglingDeptAction === 'on' ? 'Turning ON Kids Department...' : 'Turning OFF Kids Department...'}</span>
                  </>
                ) : hiddenDepartments.includes('kids') ? (
                  <>
                    <HiOutlineEye className="w-4 h-4" />
                    <span>✨ Turn ON Entire Kids Department (Show on Store & Navbar)</span>
                  </>
                ) : (
                  <>
                    <HiOutlineEyeOff className="w-4 h-4" />
                    <span>🔒 Turn OFF Entire Kids Department (Hide from Store & Navbar)</span>
                  </>
                )}
              </button>
            )}

            {genderFilter === 'women' && (
              <button
                type="button"
                disabled={Boolean(togglingDept)}
                onClick={() => toggleDepartmentVisibility('women')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  togglingDept === 'women'
                    ? 'bg-neutral-700 text-white cursor-wait opacity-90'
                    : hiddenDepartments.includes('women')
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {togglingDept === 'women' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{togglingDeptAction === 'on' ? "Turning ON Women's Department..." : "Turning OFF Women's Department..."}</span>
                  </>
                ) : hiddenDepartments.includes('women') ? (
                  <>
                    <HiOutlineEye className="w-4 h-4" />
                    <span>✨ Turn ON Entire Women&apos;s Department</span>
                  </>
                ) : (
                  <>
                    <HiOutlineEyeOff className="w-4 h-4" />
                    <span>🔒 Turn OFF Entire Women&apos;s Department (Hide from Store & Navbar)</span>
                  </>
                )}
              </button>
            )}

            {genderFilter === 'men' && (
              <button
                type="button"
                disabled={Boolean(togglingDept)}
                onClick={() => toggleDepartmentVisibility('men')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  togglingDept === 'men'
                    ? 'bg-neutral-700 text-white cursor-wait opacity-90'
                    : hiddenDepartments.includes('men')
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {togglingDept === 'men' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{togglingDeptAction === 'on' ? "Turning ON Men's Department..." : "Turning OFF Men's Department..."}</span>
                  </>
                ) : hiddenDepartments.includes('men') ? (
                  <>
                    <HiOutlineEye className="w-4 h-4" />
                    <span>✨ Turn ON Entire Men&apos;s Department</span>
                  </>
                ) : (
                  <>
                    <HiOutlineEyeOff className="w-4 h-4" />
                    <span>🔒 Turn OFF Entire Men&apos;s Department (Hide from Store & Navbar)</span>
                  </>
                )}
              </button>
            )}

            {genderFilter === 'all' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-neutral-400 font-bold hidden sm:inline">Turn Section Off/On:</span>
                {[
                  { key: 'women', label: '🌸 Women' },
                  { key: 'men', label: '👔 Men' },
                  { key: 'kids', label: '🧒 Kids' }
                ].map((d) => {
                  const isH = hiddenDepartments.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      disabled={Boolean(togglingDept)}
                      onClick={() => toggleDepartmentVisibility(d.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        togglingDept === d.key
                          ? 'bg-neutral-200 text-neutral-800 border-neutral-400 cursor-wait'
                          : isH
                          ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-red-50 hover:text-red-700'
                      }`}
                      title={isH ? `Turn ON ${d.label}` : `Turn OFF ${d.label}`}
                    >
                      {togglingDept === d.key ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>{d.label}: {isH ? '🔒 Hidden' : '✨ Live'}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="sm:col-span-5 relative">
            <HiOutlineSearch className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search category name, slug, or parent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type filter */}
          <div className="sm:col-span-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 bg-neutral-50/70 focus:bg-white focus:outline-none"
            >
              <option value="all">All Category Levels (Main & Sub)</option>
              <option value="main">Main Categories Only</option>
              <option value="sub">Sub-Categories Only</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 bg-neutral-50/70 focus:bg-white focus:outline-none"
            >
              <option value="all">All Status (Visible & Hidden)</option>
              <option value="active">Visible on Store Only</option>
              <option value="inactive">Hidden from Store Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center text-neutral-400">
          <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 mt-3 font-medium">Loading catalog categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200 shadow-xs space-y-3">
          <p className="text-sm font-semibold text-neutral-700">No categories found matching your filters</p>
          <p className="text-xs text-neutral-400">
            {searchTerm || genderFilter !== 'all' || typeFilter !== 'all'
              ? 'Try resetting the search or filter options.'
              : 'Get started by creating your first category.'}
          </p>
          <button
            onClick={() => openAddModal('', genderFilter !== 'all' ? genderFilter : 'women')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add New Category</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* ======================================================== */
        /* TABLE FORMAT VIEW (Clean, Responsive, One-Click Toggle)  */
        /* ======================================================== */
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cream/40 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16">Image</th>
                  <th className="py-3.5 px-4">Category Name & Slug</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Hierarchy Type</th>
                  <th className="py-3.5 px-4 text-center">Items Inside</th>
                  <th className="py-3.5 px-4 text-center">Priority</th>
                  <th className="py-3.5 px-4 text-center">Visibility (Toggle)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {paginatedCategories.map((cat) => {
                  const isParent = !cat.parent;
                  const isVisible = cat.isActive !== false;
                  const isToggling = togglingId === cat._id;
                  const catItems = getCategoryProducts(cat._id);
                  const isExpanded = expandedItemsCatId === cat._id;

                  return (
                    <React.Fragment key={cat._id}>
                      <tr
                        className={`hover:bg-cream/20 transition-colors ${
                          !isVisible ? 'opacity-60 bg-neutral-50/50' : ''
                        }`}
                      >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {cat.image ? (
                            <img
                              src={getImageUrl(cat.image)}
                              alt={cat.name}
                              onError={(e) => handleImageError(e, '/fallback-product.png')}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <HiOutlinePhotograph className="w-5 h-5 text-neutral-300" />
                          )}
                        </div>
                      </td>

                      {/* Category Name & Slug */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                            {cat.name}
                            {!isVisible && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600 font-semibold uppercase">
                                Hidden
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            /{cat.slug}
                          </span>
                        </div>
                      </td>

                      {/* Department Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            cat.gender === 'men'
                              ? 'bg-blue-100 text-blue-800'
                              : cat.gender === 'kids'
                              ? 'bg-amber-100 text-amber-800'
                              : cat.gender === 'all'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {cat.gender === 'men'
                            ? '👔 Men'
                            : cat.gender === 'kids'
                            ? '🧒 Kids'
                            : cat.gender === 'all'
                            ? '✨ Unisex'
                            : '🌸 Women'}
                        </span>
                      </td>

                      {/* Hierarchy Level */}
                      <td className="py-3 px-4">
                        {isParent ? (
                          <div className="flex items-center gap-1 text-primary font-bold">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <span>Main Category</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-neutral-700 font-medium flex items-center gap-1">
                              <span>↳ Sub-category</span>
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              under: {cat.parent?.name || 'Main Parent'}
                            </span>
                          </div>
                        )}
                      </td>

                        {/* Items Inside Cell with Expand Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedItemsCatId(isExpanded ? null : cat._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              catItems.length > 0
                                ? 'bg-accent-50 text-accent-800 hover:bg-accent-100 border border-accent-200 shadow-2xs'
                                : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                            }`}
                            title="Click to view/hide dress items inside this category"
                          >
                            <HiOutlineShoppingBag className="w-3.5 h-3.5 text-accent-600" />
                            <span>{catItems.length} items</span>
                            {catItems.length > 0 && (
                              isExpanded ? (
                                <HiOutlineChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <HiOutlineChevronDown className="w-3.5 h-3.5" />
                              )
                            )}
                          </button>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-neutral-600">
                          {cat.priority || 0}
                        </td>

                        {/* Interactive Visibility Toggle */}
                        <td className="py-3 px-4 text-center">
                          {(() => {
                            const parentCat = cat.parent
                              ? safeCategories.find((p) => p._id === (cat.parent?._id || cat.parent))
                              : null;
                            const isParentInactive = Boolean(parentCat && parentCat.isActive === false);

                            return (
                              <div className="inline-flex flex-col items-center gap-1">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(cat)}
                                    disabled={isToggling}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                                      isVisible ? 'bg-emerald-500' : 'bg-neutral-300'
                                    } ${isToggling ? 'opacity-80 cursor-wait' : ''}`}
                                    aria-label={`Toggle visibility for ${cat.name}`}
                                    title={isVisible ? 'Click to HIDE from storefront' : 'Click to MAKE VISIBLE on storefront'}
                                  >
                                    <span
                                      className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        isVisible ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    >
                                      {isToggling && (
                                        <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                      )}
                                    </span>
                                  </button>
                                  <span
                                    className={`text-[11px] font-bold ${
                                      isVisible ? 'text-emerald-700' : 'text-neutral-400'
                                    }`}
                                  >
                                    {isToggling ? 'Saving...' : isVisible ? 'Visible' : 'Hidden'}
                                  </span>
                                </div>
                                {isParentInactive && (
                                  <span
                                    className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-amber-100 text-amber-800 border border-amber-300"
                                    title="This subcategory is automatically hidden because its parent main category is hidden."
                                  >
                                    Parent Hidden
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Action Buttons (Add Sub, Edit, Delete) */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Link
                              to={`/admin/products?category=${cat._id}`}
                              className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors"
                              title={`Manage all ${catItems.length} items in Catalog`}
                            >
                              <HiOutlineShoppingBag className="w-4 h-4" />
                            </Link>
                            {isParent && (
                              <button
                                onClick={() => openAddModal(cat._id, cat.gender)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-accent-100 text-accent-800 hover:bg-accent-200 text-xs font-bold transition-colors"
                                title="Add a subcategory directly under this parent"
                              >
                                <HiOutlinePlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Add Sub</span>
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(cat)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors"
                              title="Edit Category Details"
                            >
                              <HiOutlinePencil className="w-3.5 h-3.5 text-primary" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(cat, isParent)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Category"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Nested Items Drawer inside Table */}
                      {isExpanded && (
                        <tr className="bg-gradient-to-b from-cream/40 to-neutral-50 border-b border-accent-200">
                          <td colSpan={8} className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs">
                                  👗
                                </div>
                                <div>
                                  <h4 className="font-serif text-sm font-bold text-neutral-900">
                                    Dress Items inside &ldquo;{cat.name}&rdquo; ({catItems.length} Designs)
                                  </h4>
                                  <p className="text-[11px] text-neutral-500">
                                    Browse dresses and garments categorized in this department
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/admin/products?category=${cat._id}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-primary transition-colors px-2.5 py-1.5"
                                >
                                  <span>Open in Items Manager</span>
                                  <HiOutlineArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>

                            {catItems.length === 0 ? (
                              <div className="py-8 text-center text-xs text-neutral-400 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                                <p className="font-semibold text-neutral-700">No dresses added under &ldquo;{cat.name}&rdquo; yet.</p>
                                <p className="text-[11px] text-neutral-400">Manage garments and designs in the Product Catalog.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {catItems.map((prod) => (
                                  <div
                                    key={prod._id}
                                    className="bg-white rounded-2xl p-2.5 border border-neutral-200 shadow-2xs space-y-1.5 flex flex-col justify-between hover:border-accent-300 transition-all"
                                  >
                                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100 relative">
                                      <img
                                        src={getImageUrl(prod.images?.[0])}
                                        alt={prod.title}
                                        onError={(e) => handleImageError(e, '/fallback-product.png')}
                                        className="w-full h-full object-cover"
                                      />
                                      {prod.stock <= 0 && (
                                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase shadow-xs">
                                          Out of Stock
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-neutral-900 text-xs truncate" title={prod.title}>
                                        {prod.title}
                                      </h5>
                                      <div className="flex items-center justify-between text-[11px] mt-0.5">
                                        <span className="font-numeric font-bold text-primary">
                                          {formatPrice(prod.salePrice || prod.price)}
                                        </span>
                                        <span className="text-[10px] text-neutral-500 font-mono">
                                          {prod.stock || 0} in stock
                                        </span>
                                      </div>
                                    </div>
                                    <Link
                                      to={`/admin/products?category=${cat._id}`}
                                      className="text-[10px] text-center font-bold text-primary hover:text-accent-700 bg-neutral-50 hover:bg-neutral-100 py-1.5 rounded-lg block border border-neutral-200 transition-colors"
                                    >
                                      Edit / Manage Variants
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls: 10/20/30 per table + Next / Prev + 1, 2, 3 Buttons */}
          <div className="p-4 sm:p-5 bg-neutral-50/80 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            {/* Left: Item Counts & 10/20/30 Per Table Selector */}
            <div className="flex flex-wrap items-center gap-4 text-neutral-600">
              <div>
                Showing <span className="font-bold text-neutral-900">{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span className="font-bold text-neutral-900">{endIndex}</span> of{' '}
                <span className="font-bold text-neutral-900">{totalItems}</span> categories
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium">Per table:</span>
                <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-0.5 shadow-xs">
                  {[10, 20, 30].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setItemsPerPage(count);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        itemsPerPage === count
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Prev, 1, 2, 3..., Next Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-bold hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((pNum, idx) => {
                  if (pNum === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-neutral-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = pNum === safeCurrentPage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 shadow-xs'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-bold hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                <span>Next</span>
                <HiOutlineArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* CARDS HIERARCHICAL VIEW                                  */
        /* ======================================================== */
        <div className="space-y-6">
          {parentCategories
            .filter((p) => {
              if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
              if (statusFilter === 'active' && !p.isActive) return false;
              if (statusFilter === 'inactive' && p.isActive) return false;
              return true;
            })
            .map((parent) => {
              const subs = getSubcategories(parent._id);
              const isVisible = parent.isActive !== false;

              return (
                <div
                  key={parent._id}
                  className={`bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden transition-all hover:border-accent-300 ${
                    !isVisible ? 'opacity-70 bg-neutral-50/70' : ''
                  }`}
                >
                  {/* Main Category Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/30 border-b border-neutral-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={getImageUrl(parent.image)}
                          alt={parent.name}
                          onError={(e) => handleImageError(e, '/fallback-product.png')}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-serif text-lg font-bold text-neutral-900">{parent.name}</h2>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              parent.gender === 'men'
                                ? 'bg-blue-100 text-blue-800'
                                : parent.gender === 'kids'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {parent.gender === 'men' ? '👔 Men' : parent.gender === 'kids' ? '🧒 Kids' : '🌸 Women'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                            Main Category
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400 font-mono">
                          <span>slug: /{parent.slug}</span>
                          <span>•</span>
                          <span>Priority: {parent.priority || 1}</span>
                          <span>•</span>
                          <span className={isVisible ? 'text-emerald-600 font-bold' : 'text-neutral-400'}>
                            {isVisible ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Quick visibility toggle button */}
                      <button
                        type="button"
                        disabled={togglingId === parent._id}
                        onClick={() => handleToggleStatus(parent)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          togglingId === parent._id
                            ? 'bg-neutral-200 text-neutral-600 cursor-wait'
                            : isVisible
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                        title="Toggle visibility on storefront"
                      >
                        {togglingId === parent._id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : isVisible ? (
                          <>
                            <HiOutlineEye className="w-3.5 h-3.5" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <HiOutlineEyeOff className="w-3.5 h-3.5" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => openAddModal(parent._id, parent.gender)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-100 text-accent-800 hover:bg-accent-200 text-xs font-semibold transition-colors"
                      >
                        <HiOutlinePlus className="w-3.5 h-3.5" />
                        <span>Add Sub-Type</span>
                      </button>
                      <button
                        onClick={() => openEditModal(parent)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5 text-primary" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(parent, true)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Shelf */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Sub-Categories & Varieties ({subs.length})
                      </span>
                    </div>

                    {subs.length === 0 ? (
                      <span className="text-xs text-neutral-400 italic">
                        No subcategories yet. Click &quot;Add Sub-Type&quot; to add varieties.
                      </span>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {subs.map((sub) => {
                          const subVisible = sub.isActive !== false;
                          return (
                            <div
                              key={sub._id}
                              className={`flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:bg-white hover:border-accent-300 hover:shadow-xs transition-all ${
                                !subVisible ? 'opacity-60 bg-neutral-100/50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    subVisible ? 'bg-emerald-500' : 'bg-neutral-300'
                                  }`}
                                />
                                <div className="truncate">
                                  <span className="text-xs font-bold text-neutral-800 block truncate">
                                    {sub.name}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 font-mono block truncate">
                                    /{sub.slug}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  type="button"
                                  disabled={togglingId === sub._id}
                                  onClick={() => handleToggleStatus(sub)}
                                  className={`p-1 rounded cursor-pointer ${
                                    togglingId === sub._id
                                      ? 'text-neutral-400 cursor-wait'
                                      : subVisible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-200'
                                  }`}
                                  title={subVisible ? 'Hide from store' : 'Make visible on store'}
                                >
                                  {togglingId === sub._id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  ) : subVisible ? (
                                    <HiOutlineEye className="w-3.5 h-3.5" />
                                  ) : (
                                    <HiOutlineEyeOff className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => openEditModal(sub)}
                                  className="p-1 text-neutral-400 hover:text-primary rounded hover:bg-neutral-100"
                                  title="Edit Subcategory"
                                >
                                  <HiOutlinePencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(sub, false)}
                                  className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50"
                                  title="Delete Subcategory"
                                >
                                  <HiOutlineTrash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category Items Shelf - Directly preview items inside this category */}
                  {(() => {
                    const parentProducts = getCategoryProducts(parent._id);
                    return (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-neutral-100 bg-neutral-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <HiOutlineShoppingBag className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                              Dresses & Items in {parent.name} ({parentProducts.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/products?category=${parent._id}`}
                              className="text-xs font-bold text-accent hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <span>Manage all {parentProducts.length} items</span>
                              <HiOutlineArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        {parentProducts.length === 0 ? (
                          <div className="py-4 text-center text-xs text-neutral-400 bg-white rounded-2xl border border-neutral-200">
                            No items added in {parent.name} yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {parentProducts.slice(0, 6).map((prod) => (
                              <div
                                key={prod._id}
                                className="bg-white rounded-2xl p-2 border border-neutral-200 shadow-2xs space-y-1 hover:border-accent-300 transition-all"
                              >
                                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100 relative">
                                  <img
                                    src={getImageUrl(prod.images?.[0])}
                                    alt={prod.title}
                                    onError={(e) => handleImageError(e, '/fallback-product.png')}
                                    className="w-full h-full object-cover"
                                  />
                                  {prod.stock <= 0 && (
                                    <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-red-600 text-white text-[8px] font-bold uppercase">
                                      Out of Stock
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-neutral-800 block truncate" title={prod.title}>
                                  {prod.title}
                                </span>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-numeric font-bold text-primary">
                                    {formatPrice(prod.salePrice || prod.price)}
                                  </span>
                                  <span className="text-neutral-400 font-mono">
                                    {prod.stock || 0} in stock
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
        </div>
      )}

      {/* ========================================================
          MODAL FOR ADDING / EDITING CATEGORY OR SUBCATEGORY
         ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-neutral-200/80">
            {/* Pinned Header with Fixed Close "X" Button */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0">
              <div>
                <h3 className="font-serif text-xl font-bold text-neutral-900">
                  {editingCategory
                    ? editingCategory.parent
                      ? 'Edit Sub-Category'
                      : 'Edit Main Category'
                    : parentId
                    ? 'Add New Sub-Category'
                    : 'Add New Category'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {editingCategory
                    ? `Update details for "${editingCategory.name}"`
                    : 'Add a new section or variety to your fashion catalog'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200/80 shadow-2xs bg-white cursor-pointer active:scale-95 shrink-0"
                title="Close (Esc)"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-5 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
              {/* Department / Section Selector (Including Kids Section!) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Department / Section *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('women')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      gender === 'women'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-300'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    🌸 Women's
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('men')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      gender === 'men'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-300'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    👔 Men's
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('kids')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      gender === 'kids'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-300'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    🧒 Kids
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('all')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      gender === 'all'
                        ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-300'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    ✨ Unisex
                  </button>
                </div>
              </div>

              {/* Hierarchy / Parent Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Parent Collection
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white font-medium"
                >
                  <option value="">None (Top-Level Main Category)</option>
                  {parentCategories
                    .filter((p) => !editingCategory || p._id !== editingCategory._id)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        Nested under: {p.name} ({p.gender === 'men' ? 'Men' : p.gender === 'kids' ? 'Kids' : 'Women'})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {parentId
                    ? 'Sub-categories appear inside dropdown mega menus and filters under this parent.'
                    : 'Main categories appear as primary tiles and header navigation items.'}
                </p>
              </div>

              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {parentId ? 'Sub-Category / Type Name *' : 'Main Category Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    gender === 'kids'
                      ? (parentId ? 'e.g. Frocks, Ethnic Kurta, Dungarees' : 'e.g. Boys Wear, Girls Wear')
                      : parentId
                      ? 'e.g. Banarasi Silk, Linen, Chinos, Floral'
                      : 'e.g. Sarees, Salwar Suits, Shirts'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Display Priority & Visibility Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Display Priority (Order)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-mono"
                  />
                  <span className="text-[10px] text-neutral-400">Lower numbers appear first</span>
                </div>

                {/* Visible / Hidden Toggle inside Modal */}
                <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Store Visibility</span>
                    <span className="text-[11px] text-neutral-400">
                      {isActive ? 'Visible to customers' : 'Hidden from customers'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-emerald-500' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description for SEO and banner headers..."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Category Cover Image
                </label>
                <div className="flex items-center gap-3">
                  {imagePreview && (
                    <div className="w-12 h-12 rounded-xl border border-neutral-200 overflow-hidden shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light active:scale-95 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default CategoryManager;
