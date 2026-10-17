# Friends Collections 👗👔

Modern full-stack e-commerce web platform for **Friends Collections**, Jamalia, Chennai.

## 🚀 Features
- **Modern Responsive Storefront**: Curated collections for Women (Sarees, Kurtis, Western), Men (Shirts, T-Shirts, Trousers), and Accessories.
- **Dynamic Shopping Cart & Checkout**: Real-time cart management, persistent storage, and WhatsApp order fulfillment.
- **Admin Management Portal**: Complete dashboard for managing banners, categories, products, inventory, coupons, orders, and store settings.
- **Mobile-First Experience**: Optimized swipeable grids, clean navigation drawer with smooth transitions, and instant access.
- **Production Ready**: Configured for Render (Backend) and Vercel (Frontend).

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, React Icons, React Hot Toast, React Router v7
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Multer
- **Hosting**:
  - **Frontend**: [Vercel](https://vercel.com)
  - **Backend**: [Render](https://render.com)
  - **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas)

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
├── render.yaml          # Render Blueprint deployment config
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

## 🚀 Production Deployment Guide

### Step 1: Deploy Backend to Render

1. Log into **[dashboard.render.com](https://dashboard.render.com/)**.
2. Click **New +** → **Web Service**.
3. Select your GitHub repository: **`Subash-S-66/Friends-Collection`**.
4. Configure service settings:
   - **Name**: `friends-collection-api`
   - **Region**: Oregon (or nearest to your users)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`)
   - `JWT_SECRET`: A secure random secret string
   - `ADMIN_EMAIL`: `friends.collection06@gmail.com`
   - `ADMIN_PASSWORD`: Your chosen admin password
   - `CLIENT_URL`: `https://your-frontend.vercel.app` (or leave empty to allow all Vercel domains)
6. Click **Deploy Web Service**.
7. Copy your Render backend URL (e.g., `https://friends-collection-api.onrender.com`).

---

### Step 2: Deploy Frontend to Vercel

1. Log into **[vercel.com/new](https://vercel.com/new)**.
2. Import the GitHub repository **`Subash-S-66/Friends-Collection`**.
3. In **Build and Output Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**:
   - Add `VITE_API_URL` with value: `https://friends-collection-api.onrender.com/api` *(use your Render URL + `/api`)*
5. Click **Deploy**.

---

## 📞 Contact & Store Info
- **Store Name**: Friends Collections
- **Address**: 7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 12
- **Phone**: 9500757024
- **Instagram**: [@friends_collection_in](https://instagram.com/friends_collection_in)
