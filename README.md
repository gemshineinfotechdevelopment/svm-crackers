# Varun Trade - Fullstack Application

Varun Trade is a billing and inventory management application built with **React (Vite) + TypeScript + Material UI** on the frontend and **Express + TypeScript + MongoDB (Mongoose)** on the backend.

---

## 📁 Project Structure

```text
varun-trade/                         # Root Project Directory (Frontend + Monorepo root)
├── index.html                       # Frontend HTML entry point
├── package.json                     # Frontend & Root scripts configuration
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript base config
├── .env                             # Frontend environment variables (VITE_API_BASE_URL)
│
├── src/                             # 🎨 FRONTEND SOURCE CODE (React + TS + MUI)
│   ├── assets/                      # Static assets (images, logos, icons)
│   ├── components/                  # React UI components & pages
│   │   ├── AddCompanyPage.tsx
│   │   ├── AddCustomerPage.tsx
│   │   ├── AllCustomersPage.tsx
│   │   ├── BillPrintModal.tsx
│   │   ├── BillPrintTemplate.tsx
│   │   ├── CompaniesPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── Navbar.tsx
│   │   ├── ParticularsPage.tsx
│   │   └── ProductsPage.tsx
│   ├── services/                    # API client (Axios/Fetch calls to backend)
│   │   └── api.ts
│   ├── theme/                       # Material UI Theme customizations
│   │   └── theme.ts
│   ├── utils/                       # Helper functions (printUtils, formatting)
│   │   └── printUtils.ts
│   ├── App.tsx                      # Main Application Component
│   ├── main.tsx                     # React DOM entry point
│   └── index.css                    # Global styling
│
└── server/                          # 🚀 BACKEND (Express + TS + Mongo)
    ├── package.json                 # Backend dependencies & scripts
    ├── tsconfig.json                # Backend TypeScript configuration
    ├── .env                         # Backend environment variables (DB URI, PORT, CORS)
    ├── config/                      # DB Connection (MongoDB Mongoose)
    ├── controllers/                 # Request handlers / business logic
    ├── middleware/                  # Auth, error handling middlewares
    ├── models/                      # Mongoose data schemas (Customer, Product, etc.)
    ├── routes/                      # Express REST API route definitions
    ├── utils/                       # Server utilities & helper functions
    └── index.ts                     # Express Server entry point
```

---

## ⚡ How to Run the Application

> **Note:** Always run npm commands from the project root (`Dheeksha-trade`), **do not `cd src`**!

### 1. Run Both Frontend & Backend Together (Recommended)
From the root directory:
```bash
npm run dev:all
```
*Frontend runs on `http://localhost:5173` (or `5000`)*  
*Backend API runs on `http://localhost:5001`*

### 2. Run Only Frontend
From the root directory:
```bash
npm run dev
```

### 3. Run Only Backend Server
From the root directory:
```bash
npm run dev:server
```
*(Or `cd server` then `npm run dev`)*

### 4. Build for Production
From the root directory:
```bash
npm run build:all
```

