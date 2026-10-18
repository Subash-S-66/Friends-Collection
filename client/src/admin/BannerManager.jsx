import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getImageUrl, handleImageError } from '../utils/formatters';

const BannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('Shop Now');
  const [ctaLink, setCtaLink] = useState('/shop');
  const [priority, setPriority] = useState('1');
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await API.get('/banners/admin/all');
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading banners:', err);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openAddModal = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setCtaText('Shop Collection');
    setCtaLink('/shop');
    setPriority((banners.length + 1).toString());
    setImageFile(null);
    setModalOpen(true);
  };

  const openEditModal = (b) => {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setCtaText(b.ctaText || 'Shop Now');
    setCtaLink(b.ctaLink || '/shop');
    setPriority(b.priority?.toString() || '1');
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!title.trim()) {
      toast.error('Please enter a banner title');
      return;
    }
    if (!editingBanner && !imageFile) {
      toast.error('Please upload a hero banner image');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('subtitle', subtitle.trim());
      formData.append('ctaText', ctaText.trim());
      formData.append('ctaLink', ctaLink.trim());
      formData.append('priority', priority);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingBanner) {
        await API.put(`/banners/admin/${editingBanner._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Banner updated successfully!');
      } else {
        await API.post('/banners/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Banner added successfully!');
      }

      setModalOpen(false);
      fetchBanners();
    } catch (err) {
      console.error('Save banner error:', err);
      toast.error(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await API.delete(`/banners/admin/${id}`);
      toast.success('Banner removed');
      fetchBanners();
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Homepage Hero Banners</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage full-width slideshow visuals, promotional headlines, and CTA links
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-semibold shadow-md transition-all"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>Add New Banner</span>
        </button>
      </div>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-neutral-400">
            <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
            No banners uploaded yet. Add one to show on the storefront homepage slider!
          </div>
        ) : (
          banners.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div className="aspect-[16/9] bg-neutral-900 relative overflow-hidden">
                <img
                  src={getImageUrl(b.image, '/fallback-banner.png')}
                  alt={b.title}
                  onError={(e) => handleImageError(e, '/fallback-banner.png')}
                  className="w-full h-full object-cover filter brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
                  <h3 className="font-serif text-lg font-bold">{b.title}</h3>
                  <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed mt-1">{b.subtitle}</p>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-white text-xs">
                <div>
                  <span className="font-semibold text-neutral-800">CTA: &ldquo;{b.ctaText}&rdquo;</span>
                  <span className="text-neutral-400 ml-2 font-mono">({b.ctaLink})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-neutral-600 hover:text-primary hover:bg-neutral-100 rounded-lg"
                    title="Edit"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-serif text-xl font-bold text-neutral-900">
                {editingBanner ? 'Edit Banner' : 'Create Hero Banner'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Headline Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pure Kanchipuram Silk Sarees"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Hero Subtitle & Brand Description
                </label>
                <textarea
                  rows={3}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary leading-relaxed resize-y"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Displays dynamically beneath the headline on the storefront hero banner.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Shop Sarees"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Button Link</label>
                  <input
                    type="text"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="/shop?category=sarees"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Hero Image</label>
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
                  {saving ? 'Saving...' : editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;
