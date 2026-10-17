import { useState, useEffect } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineFolder,
  HiOutlineTag,
  HiOutlineViewGrid
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getImageUrl } from '../utils/formatters';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [gender, setGender] = useState('women');
  const [priority, setPriority] = useState('1');
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await API.get('/categories/admin/all');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Separate parent categories from subcategories
  const parentCategories = categories.filter((c) => !c.parent);
  const filteredParents = parentCategories.filter((c) => {
    if (genderFilter === 'all') return true;
    return c.gender === genderFilter;
  });

  const getSubcategories = (pId) =>
    categories.filter((c) => c.parent && (c.parent._id === pId || c.parent === pId));

  const openAddModal = (presetParentId = '', presetGender = 'women') => {
    setEditingCategory(null);
    setName('');
    setParentId(presetParentId || '');
    setGender(presetGender);
    setPriority((categories.length + 1).toString());
    setImageFile(null);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parent?._id || cat.parent || '');
    setGender(cat.gender || 'women');
    setPriority(cat.priority?.toString() || '1');
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('parent', parentId || '');
      formData.append('gender', gender);
      formData.append('priority', priority);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingCategory) {
        await API.put(`/categories/admin/${editingCategory._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Category updated successfully!');
      } else {
        await API.post('/categories/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(parentId ? 'Sub-category created!' : 'Main category created!');
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Save category error:', err);
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, isParent = false) => {
    const msg = isParent
      ? 'Deleting this main category will also remove all its subcategories. Are you sure?'
      : 'Are you sure you want to delete this subcategory?';
    if (!window.confirm(msg)) return;

    try {
      await API.delete(`/categories/admin/${id}`);
      toast.success('Deleted successfully');
      fetchCategories();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">
            Categories & Sub-Categories
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Organize Men and Women collections (Sarees, Suits, Shirts, Kurtas) and types (Banarasi, Linen, Chinos) like Flipkart.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal('', genderFilter === 'men' ? 'men' : 'women')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-semibold shadow-md transition-all"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add Main Category</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <HiOutlineFolder className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-neutral-900">{parentCategories.length}</span>
            <p className="text-xs text-neutral-500">Main Categories</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent-700 flex items-center justify-center">
            <HiOutlineTag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-neutral-900">
              {categories.length - parentCategories.length}
            </span>
            <p className="text-xs text-neutral-500">Sub-Categories / Types</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-neutral-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <HiOutlineViewGrid className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-neutral-900">{categories.length}</span>
            <p className="text-xs text-neutral-500">Total Catalog Nodes</p>
          </div>
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
        <button
          onClick={() => setGenderFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            genderFilter === 'all'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          All Departments ({parentCategories.length})
        </button>
        <button
          onClick={() => setGenderFilter('women')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            genderFilter === 'women'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-accent-100/60 border border-neutral-200'
          }`}
        >
          🌸 Women's ({parentCategories.filter((c) => c.gender === 'women' || !c.gender).length})
        </button>
        <button
          onClick={() => setGenderFilter('men')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            genderFilter === 'men'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-accent-100/60 border border-neutral-200'
          }`}
        >
          👔 Men's ({parentCategories.filter((c) => c.gender === 'men').length})
        </button>
      </div>

      {/* Hierarchical Categories View */}
      {loading ? (
        <div className="py-20 text-center text-neutral-400">
          <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="py-14 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
          No categories found for this department. Click &quot;Add Main Category&quot; above to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredParents.map((parent) => {
            const subs = getSubcategories(parent._id);
            return (
              <div
                key={parent._id}
                className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden transition-all hover:border-accent-300"
              >
                {/* Main Category Header Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/30 border-b border-neutral-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                      <img
                        src={getImageUrl(parent.image)}
                        alt={parent.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif text-lg font-bold text-neutral-900">{parent.name}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          parent.gender === 'men'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {parent.gender === 'men' ? '👔 Men' : '🌸 Women'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                          Main Category
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400 font-mono">
                        <span>slug: /{parent.slug}</span>
                        <span>•</span>
                        <span>Priority: {parent.priority || 1}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => openAddModal(parent._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-100 text-accent-800 hover:bg-accent-200 text-xs font-semibold transition-colors"
                      title="Add a subcategory directly under this main category"
                    >
                      <HiOutlinePlus className="w-3.5 h-3.5" />
                      <span>Add Sub-Type</span>
                    </button>
                    <button
                      onClick={() => openEditModal(parent)}
                      className="p-2 text-neutral-600 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors"
                      title="Edit Main Category"
                    >
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(parent._id, true)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Main Category & All Subcategories"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Shelf */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Sub-Categories & Types ({subs.length})
                    </span>
                    {subs.length === 0 && (
                      <span className="text-xs text-neutral-400 italic">
                        No sub-types yet. Click &quot;Add Sub-Type&quot; to add varieties like Silk, Cotton, etc.
                      </span>
                    )}
                  </div>

                  {subs.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {subs.map((sub) => (
                        <div
                          key={sub._id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:bg-white hover:border-accent-300 hover:shadow-xs transition-all group"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                            <div className="truncate">
                              <span className="text-xs font-bold text-neutral-800 block truncate group-hover:text-primary transition-colors">
                                {sub.name}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                                /{sub.slug}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-1 text-neutral-400 hover:text-primary rounded"
                              title="Edit Subcategory"
                            >
                              <HiOutlinePencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(sub._id, false)}
                              className="p-1 text-neutral-400 hover:text-red-600 rounded"
                              title="Delete Subcategory"
                            >
                              <HiOutlineTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating / Editing Category or Sub-Category */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-serif text-xl font-bold text-neutral-900">
                {editingCategory
                  ? editingCategory.parent
                    ? 'Edit Sub-Category'
                    : 'Edit Main Category'
                  : parentId
                  ? 'Add New Sub-Category'
                  : 'Add New Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Parent Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Parent Collection
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">None (This is a Top-Level Main Category)</option>
                  {parentCategories
                    .filter((p) => !editingCategory || p._id !== editingCategory._id)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        Nested under: {p.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {parentId
                    ? 'Will appear under the selected parent category in dropdown menus and shop filters.'
                    : 'Will appear as a primary tab in the main header and store navigation.'}
                </p>
              </div>

              {/* Department / Gender */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Department *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white font-medium"
                >
                  <option value="women">🌸 Women's Department</option>
                  <option value="men">👔 Men's Department</option>
                  <option value="all">✨ Unisex / All</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {parentId ? 'Sub-Category / Type Name *' : 'Main Category Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={parentId ? 'e.g. Banarasi Silk, Anarkali, Cotton' : 'e.g. Sarees, Salwar Suits'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Display Priority (1 = first)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Image (Optional for subcategory, recommended for main) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Cover Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;

