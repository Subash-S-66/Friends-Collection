import { useState, useEffect } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlinePhotograph,
  HiOutlineX,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { formatPrice, getImageUrl } from '../utils/formatters';

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [expandedVariantsId, setExpandedVariantsId] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState('women');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [selectedSizes, setSelectedSizes] = useState(['S', 'M', 'L', 'XL']);
  const [selectedColors, setSelectedColors] = useState(['Maroon']);
  const [variants, setVariants] = useState([
    { color: 'Maroon', size: 'S', stock: 5, sku: 'FC-MRN-S' },
    { color: 'Maroon', size: 'M', stock: 5, sku: 'FC-MRN-M' },
    { color: 'Maroon', size: 'L', stock: 5, sku: 'FC-MRN-L' },
    { color: 'Maroon', size: 'XL', stock: 5, sku: 'FC-MRN-XL' },
  ]);
  const [tags, setTags] = useState(['new-arrival']);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [saving, setSaving] = useState(false);

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', '30', '32', '34', '36', '38', '40', '42', '44'];
  const availableTags = ['trending', 'new-arrival', 'festive', 'bestseller'];
  const commonColors = ['Maroon', 'Navy Blue', 'Wine', 'Emerald Green', 'Black', 'Pastel Pink', 'Mustard Yellow', 'Royal Blue', 'Red', 'Beige', 'White', 'Khaki', 'Charcoal Black', 'Olive'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        API.get('/products/admin/all?limit=100'),
        API.get('/categories/admin/all')
      ]);
      setProducts(Array.isArray(prodRes.data?.products) ? prodRes.data.products : (Array.isArray(prodRes.data) ? prodRes.data : []));
      setCategories(Array.isArray(catRes?.data) ? catRes.data : []);
    } catch (err) {
      console.error('Error loading products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter parent categories vs subcategories
  const safeCategories = Array.isArray(categories) ? categories : [];
  const parentCategories = safeCategories.filter((c) => c && !c.parent);
  const availableSubcategories = safeCategories.filter(
    (c) => c && c.parent && ((c.parent._id || c.parent) === category)
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setGender('women');
    setCategory(parentCategories[0]?._id || '');
    setSubcategory('');
    setPrice('');
    setSalePrice('');
    setSelectedSizes(['S', 'M', 'L', 'XL']);
    setSelectedColors(['Maroon']);
    setVariants([
      { color: 'Maroon', size: 'S', stock: 5, sku: 'FC-MRN-S' },
      { color: 'Maroon', size: 'M', stock: 5, sku: 'FC-MRN-M' },
      { color: 'Maroon', size: 'L', stock: 5, sku: 'FC-MRN-L' },
      { color: 'Maroon', size: 'XL', stock: 5, sku: 'FC-MRN-XL' },
    ]);
    setTags(['new-arrival']);
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setTitle(prod.title);
    setDescription(prod.description || '');
    setGender(prod.gender || 'women');
    setCategory(prod.category?._id || prod.category || '');
    setSubcategory(prod.subcategory?._id || prod.subcategory || '');
    setPrice(prod.price.toString());
    setSalePrice(prod.salePrice ? prod.salePrice.toString() : '');
    setSelectedSizes(prod.sizes || []);
    setSelectedColors(prod.colors || []);
    setVariants(prod.variants && prod.variants.length > 0 ? prod.variants : [
      { color: 'Default', size: 'Standard', stock: prod.stock || 10, sku: '' }
    ]);
    setTags(prod.tags || []);
    setExistingImages(prod.images || []);
    setImages([]);
    setImagePreviews([]);
    setModalOpen(true);
  };

  // Add / Remove Variant Row
  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { color: selectedColors[0] || 'Standard', size: selectedSizes[0] || 'M', stock: 5, sku: '' }
    ]);
  };

  const handleRemoveVariantRow = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index][field] = field === 'stock' ? Math.max(0, parseInt(value) || 0) : value;
      return updated;
    });
  };

  // Quick generate matrix of variants
  const handleAutoGenerateVariants = () => {
    const matrix = [];
    selectedColors.forEach((color) => {
      selectedSizes.forEach((size) => {
        matrix.push({
          color,
          size,
          stock: 5,
          sku: `FC-${color.substring(0, 3).toUpperCase()}-${size}`
        });
      });
    });
    setVariants(matrix);
    toast.success(`Generated ${matrix.length} variants!`);
  };

  // Multi-image selection with preview & 3:4 aspect ratio warning / guard
  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setImages(filesArr);

      // Create object URLs for instant previews
      const previews = filesArr.map((f) => URL.createObjectURL(f));
      setImagePreviews(previews);
    }
  };

  const handleRemoveNewImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !price || !category) {
      toast.error('Please enter Title, Price, and Category');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description);
      formData.append('gender', gender);
      formData.append('category', category);
      formData.append('subcategory', subcategory || '');
      formData.append('price', price);
      if (salePrice) formData.append('salePrice', salePrice);
      formData.append('sizes', JSON.stringify(selectedSizes));
      formData.append('colors', JSON.stringify(selectedColors));
      formData.append('variants', JSON.stringify(variants));
      formData.append('tags', JSON.stringify(tags));

      if (editingProduct) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      images.forEach((file) => {
        formData.append('images', file);
      });

      if (editingProduct) {
        await API.put(`/products/admin/${editingProduct._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Dress updated successfully!');
      } else {
        await API.post('/products/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Dress published successfully with Cloudinary 3:4 normalization!');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save product error:', err);
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dress?')) return;
    try {
      await API.delete(`/products/admin/${id}`);
      toast.success('Product deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants?.some((v) =>
        v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.sku && v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    const matchesCat =
      !selectedCat ||
      (p.category?._id || p.category) === selectedCat ||
      (p.subcategory?._id || p.subcategory) === selectedCat;
    const matchesGender = selectedGenderFilter === 'all' || p.gender === selectedGenderFilter;
    return matchesSearch && matchesCat && matchesGender;
  });

  const totalCatalogStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Dress & Inventory Catalog</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Total {products.length} Designs • {totalCatalogStock} Units in stock across all variants
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-semibold shadow-md transition-all"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>Add New Dress with Variants</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <HiOutlineSearch className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search title, color, size, or SKU (e.g. 'Blue XL')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={selectedGenderFilter}
            onChange={(e) => setSelectedGenderFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-neutral-50 focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="women">🌸 Women's</option>
            <option value="men">👔 Men's</option>
            <option value="unisex">✨ Unisex</option>
          </select>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-neutral-50 focus:outline-none"
          >
            <option value="">All Categories & Types</option>
            {parentCategories.map((p) => {
              const subs = categories.filter((c) => c.parent && (c.parent._id || c.parent) === p._id);
              return (
                <optgroup key={p._id} label={`${p.name} (${p.gender === 'men' ? 'Men' : 'Women'})`}>
                  <option value={p._id}>All {p.name}</option>
                  {subs.map((s) => (
                    <option key={s._id} value={s._id}>
                      ↳ {s.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      {/* Products Table with Variant Accordion */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-6">Dress</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Price</th>
                <th className="py-3.5 px-6">Total Stock</th>
                <th className="py-3.5 px-6">Variants & Stocks</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    No dresses found matching &ldquo;{searchTerm}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isExpanded = expandedVariantsId === prod._id;
                  const hasVariants = prod.variants && prod.variants.length > 0;
                  return (
                    <tr key={prod._id} className="hover:bg-neutral-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(prod.images?.[0])}
                            alt={prod.title}
                            className="w-12 h-16 object-cover object-top rounded-lg border border-neutral-200 bg-neutral-100 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-neutral-900 text-xs sm:text-sm">{prod.title}</p>
                            <span className="text-[11px] text-neutral-400 font-mono">/{prod.slug}</span>
                            {prod.images && prod.images.length > 1 && (
                              <span className="ml-2 text-[10px] text-neutral-500 font-medium">
                                ({prod.images.length} photos)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-neutral-800">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900">{prod.category?.name || 'Unassigned'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              prod.gender === 'men' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {prod.gender === 'men' ? '👔 Men' : '🌸 Women'}
                            </span>
                          </div>
                          {prod.subcategory?.name && (
                            <span className="text-[11px] text-accent-700 font-medium">› {prod.subcategory.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-primary">
                            {formatPrice(prod.salePrice || prod.price)}
                          </span>
                          {prod.salePrice && (
                            <span className="text-[10px] text-neutral-400 line-through">
                              {formatPrice(prod.price)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            prod.stock <= 0
                              ? 'bg-neutral-900 text-white'
                              : prod.stock <= 3
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {prod.stock <= 0 ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              OUT OF STOCK
                            </>
                          ) : prod.stock <= 3 ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Only {prod.stock} Left!
                            </>
                          ) : (
                            `${prod.stock} Units`
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {hasVariants ? (
                          <div className="space-y-1.5">
                            <button
                              onClick={() => setExpandedVariantsId(isExpanded ? null : prod._id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-[11px] font-bold text-neutral-800 transition-colors"
                            >
                              <span>{prod.variants.length} Variants</span>
                              {isExpanded ? <HiOutlineChevronUp className="w-3.5 h-3.5" /> : <HiOutlineChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && (
                              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 mt-2 space-y-1.5 max-w-sm">
                                {prod.variants.map((v, vIdx) => (
                                  <div key={vIdx} className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-neutral-800">
                                      {v.color || 'Standard'} • {v.size}
                                    </span>
                                    <span
                                      className={`font-bold ${
                                        v.stock <= 0 ? 'text-red-600' : v.stock <= 3 ? 'text-amber-600' : 'text-emerald-700'
                                      }`}
                                    >
                                      {v.stock} in stock
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">No variants configured</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-2 rounded-lg text-neutral-600 hover:text-primary hover:bg-neutral-100 transition-colors"
                            title="Edit Product & Variants"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod._id)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal with Multi-Image Preview & Variant Stock Builder */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <span className="text-xs uppercase font-bold text-accent-700 tracking-wider">Catalog Studio</span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
                  {editingProduct ? 'Edit Dress & Variant Stocks' : 'Add New Dress with Variants'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Dress Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Royal Maroon Silk Anarkali Suit"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Department *</label>
                    <select
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value);
                        setCategory('');
                        setSubcategory('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white font-medium"
                    >
                      <option value="women">🌸 Women's</option>
                      <option value="men">👔 Men's</option>
                      <option value="unisex">✨ Unisex</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Main Category *</label>
                    <select
                      required
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setSubcategory('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="">Select Category</option>
                      {parentCategories
                        .filter((c) => !gender || gender === 'unisex' || c.gender === gender || c.gender === 'all')
                        .map((c) => (
                          <option key={c._id} value={c._id}>{c.name} ({c.gender === 'men' ? 'Men' : 'Women'})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Sub-Category (Type)</label>
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      disabled={availableSubcategories.length === 0}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
                    >
                      <option value="">{availableSubcategories.length === 0 ? 'No Sub-types available' : 'None / All Types'}</option>
                      {availableSubcategories.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Regular Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Sale Discounted Price (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="1499"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Description & Material</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Pure georgette fabric with delicate zari border..."
                    className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Multi-Image Upload & Preview (Fixed 3:4 aspect ratio normalization) */}
              <div className="p-4 rounded-2xl bg-cream-light border border-accent-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-neutral-900">
                      Product Photos (Supports PNG, JPG, WEBP, AVIF, HEIC)
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      Photos are automatically normalized to fixed <strong>3:4 Portrait Ratio (900x1200)</strong> via Cloudinary/Sharp so they will never misalign the storefront layout!
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    Exact 3:4 Guard Active
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
                />

                {/* Previews of newly selected images */}
                {imagePreviews.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-neutral-700 block mb-1.5">New Image Previews:</span>
                    <div className="flex flex-wrap gap-3">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative aspect-[3/4] w-20 rounded-xl overflow-hidden border border-accent-200 group">
                          <img src={src} alt="New upload" className="w-full h-full object-cover object-top" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(i)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white text-xs opacity-90 hover:opacity-100"
                          >
                            <HiOutlineX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing uploaded images */}
                {existingImages.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-neutral-700 block mb-1.5">Existing Photos:</span>
                    <div className="flex flex-wrap gap-3">
                      {existingImages.map((img, i) => (
                        <div key={i} className="relative aspect-[3/4] w-20 rounded-xl overflow-hidden border border-accent-200 group">
                          <img src={getImageUrl(img)} alt="Existing" className="w-full h-full object-cover object-top" />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(i)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white text-xs opacity-90 hover:opacity-100"
                          >
                            <HiOutlineX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Variant Stock Builder (Color + Size + Stock) */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Variant-Level Inventory (Color + Size + Stock)
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Specify exact stock available for each variant (e.g. Blue XL: 4, Maroon M: 8)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateVariants}
                    className="text-xs font-bold text-primary hover:text-accent-700 underline"
                  >
                    Auto-Generate Matrix
                  </button>
                </div>

                {/* Variant Table */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {variants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Color (e.g. Navy Blue)"
                        value={v.color}
                        onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50"
                      />
                      <select
                        value={v.size}
                        onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                        className="w-24 px-2 py-2 rounded-xl border border-neutral-200 bg-neutral-50 font-bold"
                      >
                        {availableSizes.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={v.stock}
                        onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                        className="w-20 px-2 py-2 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-center"
                      />
                      <input
                        type="text"
                        placeholder="SKU"
                        value={v.sku || ''}
                        onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                        className="w-28 px-2 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-[11px] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantRow(idx)}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-lg"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <HiOutlinePlus className="w-4 h-4" />
                    <span>Add Custom Variant Row</span>
                  </button>

                  <span className="text-xs font-bold text-neutral-800">
                    Total Calculated Stock: {variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)} Units
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
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
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? 'Processing & Normalizing Photos...' : editingProduct ? 'Save Changes' : 'Publish Dress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
