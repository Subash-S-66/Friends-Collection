# Friends Collections 👗👔

Modern full-stack e-commerce web platform for **Friends Collections**, Jamalia, Chennai.

## 🚀 Features
- **Modern Responsive Storefront**: Curated collections for Women (Sarees, Kurtis, Western), Men (Shirts, T-Shirts, Trousers), and Accessories.
- **Dynamic Shopping Cart & Checkout**: Real-time cart management, persistent storage, and WhatsApp order fulfillment.
- **Admin Management Portal**: Complete dashboard for managing banners, categories, products, inventory, coupons, orders, and store settings.
- **Mobile-First Experience**: Optimized swipeable grids, clean navigation drawer with smooth transitions, and instant access.
- **Vercel-Ready**: Preconfigured SPA rewrites for Vercel deployment.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, React Icons, React Hot Toast, React Router v7
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Multer
- **Deployment**: Vercel (Frontend), Render / Railway / Fly.io (Backend)

---

## 📁 Project Structure
```text
Friends-Collection/
├── client/              # Vite + React Frontend
│   ├── public/          # Static assets & favicon
│   ├── src/             # React components, pages, context, and utils
│   ├── vercel.json      # Client-level Vercel SPA rewrite config
│   └── package.json
├── server/              # Express + Node.js Backend API
│   ├── config/          # MongoDB connection config
│   ├── controllers/     # API request handlers
│   ├── middleware/      # Auth & rate-limiting middleware
│   ├── models/          # Mongoose data models
│   ├── routes/          # Express route definitions
│   ├── seed.js          # Database seed script
│   └── server.js        # Express application entrypoint
├── vercel.json          # Root Vercel deployment config
├── .env.example         # Environment template
└── package.json         # Root scripts
```

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Subash-S-66/Friends-Collection.git
cd Friends-Collection
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Update your MongoDB connection URI and secrets as needed.

### 3. Install Dependencies & Run
In one terminal (Backend):
```bash
cd server
npm install
npm run seed     # Seeds initial products, banners & admin
npm run dev      # Starts Express API at http://localhost:5000
```

In a second terminal (Frontend):
```bash
cd client
npm install
npm run dev      # Starts Vite dev server at http://localhost:5173
```

---

## 🌐 Deployment to Vercel

### Deploying Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **Add New Project** and import the **`Friends-Collection`** GitHub repository.
3. In **Build and Output Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (or leave as `./` — root `vercel.json` is also provided)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**:
   - Add `VITE_API_URL`: Your deployed backend URL + `/api` (e.g. `https://friends-collections-api.onrender.com/api`)
5. Click **Deploy**! 🚀

---

## 📞 Contact & Store Info
- **Store Name**: Friends Collections
- **Address**: 7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 12
- **Phone**: 9500757024
- **Instagram**: [@friends_collection_in](https://instagram.com/friends_collection_in)
