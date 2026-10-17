import { Link } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineHeart, HiOutlineShieldCheck, HiOutlineShoppingBag, HiArrowRight } from 'react-icons/hi';

const About = () => {
  return (
    <div className="min-h-screen bg-cream py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent-700 bg-accent-100/60 px-4 py-1.5 rounded-full border border-accent-200">
            About Friends Collections
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Style That Defines You
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 font-light leading-relaxed">
            Born in Jamalia, Chennai, Friends Collections was founded on a simple philosophy: every woman deserves access
            to luxurious, trending ethnic and contemporary fashion without exorbitant markups.
          </p>
        </div>

        {/* 4 Brand Pillars (from business card!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-accent-100 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary flex items-center justify-center mx-auto shadow-inner">
              <HiOutlineSparkles className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-neutral-900">Trendy Fashion</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Curating runway and festive trends straight into wearable daily and celebration wear.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-accent-100 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center mx-auto shadow-inner">
              <HiOutlineShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-neutral-900">Quality Collections</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Carefully vetted textiles, resilient dyes, and comfortable linings that last seasons.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-accent-100 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blush-100 text-primary flex items-center justify-center mx-auto shadow-inner">
              <HiOutlineHeart className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-neutral-900">Style for Every You</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Diverse fits, sizes, and colors tailored for weddings, office parties, and festive pujas.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-accent-100 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <HiOutlineShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-neutral-900">Best Prices Always</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Direct sourcing enables us to offer premium dress collections at honest factory-direct rates.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-accent-100 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <img
              src="/logo.png"
              alt="Friends Collections emblem"
              className="w-56 h-56 sm:w-72 sm:h-72 rounded-full object-cover shadow-2xl p-2 bg-gradient-to-tr from-accent-400 via-primary to-accent-300"
            />
          </div>
          <div className="lg:col-span-7 space-y-5">
            <h2 className="font-serif text-3xl font-bold text-neutral-900">
              Our Journey in Chennai
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Located on Perambur High Road in Jamalia, Friends Collections has grown into a cherished fashion hotspot
              for shoppers looking for unique sarees, elegant salwar kameez sets, bridal lehengas, and fusion wear.
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              With our new digital platform, you can browse new styles as soon as they drop into our boutique, order with
              cash or UPI on delivery, and enjoy free door delivery right across Chennai and India.
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary hover:bg-primary-light text-white font-semibold text-sm shadow-md transition-all"
              >
                <span>Browse Latest Collection</span>
                <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
