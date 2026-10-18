import { useState, useEffect, useRef } from 'react';
import {
  HiOutlineMail,
  HiOutlineSparkles,
  HiOutlinePaperAirplane,
  HiOutlineEye,
  HiOutlinePhotograph,
  HiOutlineTag,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineDeviceMobile,
  HiOutlineDesktopComputer,
  HiOutlineColorSwatch,
  HiOutlineLightningBolt
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getImageUrl } from '../utils/formatters';

// Pre-built Festival and Sale Templates
const FESTIVAL_TEMPLATES = [
  {
    name: '🪔 Diwali Grand Festival Sale',
    title: 'Diwali Dhamaka Sale 2026',
    subject: '🪔 Grand Diwali Silk Sale - Flat 40% Off Handwoven Silks & Lehengas!',
    preheader: 'Celebrate with authentic Kanchipuram silks, festive lehengas, and free doorstep delivery.',
    badgeText: 'DIWALI FESTIVAL SPECIAL',
    headline: 'Illuminate Your Celebrations in Royal Heritage Elegance',
    bannerImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
    fontFamily: "'Playfair Display', Georgia, serif",
    couponCode: 'DIWALI40',
    ctaText: 'Shop Diwali Festive Sarees',
    ctaUrl: 'https://friends-collection.vercel.app/shop?gender=women',
    bodyHtml: `
<p style="font-size: 16px; color: #4A0E17; font-weight: 700; text-align: center; margin-bottom: 12px;">
  May this Diwali bring prosperity, radiance, and impeccable style to your home!
</p>
<p style="line-height: 1.8; color: #44403C; margin-bottom: 16px;">
  Friends Collections is delighted to unveil our grandest festive curation. Discover pure <span style="background-color: #FFF3CD; color: #856404; padding: 2px 8px; border-radius: 4px; font-weight: bold; border: 1px solid #FFE082;">Kanchipuram & Banarasi Silk Sarees</span>, vibrant twirling lehengas, and tailored festive kurtas handwoven with authentic golden zari craftsmanship.
</p>
<div style="background-color: #FAF4EB; border-left: 4px solid #C88A65; padding: 14px 18px; margin: 18px 0; border-radius: 0 12px 12px 0;">
  <strong style="color: #4A0E17; display: block; margin-bottom: 4px;">✦ Exclusive Festival Highlights:</strong>
  <ul style="margin: 0; padding-left: 20px; color: #57534E; font-size: 13px; line-height: 1.6;">
    <li>Flat <span style="color: #B02A37; font-weight: bold;">40% OFF</span> on all bridal silk sarees & grand lehengas</li>
    <li>Complimentary blouse stitching & matching tassels</li>
    <li>Guaranteed express doorstep dispatch before Diwali</li>
  </ul>
</div>
<p style="text-align: center; font-size: 13px; color: #78716C; margin-top: 14px;">
  Visit our boutique at Jamalia, Chennai or place your order online right away!
</p>
`
  },
  {
    name: '🌾 Pongal Traditional Harvest Offer',
    title: 'Pongal Traditional Weaves 2026',
    subject: '🌾 Iniya Pongal Thirunaal Nalvazhthukkal! Exclusive Silk & Traditional Wear Launch',
    preheader: 'Adorn traditional pure silk dhotis, pattu sarees, and kids pavadai sets for the auspicious harvest festival.',
    badgeText: 'PONGAL HARVEST CELEBRATION',
    headline: 'Celebrate Tamil Heritage with Timeless Handloom Splendor',
    bannerImage: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1200&q=80',
    fontFamily: "'Playfair Display', Georgia, serif",
    couponCode: 'PONGAL2026',
    ctaText: 'Explore Pongal Traditional Collection',
    ctaUrl: 'https://friends-collection.vercel.app/shop',
    bodyHtml: `
<p style="font-size: 15px; text-align: center; color: #0F5132; font-weight: 700; margin-bottom: 12px;">
  🌾 Pongal Thirunaal Special Weaves from Master Artisans of Tamil Nadu!
</p>
<p style="line-height: 1.8; color: #44403C; margin-bottom: 16px;">
  Honor the season of gratitude and joy with authentic handloom silks. Featuring <span style="background-color: #E8F5E9; color: #1B5E20; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Pure Zari Pattu Veshti Sets</span>, vibrant traditional temple border sarees, and adorable <span style="color: #C88A65; font-weight: bold;">Kids Pattu Pavadai</span>.
</p>
<p style="font-size: 13px; line-height: 1.7; color: #57534E;">
  Each garment is crafted with 100% natural breathable fibers, ensuring all-day festive comfort for the entire family.
</p>
`
  },
  {
    name: '⚡ 48-Hour Weekend Flash Clearance',
    title: 'Weekend Flash Clearance',
    subject: '⚡ 48-HOUR FLASH CLEARANCE: Flat 50% Off Top Selling Festive Dresses!',
    preheader: 'Limited stock remaining. Claim your favorite ethnic designs before prices revert on Monday.',
    badgeText: 'LIMITED 48-HOUR CLEARANCE',
    headline: 'Unbeatable Boutique Prices on Trending Fashion',
    bannerImage: '',
    fontFamily: "'Inter', sans-serif",
    couponCode: 'FLASH50',
    ctaText: 'Claim 50% Off Now',
    ctaUrl: 'https://friends-collection.vercel.app/shop?tag=trending',
    bodyHtml: `
<p style="font-size: 16px; color: #B02A37; font-weight: 800; text-align: center; margin-bottom: 10px;">
  ⚠️ STRICTLY 48 HOURS ONLY • WHILE STOCKS LAST
</p>
<p style="line-height: 1.8; color: #374151; text-align: center; margin-bottom: 16px;">
  We are refreshing our Chennai boutique racks! Take advantage of <span style="background-color: #FEE2E2; color: #991B1B; padding: 3px 8px; border-radius: 6px; font-weight: bold;">FLAT 50% SAVINGS</span> across select party wear kurtis, daily linens, and festive outfits.
</p>
<div style="text-align: center; margin: 18px 0;">
  <span style="display: inline-block; padding: 8px 18px; background: #FEF3C7; color: #92400E; border-radius: 9999px; font-weight: 700; font-size: 12px;">
    ⚡ First Come, First Served • Over 40+ Styles on Deep Discount
  </span>
</div>
`
  },
  {
    name: '🧒 Kids Festive & Playful Carnival',
    title: 'Kids Festive Studio Launch',
    subject: '🧒 Adorable Kids Ethnic Wear is Here! Pattu Pavadai, Kurta Sets & Frocks',
    preheader: 'Dress your little prince & princess in breathable, skin-friendly festive elegance.',
    badgeText: 'KIDS FESTIVE LAUNCH',
    headline: 'Adorable Festive Fashion Crafted with Tender Love',
    bannerImage: '',
    fontFamily: "'Playfair Display', Georgia, serif",
    couponCode: 'KIDSFEST25',
    ctaText: 'Shop Kids Collection',
    ctaUrl: 'https://friends-collection.vercel.app/shop?gender=kids',
    bodyHtml: `
<p style="font-size: 15px; color: #D97706; font-weight: 700; text-align: center; margin-bottom: 12px;">
  Celebrate Special Moments with Tender Comfort & Bright Colors!
</p>
<p style="line-height: 1.8; color: #44403C; margin-bottom: 14px;">
  Our new <span style="background-color: #FEF3C7; color: #B45309; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Kids Festive Studio</span> has arrived at Friends Collections. Featuring scratch-free pure cotton linings, lightweight golden borders, and celebratory silhouettes for children aged 0 to 14 years.
</p>
`
  }
];

