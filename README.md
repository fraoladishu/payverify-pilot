# PayVerify - Restaurant & Hotel Payment Verification System (Pilot)

PayVerify is a full-stack, mobile-first Progressive Web Application (PWA) designed for Ethiopian restaurants and hotels. It solves screenshot payment fraud by initiating direct request-to-pay push notifications via **Chapa** and **SantimPay** APIs, with a mobile-optimized interface for waiters and a desktop financial dashboard for cashiers.

---

## 🚀 Quick Start Guide

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Start Backend & Frontend
In Terminal 1 (Backend):
```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

---

## 👥 Default Demo Credentials

| Role | Username | Password | Device Profile |
| :--- | :--- | :--- | :--- |
| **Waiter (Mobile)** | `waiter1` | `Waiter1#SecureP@ss2026!` | Mobile Phone / PWA |
| **Waiter 2** | `waiter2` | `Waiter2#SecureP@ss2026!` | Mobile Phone / PWA |
| **Cashier (Desktop)** | `cashier1` | `Cashier1#DeskP@ss2026!` | Computer / Tablet Dashboard |
| **Admin / Supervisor**| `admin` | `Admin#HotelOwnerP@ss2026!` | Computer Dashboard |

> **Note**: PayVerify enforces a strict password policy: minimum 16 characters, requiring upper/lowercase letters, numbers, and symbols (or a 5+ word passphrase), and uniqueness across all accounts.

---

---

## 🚀 Production Deployment Options

### Option A: Monolithic Deployment (Single Node Server)
The backend server is already configured to automatically serve the compiled frontend production build from `frontend/dist`.

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```
2. **Start Production Backend**:
   ```bash
   cd ../backend
   npm start
   ```
   Both the API (`/api/*`) and the PWA frontend (`/*`) will run on port `5000` (`http://localhost:5000` or your domain).

---

## ✨ Features

- **Direct Cashier Verification**: Solves screenshot fraud by sending bill requests directly to the cashier station for real-time validation.
- **Support for All Major Ethiopian Payment Methods**: Telebirr, CBE Birr, Awash, Abyssinia, Coopay-Ebirr, and cash.
- **Multi-Table Tab Management**: Open, update, and manage orders per table seamlessly.
- **Strict Role-Based Access Control (RBAC)**: Distinct permissions for Waiter, Cashier, and Hotel Owner / Admin.
- **Executive Operations & Analytics Hub**: Real-time revenue analytics, cashier auditing, staff management, and chronological activity feeds.
- **16+ Character Strong Password Policy**: Enforces high-entropy security and cross-account uniqueness.
- **Rate-Limiting & Security-Hardened API**: Built-in IP rate limiter, strict state transition validation, and CORS protection.

