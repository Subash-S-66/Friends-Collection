import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  HiOutlineCheckCircle,
  HiOutlineBell,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineStar,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlineEyeOff
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

export const ADULT_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size',
  '30', '32', '34', '36', '38', '40', '42', '44'
];

export const KIDS_SIZES = [
  '0-6M',
  '6-12M',
  '1-2',
  '2-3',
  '3-4',
  '4-5',
  '5-6',
  '6-7',
  '7-8',
  '8-9',
  '9-10',
  '10-12',
  '12-14',
  '14-16',
  'Custom Size'
];


const ProductManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [expandedVariantsId, setExpandedVariantsId] = useState(null);
  const [togglingProductId, setTogglingProductId] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState('women');
  const [isActive, setIsActive] = useState(true);
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [selectedSizes, setSelectedSizes] = useState(['S', 'M', 'L', 'XL']);
  const [selectedColors, setSelectedColors] = useState(['Maroon']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customSizesList, setCustomSizesList] = useState([]);
  const [variants, setVariants] = useState([
    { color: 'Maroon', size: 'S', stock: 5, sku: 'FC-MRN-S', image: '' },
    { color: 'Maroon', size: 'M', stock: 5, sku: 'FC-MRN-M', image: '' },
    { color: 'Maroon', size: 'L', stock: 5, sku: 'FC-MRN-L', image: '' },
    { color: 'Maroon', size: 'XL', stock: 5, sku: 'FC-MRN-XL', image: '' },
  ]);
  const [colorImages, setColorImages] = useState([{ color: 'Maroon', image: '' }]);
  const [quickColorInput, setQuickColorInput] = useState('');
  const [tags, setTags] = useState(['new-arrival']);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [saving, setSaving] = useState(false);

  // Combined photo pool for image assignment (existing + new uploads)
  const allPhotoPool = [
    ...existingImages.map((url, idx) => ({
      id: `existing-${idx}`,
      url,
      ref: url,
      label: `Photo #${idx + 1} (Cover/Gallery)`
    })),
    ...imagePreviews.map((url, idx) => ({
      id: `new-${idx}`,
      url,
      ref: `__photo_${existingImages.length + idx}__`,
      label: `New Photo #${existingImages.length + idx + 1}`
    }))
  ];

  // Resolve ref (url or __photo_X__) to previewable URL
  const resolvePreviewUrl = (ref) => {
    if (!ref) return '';
    const match = ref.match(/^__photo_(\d+)__$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const newIdx = idx - existingImages.length;
      return imagePreviews[newIdx] || '';
    }
    return ref;
  };

  const getColorPhoto = (colorName) => {
    if (!colorName) return '';
    const norm = colorName.trim().toLowerCase();
    const found = colorImages.find((ci) => (ci.color || '').trim().toLowerCase() === norm);
    return found?.image || '';
  };

  const handleColorImageChange = (colorName, imageRef) => {
    const norm = (colorName || '').trim().toLowerCase();
    setColorImages((prev) => {
      const existingIdx = prev.findIndex((ci) => (ci.color || '').trim().toLowerCase() === norm);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], image: imageRef };
        return next;
      }
      return [...prev, { color: colorName.trim(), image: imageRef }];
    });
  };

  const isKids = gender === 'kids';
  const baseAvailableSizes = isKids ? KIDS_SIZES : ADULT_SIZES;
  const availableSizes = Array.from(new Set([...baseAvailableSizes, ...customSizesList]));
  const availableTags = ['trending', 'new-arrival', 'festive', 'bestseller'];
  const commonColors = ['Maroon', 'Navy Blue', 'Wine', 'Emerald Green', 'Black', 'Pastel Pink', 'Mustard Yellow', 'Royal Blue', 'Red', 'Beige', 'White', 'Khaki', 'Charcoal Black', 'Olive'];

  const fetchData = async (silent = false) => {
    if (!silent && products.length === 0) setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        API.get('/products/admin/all?limit=1000'),
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

  // Sync category, gender, and new modal from URL query params
  useEffect(() => {
    const catQuery = searchParams.get('category');
    if (catQuery) {
      setSelectedCat(catQuery);
    }
    const genderQuery = searchParams.get('gender');
    if (genderQuery) {
      setSelectedGenderFilter(genderQuery);
    }
    if (searchParams.get('new') === 'true') {
      openAddModal(catQuery || '');
    }
  }, [searchParams]);

  // Filter parent categories vs subcategories
  const safeCategories = Array.isArray(categories) ? categories : [];
  const parentCategories = safeCategories.filter((c) => c && !c.parent);
  const availableSubcategories = safeCategories.filter(
    (c) => c && c.parent && ((c.parent._id || c.parent) === category)
  );

  const openAddModal = (preselectedCatId = '') => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    const catToUse = preselectedCatId || selectedCat || parentCategories[0]?._id || '';
    const matchedCat = safeCategories.find((c) => c._id === catToUse);
    const initialGender = matchedCat?.gender || (selectedGenderFilter !== 'all' ? selectedGenderFilter : 'women');
    setGender(initialGender);
    setCategory(catToUse);
    setSubcategory('');
    setPrice('');
    setSalePrice('');

    const isKidsMode = initialGender === 'kids';
    const initialSizes = isKidsMode ? ['1-2', '2-3', '3-4', '4-5'] : ['S', 'M', 'L', 'XL'];
    setSelectedSizes(initialSizes);
    setSelectedColors(['Maroon']);
    setCustomSizesList([]);
    setCustomSizeInput('');
    setColorImages([{ color: 'Maroon', image: '' }]);
    setVariants(
      initialSizes.map((sz) => ({
        color: 'Maroon',
        size: sz,
        stock: 5,
        sku: `FC-MRN-${sz.replace(/[^A-Z0-9]/gi, '')}`,
        image: ''
      }))
    );
    setTags(['new-arrival']);
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setTitle(prod.title);
    setDescription(prod.description || '');
    setIsActive(prod.isActive !== false);
    const prodGender = prod.gender || 'women';
    setGender(prodGender);
    setCategory(prod.category?._id || prod.category || '');
    setSubcategory(prod.subcategory?._id || prod.subcategory || '');
    setPrice(prod.price.toString());
    setSalePrice(prod.salePrice ? prod.salePrice.toString() : '');

    const isKidsMode = prodGender === 'kids';
    const baseList = isKidsMode ? KIDS_SIZES : ADULT_SIZES;
    const defaultSizes = isKidsMode ? ['1-2', '2-3', '3-4', '4-5'] : ['S', 'M', 'L', 'XL'];

    const prodSizes = prod.sizes && prod.sizes.length > 0
      ? prod.sizes
      : (prod.variants && prod.variants.length > 0
          ? Array.from(new Set(prod.variants.map((v) => v.size).filter(Boolean)))
          : []);

    const finalSizes = prodSizes.length > 0 ? prodSizes : defaultSizes;
    setSelectedSizes(finalSizes);

    // Track any sizes not in base preset as custom sizes
    const customFound = finalSizes.filter((s) => !baseList.includes(s));
    setCustomSizesList(customFound);
    setCustomSizeInput('');

    setSelectedColors(prod.colors && prod.colors.length > 0 ? prod.colors : ['Maroon']);
    const cleanExisting = (prod.images || []).filter(
      (img) => typeof img === 'string' && !img.toLowerCase().includes('logo')
    );
    setExistingImages(cleanExisting);
    setImages([]);
    setImagePreviews([]);

    // Populate colorImages with existing or fallback
    const loadedColorImages = Array.isArray(prod.colorImages) && prod.colorImages.length > 0
      ? prod.colorImages.map((ci) => ({ color: ci.color || '', image: ci.image || '' }))
      : (prod.colors && prod.colors.length > 0 ? prod.colors : ['Maroon']).map((c, i) => ({
          color: c,
          image: cleanExisting[i] || cleanExisting[0] || ''
        }));
    setColorImages(loadedColorImages);

    // Populate variant stock matrix
    let initialVariants = prod.variants && prod.variants.length > 0 ? prod.variants : [];
    if (initialVariants.length === 0 && ((prod.sizes && prod.sizes.length > 0) || (prod.colors && prod.colors.length > 0))) {
      const colors = prod.colors && prod.colors.length > 0 ? prod.colors : ['Standard'];
      const sizes = prod.sizes && prod.sizes.length > 0 ? prod.sizes : (isKidsMode ? ['1-2', '2-3'] : ['Standard']);
      initialVariants = [];
      colors.forEach((c) => {
        sizes.forEach((s) => {
          initialVariants.push({
            color: c,
            size: s,
            stock: Math.max(1, Math.floor((prod.stock || 10) / (colors.length * sizes.length))),
            sku: `FC-${c.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')}-${s.replace(/[^A-Z0-9]/g, '')}`,
            image: ''
          });
        });
      });
    }
    setVariants(initialVariants.length > 0 ? initialVariants.map(v => ({
      color: v.color || 'Standard',
      size: v.size || (isKidsMode ? '1-2' : 'Standard'),
      stock: v.stock !== undefined ? v.stock : 5,
      sku: v.sku || '',
      image: v.image || ''
    })) : [
      { color: 'Standard', size: isKidsMode ? '1-2' : 'Standard', stock: prod.stock || 10, sku: '', image: '' }
    ]);

    setTags(prod.tags && prod.tags.length > 0 ? prod.tags : ['new-arrival']);
    setModalOpen(true);
  };

  // Department switch handler with automatic size preset adaptation
  const handleDepartmentChange = (newGender) => {
    setGender(newGender);
    setCategory('');
    setSubcategory('');

    if (newGender === 'kids') {
      const defaultKids = ['1-2', '2-3', '3-4', '4-5'];
      const isAdultCurrent = selectedSizes.every((s) => ADULT_SIZES.includes(s));
      if (isAdultCurrent || selectedSizes.length === 0) {
        setSelectedSizes(defaultKids);
        setCustomSizesList([]);
        const col = selectedColors[0] || 'Standard';
        setVariants(
          defaultKids.map((sz) => ({
            color: col,
            size: sz,
            stock: 5,
            sku: `FC-${col.substring(0, 3).toUpperCase()}-${sz.replace(/[^A-Z0-9]/gi, '')}`,
            image: ''
          }))
        );
      }
    } else {
      const defaultAdult = ['S', 'M', 'L', 'XL'];
      const isKidsCurrent = selectedSizes.every((s) => KIDS_SIZES.includes(s) || customSizesList.includes(s));
      if (isKidsCurrent || selectedSizes.length === 0) {
        setSelectedSizes(defaultAdult);
        setCustomSizesList([]);
        const col = selectedColors[0] || 'Standard';
        setVariants(
          defaultAdult.map((sz) => ({
            color: col,
            size: sz,
            stock: 5,
            sku: `FC-${col.substring(0, 3).toUpperCase()}-${sz}`,
            image: ''
          }))
        );
      }
    }
  };

  // Add / Remove Custom Size (Only for Kids department)
  const handleAddCustomSize = (e) => {
    if (e) e.preventDefault();
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;
    if (!customSizesList.includes(trimmed)) {
      setCustomSizesList((prev) => [...prev, trimmed]);
    }
    if (!selectedSizes.includes(trimmed)) {
      setSelectedSizes((prev) => [...prev, trimmed]);
    }
    const col = selectedColors[0] || 'Standard';
    setVariants((prev) => {
      const exists = prev.some((v) => v.size.toLowerCase() === trimmed.toLowerCase());
      if (!exists) {
        return [
          ...prev,
          {
            color: col,
            size: trimmed,
            stock: 5,
            sku: `FC-${col.substring(0, 3).toUpperCase()}-${trimmed.replace(/[^A-Z0-9]/gi, '')}`
          }
        ];
      }
      return prev;
    });
    setCustomSizeInput('');
    toast.success(`Custom size "${trimmed}" added!`);
  };

  const handleRemoveCustomSize = (sizeToRemove) => {
    setCustomSizesList((prev) => prev.filter((s) => s !== sizeToRemove));
    setSelectedSizes((prev) => prev.filter((s) => s !== sizeToRemove));
    setVariants((prev) => prev.filter((v) => v.size !== sizeToRemove));
  };

  const handleToggleSize = (size) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        if (prev.length === 1) {
          toast.error('At least one size must remain selected');
          return prev;
        }
        return prev.filter((s) => s !== size);
      } else {
        return [...prev, size];
      }
    });
  };

  // Derive unique sizes already present across current variants (or fallback to selectedSizes)
  const presentSizes = Array.from(new Set(variants.map((v) => v.size?.trim()).filter(Boolean)));
  const referenceSizes = presentSizes.length > 0 ? presentSizes : (selectedSizes.length > 0 ? selectedSizes : ['S', 'M', 'L', 'XL']);

  const distinctModalColors = Array.from(
    new Set([
      ...variants.map((v) => v.color?.trim()).filter(Boolean),
      ...selectedColors
    ])
  );

  // Calculate missing sizes for any color compared to existing present sizes
  const getMissingSizesForColor = (colorName) => {
    if (!colorName || !colorName.trim()) return [];
    const colLower = colorName.trim().toLowerCase();
    const existingSizesForCol = variants
      .filter((v) => (v.color || '').trim().toLowerCase() === colLower)
      .map((v) => (v.size || '').trim());
    return referenceSizes.filter((sz) => !existingSizesForCol.includes(sz));
  };

  // Auto-generate variants for a specific color using all present sizes without filling stock (leaves stock empty)
  const handleAutoGenerateForColor = (colorName) => {
    const trimmed = (colorName || '').trim();
    if (!trimmed) {
      toast.error('Please enter a color name (e.g. Red, Navy Blue)');
      return;
    }

    const sizesToAdd = getMissingSizesForColor(trimmed);
    if (sizesToAdd.length === 0) {
      toast.info(`All ${referenceSizes.length} sizes already exist for "${trimmed}".`);
      return;
    }

    const cleanCol = trimmed.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newRows = sizesToAdd.map((sz) => {
      const cleanSz = sz.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return {
        color: trimmed,
        size: sz,
        stock: '', // Keep stock empty as requested: user cannot save while empty, but 0 is allowed
        sku: `FC-${cleanCol || 'CLR'}-${cleanSz || 'STD'}`,
        image: ''
      };
    });

    setVariants((prev) => [...prev, ...newRows]);
    setQuickColorInput('');
    setSelectedColors((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));

    // Auto-assign default photo for this new color
    setColorImages((prev) => {
      const norm = trimmed.toLowerCase();
      if (prev.some((ci) => (ci.color || '').trim().toLowerCase() === norm)) return prev;
      const nextIdx = prev.length;
      const defaultImg = allPhotoPool[nextIdx]?.ref || allPhotoPool[0]?.ref || '';
      return [...prev, { color: trimmed, image: defaultImg }];
    });

    toast.success(
      `Auto-generated ${newRows.length} variant(s) for "${trimmed}"! Please enter stock quantities (0 is allowed, but not empty).`,
      { icon: '🎨' }
    );
  };

  // Add / Remove Variant Row
  const handleAddVariantRow = () => {
    const isKidsMode = gender === 'kids';
    const fallbackSize = isKidsMode ? '1-2' : 'M';
    setVariants((prev) => [
      ...prev,
      { color: selectedColors[0] || 'Standard', size: referenceSizes[0] || fallbackSize, stock: '', sku: '', image: '' }
    ]);
  };

  const handleRemoveVariantRow = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      if (field === 'stock') {
        // Keep empty string when user clears input or when empty; otherwise parse non-negative integer
        if (value === '' || value === null || value === undefined) {
          updated[index][field] = '';
        } else {
          const parsed = parseInt(value, 10);
          updated[index][field] = isNaN(parsed) ? '' : Math.max(0, parsed);
        }
      } else {
        updated[index][field] = value;
      }
      return updated;
    });
  };

  // Quick generate matrix of variants preserving any already entered stock
  const handleAutoGenerateVariants = () => {
    const existingMap = new Map();
    variants.forEach((v) => {
      const k = `${(v.color || 'Standard').toLowerCase()}::${(v.size || 'Standard').toLowerCase()}`;
      existingMap.set(k, v.stock);
    });

    const allColors = Array.from(
      new Set([
        ...variants.map((v) => v.color?.trim()).filter(Boolean),
        ...selectedColors
      ])
    );
    const colors = allColors.length > 0 ? allColors : ['Standard'];
    const sizes = referenceSizes.length > 0 ? referenceSizes : ['Standard'];
    const matrix = [];

    colors.forEach((color) => {
      sizes.forEach((size) => {
        const k = `${color.toLowerCase()}::${size.toLowerCase()}`;
        const existingStock = existingMap.get(k);
        matrix.push({
          color,
          size,
          stock: existingStock !== undefined && existingStock !== '' ? existingStock : '',
          sku: `FC-${color.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${size.replace(/[^A-Z0-9]/g, '')}`,
          image: ''
        });
      });
    });
    setVariants(matrix);

    // Ensure all colors have a colorImages entry
    setColorImages((prev) => {
      const next = [...prev];
      colors.forEach((col, idx) => {
        const norm = col.toLowerCase();
        if (!next.some((ci) => (ci.color || '').trim().toLowerCase() === norm)) {
          const defaultImg = allPhotoPool[idx]?.ref || allPhotoPool[0]?.ref || '';
          next.push({ color: col, image: defaultImg });
        }
      });
      return next;
    });

    toast.success(`Generated ${matrix.length} variants! Stock must be filled before saving.`);
  };

  // Multi-image selection with preview & 3:4 aspect ratio normalization
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setImages((prev) => [...prev, ...filesArr]);

      // Create object URLs for instant previews
      const previews = filesArr.map((f) => URL.createObjectURL(f));
      setImagePreviews((prev) => [...prev, ...previews]);
    }
    e.target.value = '';
  };

  // Reorder existing images (Slot 1 is Cover, Slot 2 is Hover)
  const handleMoveExistingImage = (idx, direction) => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= existingImages.length) return;
    setExistingImages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleMakeCoverExisting = (idx) => {
    if (idx === 0) return;
    setExistingImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
    toast.success('Promoted to Photo #1 (Cover Image)');
  };

  const handleMakeHoverExisting = (idx) => {
    if (idx === 1 || existingImages.length < 2) return;
    setExistingImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(1, 0, item);
      return copy;
    });
    toast.success('Assigned to Photo #2 (Hover Preview)');
  };

  const handleRemoveExistingImage = (idx) => {
    const totalRemaining = (existingImages.length - 1) + images.length;
    if (totalRemaining < 1) {
      toast.error('A product must have at least 1 image. Please keep or upload a photo.');
      return;
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    toast.success('Photo removed');
  };

  // Reorder newly selected images
  const handleMoveNewImage = (idx, direction) => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setImagePreviews((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleMakeCoverNew = (idx) => {
    if (idx === 0 && existingImages.length === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
    setImagePreviews((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
    toast.success('Moved to top of new photos');
  };

  const handleRemoveNewImage = (idx) => {
    const totalRemaining = existingImages.length + (images.length - 1);
    if (totalRemaining < 1 && editingProduct) {
      toast.error('A product must have at least 1 image.');
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick adjust stock from product list table
  const handleQuickStockAdjust = async (productId, delta) => {
    try {
      const res = await API.patch(`/products/admin/${productId}/stock`, { delta });
      toast.success(`Stock updated to ${res.data.stock} units!`, { icon: '📦' });
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, stock: res.data.stock } : p))
      );
    } catch (err) {
      console.error('Quick stock error:', err);
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!title || !price || !category) {
      toast.error('Please enter Title, Price, and Category');
      return;
    }

    // Enforce that a product cannot be added without an image
    const totalPhotos = (editingProduct ? existingImages.length : 0) + images.length;
    if (totalPhotos === 0) {
      toast.error('Image is required! Please add at least 1 photo (#1 Cover Image) before saving.');
      return;
    }

    // Enforce variant inventory and size validation
    if (!variants || variants.length === 0) {
      toast.error('Please add at least one product variant (color & size).');
      return;
    }

    // Enforce that stock cannot be empty: it can be 0 (out of stock), but cannot be empty/blank
    const emptyStockIdx = variants.findIndex(
      (v) => v.stock === '' || v.stock === null || v.stock === undefined || String(v.stock).trim() === ''
    );
    if (emptyStockIdx !== -1) {
      const emptyVar = variants[emptyStockIdx];
      toast.error(
        `Stock cannot be empty for variant "${emptyVar.color || 'Variant'} - ${emptyVar.size || 'Size'}". Please enter a stock quantity (0 is allowed if out of stock, but cannot be left empty).`,
        { duration: 6000, icon: '⚠️' }
      );
      return;
    }

    // Enforce valid non-negative numbers for all variant stocks
    const invalidStockIdx = variants.findIndex((v) => isNaN(Number(v.stock)) || Number(v.stock) < 0);
    if (invalidStockIdx !== -1) {
      const invVar = variants[invalidStockIdx];
      toast.error(`Invalid stock for variant "${invVar.color} - ${invVar.size}". Stock must be 0 or higher.`);
      return;
    }

    // Dynamic confirmation popup before publishing/updating
    const matchedCategoryName = safeCategories.find((c) => c._id === category)?.name || 'Catalog';
    const isEditing = Boolean(editingProduct);
    const confirmed = await confirm({
      title: isEditing ? 'Save Product Changes?' : 'Publish New Dress?',
      message: isEditing
        ? `Are you sure you want to save all changes to "${title.trim()}"?`
        : `Are you sure you want to publish "${title.trim()}" to your live boutique catalog?`,
      type: 'save',
      confirmText: isEditing ? 'Save & Update' : 'Publish Dress',
      cancelText: 'Keep Editing',
      details: `${matchedCategoryName} • ₹${price} • ${variants.length} Variants (${variants.reduce((s, v) => s + (parseInt(v.stock, 10) || 0), 0)} Total Units)`
    });
    if (!confirmed) return;

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

      const distinctSizes = Array.from(
        new Set([
          ...variants.map((v) => v.size?.trim()).filter(Boolean),
          ...selectedSizes
        ])
      );
      formData.append('sizes', JSON.stringify(distinctSizes.length > 0 ? distinctSizes : ['Standard']));

      const distinctColors = Array.from(
        new Set([
          ...variants.map((v) => v.color?.trim()).filter(Boolean),
          ...selectedColors
        ])
      );
      formData.append('colors', JSON.stringify(distinctColors.length > 0 ? distinctColors : ['Standard']));

      const sanitizedColorImages = (distinctColors.length > 0 ? distinctColors : ['Standard']).map((color, idx) => {
        const norm = color.toLowerCase();
        const existing = colorImages.find((ci) => (ci.color || '').trim().toLowerCase() === norm);
        const chosenImage = existing?.image || allPhotoPool[idx]?.ref || allPhotoPool[0]?.ref || '';
        return {
          color,
          image: chosenImage
        };
      });
      formData.append('colorImages', JSON.stringify(sanitizedColorImages));

      const sanitizedVariants = variants.map((v) => ({
        color: (v.color || 'Standard').trim(),
        size: (v.size || 'Standard').trim(),
        stock: parseInt(v.stock, 10) || 0,
        sku: v.sku || '',
        image: v.image || ''
      }));
      formData.append('variants', JSON.stringify(sanitizedVariants));
      formData.append('tags', JSON.stringify(tags));
      formData.append('isActive', String(isActive));

      const calculatedTotalStock = sanitizedVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      formData.append('stock', calculatedTotalStock);

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
        toast.success('Dress published successfully with 3:4 portrait normalization!');
      }

      setModalOpen(false);
      fetchData(true);
    } catch (err) {
      console.error('Save product error:', err);
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Visibility Toggle for individual product with inline button loading
  const handleToggleProduct = async (prod) => {
    const updatedStatus = prod.isActive === false ? true : false;
    const ok = await confirm({
      title: updatedStatus ? 'Make Dress Visible on Store?' : 'Hide Dress from Storefront?',
      message: updatedStatus
        ? `Are you sure you want to show "${prod.title}" to customers on the storefront catalog & search?`
        : `Are you sure you want to hide "${prod.title}" from customers? It will immediately disappear from shop catalog and search.`,
      type: updatedStatus ? 'primary' : 'warning',
      confirmText: updatedStatus ? 'Yes, Make Live' : 'Yes, Hide Dress',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setTogglingProductId(prod._id);
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p._id === prod._id ? { ...p, isActive: updatedStatus } : p))
    );

    try {
      const res = await API.patch(`/products/admin/${prod._id}/toggle`);
      toast.success(
        res.data?.message || `"${prod.title}" is now ${updatedStatus ? 'VISIBLE' : 'HIDDEN'} on store`,
        { icon: updatedStatus ? '👁️' : '🙈' }
      );
      fetchData(true);
    } catch (err) {
      console.error('Error toggling product visibility:', err);
      toast.error('Failed to update product visibility');
      fetchData(true);
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleDelete = async (id, prodTitle = '') => {
    const confirmed = await confirm({
      title: 'Delete Product from Catalog?',
      message: `Are you sure you want to permanently delete "${prodTitle || 'this dress'}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Yes, Delete Dress',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      await API.delete(`/products/admin/${id}`);
      toast.success('Product deleted');
      fetchData(true);
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleNotifyWaitlist = async (productId, title) => {
    const confirmed = await confirm({
      title: 'Dispatch Waitlist Restock Alerts?',
      message: `Send automated email notifications to all shoppers who joined the waitlist for "${title}"?`,
      type: 'warning',
      confirmText: 'Dispatch Email Alerts',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      const res = await API.post(`/notifications/admin/notify/${productId}`);
      toast.success(res.data.message || 'Notification emails dispatched via Nodemailer!', { icon: '🔔' });
    } catch (err) {
      console.error('Notify error:', err);
      toast.error(err.response?.data?.message || 'Failed to dispatch notifications');
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

  // Pagination states (10 / 20 / 30 per table)
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-reset page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCat, selectedGenderFilter, itemsPerPage]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Generate numbered page buttons (1, 2, 3...)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
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

      {/* Category Explorer Shelf - Browse Items By Category */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineTag className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Browse Items By Category
            </span>
          </div>
          <Link
            to="/admin/categories"
            className="text-[11px] font-bold text-accent hover:text-primary transition-colors flex items-center gap-1"
          >
            <span>Manage All Categories</span>
            <HiOutlineArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Horizontal Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCat('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              !selectedCat
                ? 'bg-primary text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <span>All Items</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${!selectedCat ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
              {products.length}
            </span>
          </button>

          {parentCategories.map((pCat) => {
            const isSelected = selectedCat === pCat._id;
            const catItemsCount = products.filter(
              (p) => (p.category?._id || p.category) === pCat._id || (p.subcategory?._id || p.subcategory) === pCat._id
            ).length;
            const emoji = pCat.gender === 'men' ? '👔' : pCat.gender === 'kids' ? '🧒' : '🌸';

            return (
              <button
                key={pCat._id}
                type="button"
                onClick={() => setSelectedCat(isSelected ? '' : pCat._id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <span>{emoji} {pCat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {catItemsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Category Context Banner */}
        {selectedCat && (
          <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">Filtered Category:</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg">
                {safeCategories.find((c) => c._id === selectedCat)?.name || 'Selected Category'}
              </span>
              <span className="text-neutral-400">({filteredProducts.length} items found)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAddModal(selectedCat)}
                className="px-3 py-1 rounded-lg bg-accent text-white font-bold text-[11px] hover:bg-accent-dark shadow-xs transition-colors flex items-center gap-1"
              >
                <HiOutlinePlus className="w-3.5 h-3.5" />
                <span>Add Item to this Category</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCat('')}
                className="text-neutral-400 hover:text-neutral-700 text-xs font-medium px-2 py-1"
              >
                Clear Filter (Show All)
              </button>
            </div>
          </div>
        )}
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
            <option value="kids">🧒 Kids</option>
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
                <optgroup key={p._id} label={`${p.name} (${p.gender === 'men' ? 'Men' : p.gender === 'kids' ? 'Kids' : 'Women'})`}>
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
                <th className="py-3.5 px-6 text-center">Visibility</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    No dresses found matching &ldquo;{searchTerm}&rdquo;.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => {
                  const isExpanded = expandedVariantsId === prod._id;
                  const hasVariants = prod.variants && prod.variants.length > 0;
                  return (
                    <tr key={prod._id} className="hover:bg-neutral-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(prod.images?.[0])}
                            alt={prod.title}
                            onError={(e) => handleImageError(e, '/fallback-product.png')}
                            className="w-12 h-16 object-cover object-top rounded-lg border border-neutral-200 bg-neutral-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-neutral-900 text-xs sm:text-sm">{prod.title}</p>
                              {prod.isActive === false && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-700">
                                  Hidden
                                </span>
                              )}
                            </div>
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
                              prod.gender === 'men'
                                ? 'bg-blue-100 text-blue-800'
                                : prod.gender === 'kids'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {prod.gender === 'men' ? '👔 Men' : prod.gender === 'kids' ? '🧒 Kids' : '🌸 Women'}
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
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold w-fit ${
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

                          {/* Quick one-click stock controls */}
                          <div className="flex items-center gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(prod._id, 5)}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition-colors"
                              title="Add +5 units to stock"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(prod._id, 1)}
                              className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold border border-neutral-200 transition-colors"
                              title="Add +1 unit to stock"
                            >
                              +1
                            </button>
                            {prod.stock > 0 && (
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdjust(prod._id, -1)}
                                className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold border border-neutral-200 transition-colors"
                                title="Decrease -1 unit from stock"
                              >
                                -1
                              </button>
                            )}
                          </div>
                        </div>
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
                              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 mt-2 space-y-2 max-w-sm">
                                {prod.variants.map((v, vIdx) => {
                                  const normColor = (v.color || '').trim().toLowerCase();
                                  const variantImg = v.image || prod.colorImages?.find((ci) => (ci.color || '').trim().toLowerCase() === normColor)?.image || prod.images?.[0];
                                  return (
                                    <div key={vIdx} className="flex items-center justify-between text-[11px] gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                                        {variantImg && (
                                          <img
                                            src={getImageUrl(variantImg)}
                                            alt={v.color}
                                            className="w-4 h-5 object-cover object-top rounded shrink-0 border border-neutral-300"
                                          />
                                        )}
                                        <span className="font-semibold text-neutral-800 truncate">
                                          {v.color || 'Standard'} • {v.size}
                                        </span>
                                      </div>
                                      <span
                                        className={`font-bold shrink-0 ${
                                          v.stock <= 0 ? 'text-red-600' : v.stock <= 3 ? 'text-amber-600' : 'text-emerald-700'
                                        }`}
                                      >
                                        {v.stock} in stock
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">No variants configured</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          disabled={togglingProductId === prod._id}
                          onClick={() => handleToggleProduct(prod)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            togglingProductId === prod._id
                              ? 'bg-neutral-100 text-neutral-400 cursor-wait'
                              : prod.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-300'
                          }`}
                          title={prod.isActive !== false ? 'Click to HIDE from storefront' : 'Click to MAKE VISIBLE on storefront'}
                        >
                          {togglingProductId === prod._id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : prod.isActive !== false ? (
                            <>
                              <HiOutlineEye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Live</span>
                            </>
                          ) : (
                            <>
                              <HiOutlineEyeOff className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleNotifyWaitlist(prod._id, prod.title)}
                            className="p-2 rounded-lg text-accent-700 hover:text-accent-900 hover:bg-accent-50 transition-colors"
                            title="Send restock alert email to waitlisted customers"
                          >
                            <HiOutlineBell className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-2 rounded-lg text-neutral-600 hover:text-primary hover:bg-neutral-100 transition-colors"
                            title="Edit Product & Variants"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod._id, prod.title)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

        {/* Pagination Controls: 10/20/30 per table + Next / Prev + 1, 2, 3 Buttons */}
        <div className="p-4 sm:p-5 bg-neutral-50/80 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Item Counts & 10/20/30 Per Table Selector */}
          <div className="flex flex-wrap items-center gap-4 text-neutral-600">
            <div>
              Showing <span className="font-bold text-neutral-900">{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
              <span className="font-bold text-neutral-900">{endIndex}</span> of{' '}
              <span className="font-bold text-neutral-900">{totalItems}</span> dresses
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

      {/* Add / Edit Product Modal with Multi-Image Preview & Variant Stock Builder */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200/80">
            {/* Fixed Header with Pinned Close "X" Button */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0">
              <div>
                <span className="text-xs uppercase font-bold text-accent-700 tracking-wider">Catalog Studio</span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
                  {editingProduct ? 'Edit Dress & Variant Stocks' : 'Add New Dress with Variants'}
                </h3>
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
            <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
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
                  <div className="shrink-0">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Store Visibility</label>
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      {isActive ? <HiOutlineEye className="w-4 h-4 text-emerald-600" /> : <HiOutlineEyeOff className="w-4 h-4 text-neutral-400" />}
                      <span>{isActive ? 'Live on Store' : 'Hidden from Store'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Department *</label>
                    <select
                      value={gender}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary bg-white font-medium"
                    >
                      <option value="women">🌸 Women's</option>
                      <option value="men">👔 Men's</option>
                      <option value="kids">🧒 Kids</option>
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
                          <option key={c._id} value={c._id}>{c.name} ({c.gender === 'men' ? 'Men' : c.gender === 'kids' ? 'Kids' : 'Women'})</option>
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

              {/* Multi-Image Upload & Order Manager (Slot #1 is Cover, Slot #2 is Hover Preview) */}
              <div className="p-5 rounded-2xl bg-cream-light border border-accent-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Product Photos & Display Sequence <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      Arrange photo order below. Slot 1 is the <strong>Primary Cover</strong>, Slot 2 is the <strong>Hover Animation Preview</strong>.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary w-fit border border-primary/20">
                    3:4 Portrait Guard Active
                  </span>
                </div>

                {/* Explanatory slot guide pill */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/80 border border-accent-200 text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] font-bold">#1 Cover</span>
                    <span>Shows first in catalog</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-800">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-300 text-[10px] font-bold">#2 Hover</span>
                    <span>Reveals on hover</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-600">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-[10px] font-bold">#3+ Gallery</span>
                    <span>Detail page gallery</span>
                  </div>
                </div>

                {/* File picker */}
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Tip: You can select multiple files at once. You can freely re-order or remove photos using the buttons on each card.
                  </p>
                </div>

                {/* Existing uploaded images in edit mode */}
                {editingProduct && existingImages.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-accent-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                        Current Product Photos ({existingImages.length}):
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        Use ← / → buttons to adjust display order
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {existingImages.map((img, i) => (
                        <div
                          key={i}
                          className={`relative flex flex-col bg-white rounded-xl overflow-hidden border shadow-xs transition-all ${
                            i === 0
                              ? 'border-amber-400 ring-2 ring-amber-300/50'
                              : i === 1
                              ? 'border-indigo-400 ring-2 ring-indigo-300/50'
                              : 'border-neutral-200'
                          }`}
                        >
                          {/* Slot Badge */}
                          <div className="absolute top-1.5 left-1.5 z-10">
                            {i === 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1">
                                <HiOutlineStar className="w-3 h-3" /> #1 Cover
                              </span>
                            ) : i === 1 ? (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1">
                                <HiOutlineSparkles className="w-3 h-3" /> #2 Hover
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-white text-[9px] font-bold tracking-wider uppercase shadow-xs">
                                #{i + 1}
                              </span>
                            )}
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(i)}
                            className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs shadow-xs transition-transform hover:scale-110"
                            title="Delete photo (does not change order of others)"
                          >
                            <HiOutlineX className="w-3.5 h-3.5" />
                          </button>

                          {/* Image preview */}
                          <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                            <img
                              src={getImageUrl(img)}
                              alt={`Slot ${i + 1}`}
                              onError={(e) => handleImageError(e, '/fallback-product.png')}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>

                          {/* Action controls */}
                          <div className="p-1.5 bg-neutral-50 flex items-center justify-between border-t border-neutral-100 text-[10px]">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => handleMoveExistingImage(i, 'left')}
                              className="p-1 rounded bg-white hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 border border-neutral-200 shadow-2xs"
                              title="Move left (higher priority)"
                            >
                              <HiOutlineArrowLeft className="w-3 h-3" />
                            </button>

                            {i !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleMakeCoverExisting(i)}
                                className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[9px]"
                                title="Set as primary cover photo"
                              >
                                Set #1
                              </button>
                            )}
                            {i !== 1 && existingImages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleMakeHoverExisting(i)}
                                className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 text-[9px]"
                                title="Set as hover preview photo"
                              >
                                Set #2
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={i === existingImages.length - 1}
                              onClick={() => handleMoveExistingImage(i, 'right')}
                              className="p-1 rounded bg-white hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 border border-neutral-200 shadow-2xs"
                              title="Move right (lower priority)"
                            >
                              <HiOutlineArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previews of newly selected images */}
                {imagePreviews.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-accent-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                        Newly Added Photos ({imagePreviews.length}):
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        Will be uploaded and appended in this exact sequence
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {imagePreviews.map((src, i) => {
                        const effectiveSlot = (editingProduct ? existingImages.length : 0) + i + 1;
                        const isCover = effectiveSlot === 1;
                        const isHover = effectiveSlot === 2;

                        return (
                          <div
                            key={i}
                            className={`relative flex flex-col bg-white rounded-xl overflow-hidden border shadow-xs transition-all ${
                              isCover
                                ? 'border-amber-400 ring-2 ring-amber-300/50'
                                : isHover
                                ? 'border-indigo-400 ring-2 ring-indigo-300/50'
                                : 'border-neutral-200'
                            }`}
                          >
                            {/* Slot Badge */}
                            <div className="absolute top-1.5 left-1.5 z-10">
                              {isCover ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1">
                                  <HiOutlineStar className="w-3 h-3" /> #1 Cover
                                </span>
                              ) : isHover ? (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1">
                                  <HiOutlineSparkles className="w-3 h-3" /> #2 Hover
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold tracking-wider uppercase shadow-xs">
                                  #{effectiveSlot}
                                </span>
                              )}
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(i)}
                              className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs shadow-xs transition-transform hover:scale-110"
                              title="Remove photo"
                            >
                              <HiOutlineX className="w-3.5 h-3.5" />
                            </button>

                            {/* Image preview */}
                            <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                              <img
                                src={src}
                                alt={`New upload ${i + 1}`}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>

                            {/* Action controls */}
                            <div className="p-1.5 bg-neutral-50 flex items-center justify-between border-t border-neutral-100 text-[10px]">
                              <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => handleMoveNewImage(i, 'left')}
                                className="p-1 rounded bg-white hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 border border-neutral-200 shadow-2xs"
                                title="Move left"
                              >
                                <HiOutlineArrowLeft className="w-3 h-3" />
                              </button>

                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => handleMakeCoverNew(i)}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[9px]"
                                  title="Promote to top"
                                >
                                  Make #1
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={i === imagePreviews.length - 1}
                                onClick={() => handleMoveNewImage(i, 'right')}
                                className="p-1 rounded bg-white hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 border border-neutral-200 shadow-2xs"
                                title="Move right"
                              >
                                <HiOutlineArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State Warning */}
                {!editingProduct && imagePreviews.length === 0 && (
                  <div className="p-4 rounded-xl border-2 border-dashed border-accent-300 bg-white/60 text-center space-y-1">
                    <p className="text-xs font-bold text-neutral-700">No photos selected yet</p>
                    <p className="text-[11px] text-neutral-500">
                      Please click <strong>"Choose Files"</strong> above to select at least 1 photo for this dress. The first photo will automatically become the #1 Cover Photo.
                    </p>
                  </div>
                )}
              </div>

              {/* Color Photos & Visual Swatches Section */}
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-neutral-100 gap-1.5">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                      <span>🎨 Color Photos & Visual Swatches</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold px-2 py-0.5 rounded-full">
                        Auto-Inherited by all sizes of each color
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Assign each color its display photo. Sizes for that color automatically share this photo, or you can override individual sizes in the table below. Multiple colors can share the same photo if desired.
                    </p>
                  </div>
                  {allPhotoPool.length > 0 && (
                    <span className="text-[11px] text-accent-700 font-semibold self-start sm:self-auto">
                      {allPhotoPool.length} photo{allPhotoPool.length > 1 ? 's' : ''} available
                    </span>
                  )}
                </div>

                {distinctModalColors.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No colors defined yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {distinctModalColors.map((colorName, idx) => {
                      const assignedRef = getColorPhoto(colorName) || allPhotoPool[idx]?.ref || allPhotoPool[0]?.ref || '';
                      const previewUrl = resolvePreviewUrl(assignedRef) || (allPhotoPool[0]?.url || '');

                      return (
                        <div
                          key={colorName}
                          className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/70 flex items-center gap-3 shadow-2xs hover:border-neutral-300 transition-colors"
                        >
                          {/* Photo Preview Thumbnail */}
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-neutral-200 border border-neutral-300 shrink-0 relative aspect-[3/4]">
                            {previewUrl ? (
                              <img
                                src={getImageUrl(previewUrl)}
                                alt={colorName}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                                No Photo
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {colorName}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                #{idx + 1}
                              </span>
                            </div>

                            <select
                              value={assignedRef}
                              onChange={(e) => handleColorImageChange(colorName, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-800 focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
                            >
                              {allPhotoPool.length === 0 ? (
                                <option value="">Upload photos first</option>
                              ) : (
                                allPhotoPool.map((p) => (
                                  <option key={p.id} value={p.ref}>
                                    {p.label}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Variant Stock Builder (Color + Size + Stock) */}
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                      <span>Variant-Level Inventory & Sizing</span>
                      {gender === 'kids' && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                          🧒 Kids Age Sizing (Years: 1-2, 2-3...)
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      {gender === 'kids'
                        ? 'Select year-based sizes for kids or enter custom manual sizes below.'
                        : 'Choose standard sizes and manage stock for each color/size variant.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateVariants}
                    className="text-xs font-bold text-primary hover:text-accent-700 underline self-start sm:self-auto cursor-pointer"
                  >
                    Auto-Generate Matrix
                  </button>
                </div>

                {/* Sizing Chips Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                      {gender === 'kids' ? 'Select Kids Year-Based Sizes:' : 'Select Available Sizes:'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {selectedSizes.length} sizes active
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {availableSizes.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      const isCustom = customSizesList.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleToggleSize(sz)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white shadow-xs ring-1 ring-primary'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                          }`}
                        >
                          <span>{sz}</span>
                          {isCustom && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCustomSize(sz);
                              }}
                              className="hover:text-red-300 ml-0.5"
                              title="Delete custom size"
                            >
                              <HiOutlineX className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Manual Input - ONLY rendered when Department is Kids */}
                {gender === 'kids' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🧒</span>
                        <span>Custom Manual Size Input (Kids Only)</span>
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                        Manual Age / Fit
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed">
                      Need a specific size? Type custom sizes like <strong>1-2</strong>, <strong>2-3</strong>, <strong>18-24M</strong>, or <strong>Custom Fit</strong> below:
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 1-2, 2-3, 18-24M, Custom Size"
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomSize();
                          }
                        }}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-amber-300 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSize}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs whitespace-nowrap cursor-pointer"
                      >
                        + Add Custom Size
                      </button>
                    </div>

                    {customSizesList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-amber-900 mr-1">Added Custom Sizes:</span>
                        {customSizesList.map((cs) => (
                          <span
                            key={cs}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 text-[11px] font-bold text-amber-900 shadow-2xs"
                          >
                            <span>{cs}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomSize(cs)}
                              className="text-amber-700 hover:text-red-600 cursor-pointer"
                              title="Remove custom size"
                            >
                              <HiOutlineX className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Add Color & Auto-Generate Sizes Feature */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-cream-light to-amber-50/60 border border-amber-200/90 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎨</span>
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Quick Add Color & Auto-Generate Sizes
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                        {referenceSizes.length} sizes present ({referenceSizes.join(', ')})
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      Auto-creates rows with empty stock (enter 0 if out of stock)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type new color (e.g. Red, Royal Blue, Olive Green)..."
                      value={quickColorInput}
                      onChange={(e) => setQuickColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAutoGenerateForColor(quickColorInput);
                        }
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-primary font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateForColor(quickColorInput)}
                      disabled={!quickColorInput.trim()}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚡ Auto-Generate {referenceSizes.length} Sizes</span>
                    </button>
                  </div>
                </div>

                {/* Variant Table */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {variants.map((v, idx) => {
                    const isStockEmpty = v.stock === '' || v.stock === null || v.stock === undefined || String(v.stock).trim() === '';
                    const colTrimmed = (v.color || '').trim();
                    const missingSizes = colTrimmed && colTrimmed.length >= 2 ? getMissingSizesForColor(colTrimmed) : [];
                    // Only display the prompt on the last row matching this color
                    const isLastRowForThisColor =
                      colTrimmed &&
                      variants
                        .map((row, i) => ({ color: (row.color || '').trim().toLowerCase(), idx: i }))
                        .filter((row) => row.color === colTrimmed.toLowerCase())
                        .pop()?.idx === idx;
                    const showColorPrompt = isLastRowForThisColor && missingSizes.length > 0 && referenceSizes.length > 1;

                    const colorPhotoRef = getColorPhoto(v.color) || allPhotoPool[0]?.ref || '';
                    const resolvedRef = v.image || colorPhotoRef;
                    const variantPreviewUrl = resolvePreviewUrl(resolvedRef);

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className={`flex items-center gap-2 text-xs p-1 rounded-xl transition-all ${
                          isStockEmpty ? 'bg-red-50/50 ring-1 ring-red-300' : 'bg-transparent'
                        }`}>
                          <input
                            type="text"
                            placeholder="Color (e.g. Red, Navy)"
                            value={v.color}
                            onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                            className="flex-1 min-w-[100px] px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 font-medium"
                          />
                          <select
                            value={v.size}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                const val = window.prompt('Enter custom manual size (e.g. 1-2, 2-3, 18-24M):');
                                if (val && val.trim()) {
                                  const customVal = val.trim();
                                  if (!customSizesList.includes(customVal)) {
                                    setCustomSizesList((prev) => [...prev, customVal]);
                                  }
                                  if (!selectedSizes.includes(customVal)) {
                                    setSelectedSizes((prev) => [...prev, customVal]);
                                  }
                                  handleVariantChange(idx, 'size', customVal);
                                }
                              } else {
                                handleVariantChange(idx, 'size', e.target.value);
                              }
                            }}
                            className="w-24 px-2 py-2 rounded-xl border border-neutral-200 bg-neutral-50 font-bold shrink-0"
                          >
                            {availableSizes.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            {gender === 'kids' && (
                              <option value="__custom__">+ Custom Size...</option>
                            )}
                          </select>
                          <div className="relative shrink-0">
                            <input
                              type="number"
                              min="0"
                              placeholder="Stock *"
                              value={v.stock}
                              onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                              className={`w-20 px-2 py-2 rounded-xl font-bold text-center border transition-all ${
                                isStockEmpty
                                  ? 'border-red-400 bg-white text-red-900 placeholder:text-red-400 ring-2 ring-red-300'
                                  : 'border-neutral-200 bg-neutral-50 text-neutral-900'
                              }`}
                            />
                            {isStockEmpty && (
                              <span className="block text-[9px] text-red-600 font-bold text-center">
                                Empty (0+ req)
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="SKU"
                            value={v.sku || ''}
                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                            className="w-24 px-2 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-[11px] font-mono shrink-0"
                          />

                          {/* Variant Photo: Inherited Color Photo or Custom Size Override */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-7 h-9 rounded-md overflow-hidden bg-neutral-200 border border-neutral-300 shrink-0 aspect-[3/4] relative">
                              {variantPreviewUrl ? (
                                <img
                                  src={getImageUrl(variantPreviewUrl)}
                                  alt={`${v.color} ${v.size}`}
                                  className="w-full h-full object-cover object-top"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-neutral-400">
                                  —
                                </div>
                              )}
                            </div>

                            <select
                              value={v.image || ''}
                              onChange={(e) => handleVariantChange(idx, 'image', e.target.value)}
                              className={`w-36 px-2 py-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                                v.image
                                  ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-300'
                                  : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                              }`}
                              title={v.image ? 'Custom photo set for this size variant' : `Using default ${v.color || 'color'} photo`}
                            >
                              <option value="">
                                🎨 {v.color ? `${v.color} Photo` : 'Color Photo'} (Inherited)
                              </option>
                              {allPhotoPool.map((p) => (
                                <option key={p.id} value={p.ref}>
                                  📷 Custom: {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="p-2 text-neutral-400 hover:text-red-600 rounded-lg cursor-pointer shrink-0"
                            title="Remove variant row"
                          >
                            <HiOutlineX className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Inline Prompt: When typing a color that is missing sizes */}
                        {showColorPrompt && (
                          <div className="ml-1 mr-1 p-2 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs text-amber-950 font-medium">
                              <span className="text-amber-600 font-bold">💡 Auto-Generate:</span>
                              <span>
                                Color <strong>"{colTrimmed}"</strong> has {referenceSizes.length - missingSizes.length} of {referenceSizes.length} sizes.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAutoGenerateForColor(colTrimmed)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-xs whitespace-nowrap cursor-pointer flex items-center gap-1 transition-transform hover:scale-105"
                            >
                              <span>⚡ Auto-Generate Remaining {missingSizes.length} Size{missingSizes.length > 1 ? 's' : ''} ({missingSizes.join(', ')})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-neutral-100 gap-2">
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    <HiOutlinePlus className="w-4 h-4" />
                    <span>Add Custom Variant Row</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {variants.some((v) => v.stock === '' || v.stock === null || v.stock === undefined || String(v.stock).trim() === '') ? (
                      <span className="text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Stock cannot be empty (0 is allowed)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>✓</span>
                        <span>All variant stocks set</span>
                      </span>
                    )}
                    <span className="text-xs font-bold text-neutral-800">
                      Total Calculated Stock: {variants.reduce((s, v) => s + (parseInt(v.stock, 10) || 0), 0)} Units
                    </span>
                  </div>
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
      </div>
    )}
    </div>
  );
};

export default ProductManager;