// Highlight presets
const HIGHLIGHT_COLORS = [
  { name: 'Gold Foil', bg: '#FFF3CD', color: '#856404', border: '#FFE082' },
  { name: 'Rose Silk', bg: '#FCE4EC', color: '#880E4F', border: '#F8BBD0' },
  { name: 'Emerald', bg: '#E8F5E9', color: '#1B5E20', border: '#C8E6C9' },
  { name: 'Royal Velvet', bg: '#F3E5F5', color: '#4A148C', border: '#E1BEE7' },
  { name: 'Sky Aqua', bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' }
];

// Text color swatches
const TEXT_COLORS = [
  { name: 'Royal Maroon', hex: '#4A0E17' },
  { name: 'Antique Gold', hex: '#C88A65' },
  { name: 'Pure Gold', hex: '#D4AF37' },
  { name: 'Emerald Green', hex: '#0F5132' },
  { name: 'Ruby Red', hex: '#B02A37' },
  { name: 'Navy Sapphire', hex: '#0D2240' },
  { name: 'Charcoal Black', hex: '#212529' }
];

// Font Families
const FONT_OPTIONS = [
  { label: 'Classical Serif (Playfair Display / Georgia)', value: "'Playfair Display', Georgia, serif" },
  { label: 'Majestic Regal (Cinzel / Serif)', value: "'Cinzel', Georgia, serif" },
  { label: 'Modern Clean (Inter / Sans-Serif)', value: "'Inter', -apple-system, sans-serif" },
  { label: 'Cursive Accent (Brush Script / Cursive)', value: "'Brush Script MT', cursive" }
];

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  // Editor Form States
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('Diwali Dhamaka Sale 2026');
  const [subject, setSubject] = useState('🪔 Grand Diwali Silk Sale - Flat 40% Off Handwoven Silks & Lehengas!');
  const [preheader, setPreheader] = useState('Celebrate with authentic Kanchipuram silks, festive lehengas, and free doorstep delivery.');
  const [badgeText, setBadgeText] = useState('DIWALI FESTIVAL SPECIAL');
  const [headline, setHeadline] = useState('Illuminate Your Celebrations in Royal Heritage Elegance');
  const [bannerImage, setBannerImage] = useState('https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80');
  const [fontFamily, setFontFamily] = useState("'Playfair Display', Georgia, serif");
  const [couponCode, setCouponCode] = useState('DIWALI40');
  const [ctaText, setCtaText] = useState('Shop Diwali Festive Sarees');
  const [ctaUrl, setCtaUrl] = useState('https://friends-collection.vercel.app/shop?gender=women');
  const [targetAudience, setTargetAudience] = useState('all');
  const [bodyHtml, setBodyHtml] = useState(FESTIVAL_TEMPLATES[0].bodyHtml);

  // Custom Color State
  const [selectedTextColor, setSelectedTextColor] = useState('#4A0E17');

  // Preview State
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' or 'mobile'
  const [testEmailAddress, setTestEmailAddress] = useState('friends.collection06@gmail.com');
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [bannerUploadLoading, setBannerUploadLoading] = useState(false);

  // Editable div ref
  const editorRef = useRef(null);

  // Load campaigns
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await API.get('/campaigns/admin');
      setCampaigns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      toast.error('Failed to load campaigns list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Sync editor innerHTML when template or bodyHtml changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml;
    }
  }, [bodyHtml]);

  // Load a pre-made template
  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title);
    setSubject(tpl.subject);
    setPreheader(tpl.preheader);
    setBadgeText(tpl.badgeText);
    setHeadline(tpl.headline);
    setBannerImage(tpl.bannerImage || '');
    setFontFamily(tpl.fontFamily);
    setCouponCode(tpl.couponCode || '');
    setCtaText(tpl.ctaText);
    setCtaUrl(tpl.ctaUrl);
    setBodyHtml(tpl.bodyHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = tpl.bodyHtml;
    }
    toast.success(`Loaded "${tpl.name}" template!`, { icon: '✨' });
  };

  // Text formatting commands
  const applyExecCommand = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  // Apply custom highlight to selected text
  const applyHighlight = (hl) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      // If no text is selected, append a highlighted example block
      const snippet = `<span style="background-color: ${hl.bg}; color: ${hl.color}; padding: 2px 8px; border-radius: 4px; font-weight: bold; border: 1px solid ${hl.border};">Highlighted Festive Highlight</span>&nbsp;`;
      applyExecCommand('insertHTML', snippet);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = hl.bg;
    span.style.color = hl.color;
    span.style.padding = '2px 8px';
    span.style.borderRadius = '4px';
    span.style.fontWeight = 'bold';
    span.style.border = `1px solid ${hl.border}`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  // Apply custom color to selected text
  const applyTextColor = (colorHex) => {
    setSelectedTextColor(colorHex);
    applyExecCommand('foreColor', colorHex);
  };

  // Insert a stylized quote or divider
  const insertDivider = () => {
    const dividerHtml = `<div style="text-align: center; color: #D4AF37; margin: 18px 0; font-size: 14px; letter-spacing: 6px;">✦ ✦ ✦</div>`;
    applyExecCommand('insertHTML', dividerHtml);
  };

  const insertFestiveCard = () => {
    const cardHtml = `
      <div style="background-color: #FFF9F3; border: 1.5px solid #E6D0BE; border-radius: 14px; padding: 16px; margin: 16px 0; text-align: center;">
        <h4 style="margin: 0 0 6px; color: #4A0E17; font-size: 15px; font-weight: bold;">✦ Special Festive Offer Inside ✦</h4>
        <p style="margin: 0; font-size: 13px; color: #57534E;">Complimentary matching accessories & doorstep delivery on all orders above ₹999.</p>
      </div>
    `;
    applyExecCommand('insertHTML', cardHtml);
  };

  // Upload hero banner image
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('banner', file);
      const res = await API.post('/campaigns/admin/upload-banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBannerImage(res.data.imageUrl);
      toast.success('Hero banner uploaded successfully!', { icon: '🖼️' });
    } catch (err) {
      console.error('Banner upload error:', err);
      toast.error('Failed to upload banner');
    } finally {
      setBannerUploadLoading(false);
    }
  };

  // Save campaign (create or update)
  const handleSaveCampaign = async (status = 'draft') => {
    if (!title || !subject || !bodyHtml) {
      toast.error('Please enter Campaign Title, Subject, and Content');
      return;
    }

    setSaving(true);
    const payload = {
      title,
      subject,
      preheader,
      badgeText,
      headline,
      bannerImage,
      bodyHtml,
      ctaText,
      ctaUrl,
      couponCode,
      targetAudience,
      status
    };

    try {
      if (editingId) {
        await API.put(`/campaigns/admin/${editingId}`, payload);
        toast.success('Campaign updated successfully!');
      } else {
        const res = await API.post('/campaigns/admin', payload);
        setEditingId(res.data._id);
        toast.success('Campaign saved as draft!');
      }
      fetchCampaigns();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // Send Test Email
  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmailAddress || !/\S+@\S+\.\S+/.test(testEmailAddress)) {
      toast.error('Please enter a valid test email address');
      return;
    }

    setTestEmailLoading(true);
    try {
      const payload = {
        title,
        subject,
        preheader,
        badgeText,
        headline,
        bannerImage,
        bodyHtml,
        ctaText,
        ctaUrl,
        couponCode
      };

      const res = await API.post('/campaigns/admin/test', {
        testEmail: testEmailAddress,
        campaign: payload
      });

      toast.success(res.data.message || 'Test email dispatched!', { icon: '📬', duration: 4000 });
      setTestModalOpen(false);
    } catch (err) {
      console.error('Test email error:', err);
      toast.error(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Send Live Campaign Blast to All Recipients
  const handleSendBlast = async () => {
    if (!editingId) {
      // Auto-save first
      await handleSaveCampaign();
    }

    const targetDesc =
      targetAudience === 'all'
        ? 'ALL registered customers & waitlist subscribers'
        : targetAudience === 'customers'
        ? 'all registered customers'
        : 'all waitlist subscribers';

    if (!window.confirm(`⚠️ ARE YOU SURE? This will dispatch the live email blast to ${targetDesc} using Nodemailer!`)) {
      return;
    }

    setSendingBlast(true);
    try {
      const campaignId = editingId;
      const res = await API.post(`/campaigns/admin/send/${campaignId}`);
      toast.success(res.data.message || 'Campaign blast dispatched successfully!', {
        icon: '🚀',
        duration: 5000
      });
      fetchCampaigns();
    } catch (err) {
      console.error('Blast error:', err);
      toast.error(err.response?.data?.message || 'Failed to send campaign blast');
    } finally {
      setSendingBlast(false);
    }
  };

  // Edit existing campaign
  const handleSelectCampaign = (c) => {
    setEditingId(c._id);
    setTitle(c.title);
    setSubject(c.subject);
    setPreheader(c.preheader || '');
    setBadgeText(c.badgeText || '');
    setHeadline(c.headline || '');
    setBannerImage(c.bannerImage || '');
    setCouponCode(c.couponCode || '');
    setCtaText(c.ctaText || 'Explore Collection');
    setCtaUrl(c.ctaUrl || 'https://friends-collection.vercel.app/shop');
    setTargetAudience(c.targetAudience || 'all');
    setBodyHtml(c.bodyHtml || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = c.bodyHtml || '';
    }
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Delete campaign
  const handleDeleteCampaign = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this campaign draft?')) return;
    try {
      await API.delete(`/campaigns/admin/${id}`);
      toast.success('Campaign deleted');
      if (editingId === id) setEditingId(null);
      fetchCampaigns();
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 text-accent-800 text-xs font-bold uppercase tracking-wider mb-1.5">
            <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-700" />
            Marketing & Festive Suite
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            Email Campaigns & Festival Sales
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Design royal marketing announcements, flash offers, and festival blasts with custom fonts, colors, and live preview.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 shadow-xs transition-all"
          >
            <HiOutlinePaperAirplane className="w-4 h-4 text-accent-600" />
            <span>Send Test Email</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveCampaign('draft')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary-50 text-xs font-bold transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update Draft' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={handleSendBlast}
            disabled={sendingBlast}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light active:scale-95 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {sendingBlast ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <HiOutlineLightningBolt className="w-4 h-4 text-amber-300" />
                <span>Blast to All Customers 🚀</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick 1-Click Festive Presets */}
      <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
            <HiOutlineSparkles className="w-4 h-4 text-accent-600" />
            1-Click Festive & Sale Presets (Load Ready-to-Send Template)
          </span>
          <span className="text-[11px] text-neutral-400">Click to instantly populate email</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FESTIVAL_TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className="text-left p-3.5 rounded-2xl border border-neutral-200 hover:border-accent-400 hover:bg-accent-50/40 transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="font-bold text-xs text-neutral-900 group-hover:text-primary block mb-1">
                  {tpl.name}
                </span>
                <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                  {tpl.subject}
                </p>
              </div>
              <span className="text-[10px] text-accent-700 font-bold mt-2 inline-flex items-center gap-1">
                Use Template →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Editor (Left) & Real-Time Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: VISUAL BUILDER & CONTROLS                   */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-5">
            <h3 className="font-serif text-lg font-bold text-neutral-900 pb-3 border-b border-neutral-100 flex items-center justify-between">
              <span>Campaign Details & Header</span>
              {editingId && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-accent-100 text-accent-800 font-sans font-semibold">
                  Editing Campaign
                </span>
              )}
            </h3>

            {/* Campaign Internal Title */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Internal Campaign Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Diwali Dhamaka 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Email Subject Line (User Request: "have subject") */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Email Subject Line * (What customers see in inbox)
              </label>
              <div className="relative">
                <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="🪔 Grand Diwali Silk Sale - Flat 40% Off Handwoven Silks!"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Inbox Preheader Snippet */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Inbox Preheader Snippet (Preview text)
              </label>
              <input
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Celebrate with authentic Kanchipuram silks and free doorstep delivery..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Festive Badge Text & Big Headline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Festive Badge Pill
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. DIWALI FESTIVAL SPECIAL"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs uppercase tracking-wider focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Font Family Theme
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white font-medium"
                >
                  {FONT_OPTIONS.map((f, i) => (
                    <option key={i} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email Headline */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Main Email Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Illuminate Your Celebrations in Royal Heritage Elegance"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-serif font-bold text-neutral-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Hero Banner Image (User Request: "allow adding images") */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                <span>Hero Banner Image (Optional)</span>
                {bannerUploadLoading && <span className="text-[11px] text-primary">Uploading...</span>}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder="Paste banner image URL or upload below..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <label className="px-3 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold cursor-pointer shrink-0 transition-colors">
                  Upload File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Target Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '✨ All Customers', value: 'all' },
                  { label: '🛍️ Registered Only', value: 'customers' },
                  { label: '🔔 Waitlist Subscribers', value: 'waitlist' },
                ].map((aud) => (
                  <button
                    key={aud.value}
                    type="button"
                    onClick={() => setTargetAudience(aud.value)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      targetAudience === aud.value
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RICH FORMATTING TOOLBAR & CONTENT BODY                   */}
          {/* ======================================================== */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="font-serif text-lg font-bold text-neutral-900">
                Email Content & Formatting
              </span>
              <span className="text-[11px] text-neutral-400">
                Select text below to apply colors & highlights
              </span>
            </div>

            {/* 1. TEXT COLOR SWATCHES (User Request: "chngering coolr of spefuc text") */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                🎨 Change Text Color of Specific Words:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {TEXT_COLORS.map((tc) => (
                  <button
                    key={tc.hex}
                    type="button"
                    onClick={() => applyTextColor(tc.hex)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-semibold hover:border-neutral-400 transition-all bg-white"
                    title={`Apply ${tc.name}`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: tc.hex }}
                    />
                    <span style={{ color: tc.hex }}>{tc.name}</span>
                  </button>
                ))}
                <div className="flex items-center gap-1 pl-1">
                  <span className="text-[10px] text-neutral-400">Custom:</span>
                  <input
                    type="color"
                    value={selectedTextColor}
                    onChange={(e) => applyTextColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    title="Choose custom color"
                  />
                </div>
              </div>
            </div>

            {/* 2. TEXT HIGHLIGHT TOOL (User Request: "highlitgting tetxs") */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                🖍️ Highlight Selected Words:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {HIGHLIGHT_COLORS.map((hl) => (
                  <button
                    key={hl.name}
                    type="button"
                    onClick={() => applyHighlight(hl)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-2xs"
                    style={{
                      backgroundColor: hl.bg,
                      color: hl.color,
                      borderColor: hl.border
                    }}
                    title={`Highlight in ${hl.name}`}
                  >
                    ✦ {hl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. FORMATTING BUTTONS */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-neutral-100 border border-neutral-200">
              <button
                type="button"
                onClick={() => applyExecCommand('bold')}
                className="w-8 h-8 rounded bg-white text-neutral-800 font-bold hover:bg-neutral-50 flex items-center justify-center text-xs shadow-xs"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => applyExecCommand('italic')}
                className="w-8 h-8 rounded bg-white text-neutral-800 italic font-serif hover:bg-neutral-50 flex items-center justify-center text-xs shadow-xs"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => applyExecCommand('underline')}
                className="w-8 h-8 rounded bg-white text-neutral-800 underline hover:bg-neutral-50 flex items-center justify-center text-xs shadow-xs"
                title="Underline"
              >
                U
              </button>
              <button
                type="button"
                onClick={() => applyExecCommand('strikeThrough')}
                className="w-8 h-8 rounded bg-white text-neutral-800 line-through hover:bg-neutral-50 flex items-center justify-center text-xs shadow-xs"
                title="Strikethrough"
              >
                S
              </button>
              <span className="w-px h-5 bg-neutral-300 mx-1" />
              <button
                type="button"
                onClick={() => applyExecCommand('formatBlock', '<h3>')}
                className="px-2 h-8 rounded bg-white text-neutral-800 font-bold hover:bg-neutral-50 flex items-center justify-center text-xs shadow-xs"
                title="Subheading"
              >
                Heading
              </button>
              <button
                type="button"
                onClick={() => applyExecCommand('insertUnorderedList')}
                className="px-2 h-8 rounded bg-white text-neutral-800 hover:bg-neutral-50 flex items-center justify-center text-xs shadow-xs"
                title="Bullet List"
              >
                • List
              </button>
              <span className="w-px h-5 bg-neutral-300 mx-1" />
              <button
                type="button"
                onClick={insertFestiveCard}
                className="px-2.5 h-8 rounded bg-white text-primary font-bold hover:bg-primary-50 flex items-center justify-center text-xs shadow-xs"
                title="Insert Festive Highlight Box"
              >
                + Festive Box
              </button>
              <button
                type="button"
                onClick={insertDivider}
                className="px-2.5 h-8 rounded bg-white text-accent-700 font-bold hover:bg-accent-50 flex items-center justify-center text-xs shadow-xs"
                title="Insert Golden Stars Divider"
              >
                ✦ Divider
              </button>
            </div>

            {/* LIVE CONTENT EDITABLE AREA */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Body Content (Type or edit directly below):
              </label>
              <div
                ref={editorRef}
                contentEditable
                onInput={() => {
                  if (editorRef.current) {
                    setBodyHtml(editorRef.current.innerHTML);
                  }
                }}
                className="min-h-[220px] p-4 rounded-2xl border-2 border-accent-200 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-neutral-50/50 text-sm leading-relaxed overflow-y-auto outline-none"
                style={{ fontFamily }}
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Tip: Highlight any word with your cursor, then click any color swatch or highlight button above to style it!
              </span>
            </div>

            {/* Coupon Code & Call-to-Action Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Coupon Code (Optional)
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIWALI40"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono font-bold tracking-wider text-primary uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Shop Festive Collection"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Destination URL
                </label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://.../shop"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: REAL-TIME LIVE EMAIL PREVIEW               */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 sticky top-24 space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-2">
              <HiOutlineEye className="w-5 h-5 text-accent-700" />
              <span className="font-serif font-bold text-sm text-neutral-900">
                Live Customer Inbox Preview
              </span>
            </div>

            {/* Desktop / Mobile Preview Mode Switcher */}
            <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  previewDevice === 'desktop' ? 'bg-white text-primary shadow-xs' : 'text-neutral-500'
                }`}
                title="Desktop Preview"
              >
                <HiOutlineDesktopComputer className="w-4 h-4" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  previewDevice === 'mobile' ? 'bg-white text-primary shadow-xs' : 'text-neutral-500'
                }`}
                title="Mobile Preview"
              >
                <HiOutlineDeviceMobile className="w-4 h-4" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Email Preview Card */}
          <div
            className={`mx-auto bg-[#F8F5F0] p-4 sm:p-6 rounded-3xl border border-accent-200 shadow-md transition-all duration-300 ${
              previewDevice === 'mobile' ? 'max-w-sm' : 'w-full'
            }`}
          >
            {/* Fake Email Client Subject Header */}
            <div className="bg-white/80 p-3 rounded-2xl border border-neutral-200/80 mb-4 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>From: <strong>Friends Collections</strong> &lt;friends.collection06@gmail.com&gt;</span>
                <span>Just Now</span>
              </div>
              <p className="font-bold text-neutral-900 line-clamp-1">{subject || 'No Subject'}</p>
              <p className="text-[11px] text-neutral-500 line-clamp-1">{preheader || subject}</p>
            </div>

            {/* Email Body Container */}
            <div className="bg-white rounded-3xl overflow-hidden border border-[#EEDCD0] shadow-sm">
              {/* Royal Banner Header */}
              <div className="bg-gradient-to-br from-[#4A0E17] to-[#30080E] py-7 px-6 text-center text-white">
                <img
                  src="/logo.png"
                  alt="Friends Collections"
                  className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-[#D4AF37] shadow-lg mb-2"
                />
                <h2 className="font-serif text-lg font-bold tracking-widest uppercase text-white m-0">
                  Friends Collections
                </h2>
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#E2BFB3] font-medium block">
                  Style That Defines You
                </span>
                <div className="text-[#D4AF37] text-xs tracking-widest mt-1">✦ ✦ ✦</div>
              </div>

              {/* Main Preview Content */}
              <div className="p-6 sm:p-8 space-y-4" style={{ fontFamily }}>
                {/* Badge */}
                {badgeText && (
                  <div className="text-center">
                    <span className="inline-block bg-gradient-to-r from-[#FFF3CD] to-[#FFEBAA] text-[#856404] px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-[#FFE082]">
                      ✦ {badgeText} ✦
                    </span>
                  </div>
                )}

                {/* Banner Image */}
                {bannerImage && (
                  <div className="rounded-2xl overflow-hidden border border-[#EEDCD0] shadow-xs">
                    <img
                      src={bannerImage}
                      alt={title}
                      className="w-full max-h-56 object-cover"
                    />
                  </div>
                )}

                {/* Headline */}
                {headline && (
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#4A0E17] text-center leading-snug">
                    {headline}
                  </h3>
                )}

                {/* Formatted HTML Body */}
                <div
                  className="text-xs sm:text-sm text-[#44403C] leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />

                {/* Coupon Code Box */}
                {couponCode && (
                  <div className="bg-gradient-to-b from-[#FDF9F5] to-[#F5EDE4] border-2 border-dashed border-[#C88A65] rounded-2xl p-4 text-center my-4">
                    <span className="text-[10px] uppercase font-bold text-[#8C5338] tracking-widest block mb-1">
                      Exclusive Festival Coupon Code
                    </span>
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#4A0E17] tracking-widest bg-white px-4 py-1.5 rounded-xl border border-[#D4AF37] inline-block shadow-xs">
                      {couponCode}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-1.5">
                      Apply this code at checkout to claim your festive savings!
                    </span>
                  </div>
                )}

                {/* Action CTA Button */}
                {ctaText && (
                  <div className="text-center pt-2">
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block py-3.5 px-8 rounded-full bg-gradient-to-r from-[#4A0E17] to-[#681824] text-white text-xs font-bold uppercase tracking-wider shadow-lg border border-[#D4AF37] hover:opacity-95 transition-all"
                    >
                      {ctaText} →
                    </a>
                  </div>
                )}
              </div>

              {/* Royal Footer */}
              <div className="bg-[#FAF6F0] p-5 text-center text-[10px] text-[#8C827A] border-t border-[#EEDCD0] space-y-1">
                <p className="font-bold text-[#4A0E17] text-xs">
                  Friends Collections • Jamalia Store
                </p>
                <p>7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 600012</p>
                <p>WhatsApp Helpline: +91 95007 57024 • friends.collection06@gmail.com</p>
                <p className="text-[#A89C94] pt-1">
                  © 2026 Friends Collections. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CAMPAIGNS HISTORY TABLE                                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-neutral-900">Past Campaigns & Blasts</h3>
            <p className="text-xs text-neutral-500">History of dispatched and drafted festival sales</p>
          </div>
          <button
            type="button"
            onClick={fetchCampaigns}
            className="p-2 rounded-xl text-neutral-500 hover:text-primary hover:bg-neutral-100"
            title="Refresh list"
          >
            <HiOutlineRefresh className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-6">Campaign Title</th>
                <th className="py-3.5 px-6">Subject Line</th>
                <th className="py-3.5 px-6">Coupon</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Recipients Delivered</th>
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
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    No campaigns created yet. Select a festival template above and click "Save Draft"!
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => handleSelectCampaign(c)}
                    className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-neutral-900">
                      {c.title}
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-700 max-w-xs truncate">
                      {c.subject}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-primary">
                      {c.couponCode || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status === 'sent' ? '✓ Blast Delivered' : '📝 Draft'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-900">
                      {c.recipientCount > 0 ? `${c.recipientCount} Inboxes` : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSelectCampaign(c)}
                          className="p-2 rounded-lg text-neutral-600 hover:text-primary hover:bg-neutral-100"
                          title="Edit Campaign"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCampaign(c._id, e)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEND TEST EMAIL MODAL                                    */}
      {/* ======================================================== */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                <HiOutlinePaperAirplane className="w-5 h-5 text-accent-700" />
                <span>Send Test Campaign Email</span>
              </h3>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              We will dispatch a real test preview of <strong>&ldquo;{subject}&rdquo;</strong> via Nodemailer directly to the address below.
            </p>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Recipient Test Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testEmailLoading}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {testEmailLoading ? 'Dispatching...' : 'Send Test Email Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
