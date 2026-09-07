# Divide & Rule 🌍💸

> **Premium Expense Sharing & Group Travel Finance Platform**  
> Blending the craftsmanship of **Linear**, the modular simplicity of **Notion**, the wanderlust aesthetic of **Airbnb**, and the fluid polish of **Apple**.

---

## 📖 Table of Contents
1. [Project Overview & Philosophy](#-project-overview--philosophy)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Core Engineering & Financial Principles](#-core-engineering--financial-principles)
4. [Database Schemas (MongoDB)](#-database-schemas-mongodb)
5. [REST API Documentation](#-rest-api-documentation)
6. [Settlement & Balance Engine (Algorithms)](#-settlement--balance-engine-algorithms)
7. [Project Directory Structure](#-project-directory-structure)
8. [Getting Started & Local Development](#-getting-started--local-development)
9. [Running Automated Tests](#-running-automated-tests)
10. [Product Roadmap & Next Steps](#-product-roadmap--next-steps)

---

## 🌟 Project Overview & Philosophy

Traditional expense trackers feel like spreadsheets or tax tools. **Divide & Rule** is built with a different philosophy:
- **Travel-First**: Every screen evokes friendship, adventure, and ease.
- **Craftsmanship**: Deep Obsidian Green (`#051B14`), Electric Mint (`#00E599`), frosted glass cards (`rgba(255, 255, 255, 0.05)`), and modern typography.
- **Backend-First Single Source of Truth**: MongoDB Atlas & Express are the sole authority for all application data. Zero hardcoded mock data once an endpoint exists. The frontend renders live data, dispatches actions, and updates dynamically.

---

## 📐 Project Law: Backend-First Data Flow
All screens follow a strict unidirectional data flow:
$$\text{User Action (React Native / UI)} \longrightarrow \text{Express REST API} \longrightarrow \text{MongoDB Atlas} \longrightarrow \text{Calculated JSON} \longrightarrow \text{UI Refresh}$$
- **Frontend**: Renders backend state, manages loading/error feedback, dispatches requests. Holds **zero** permanent business data or hardcoded mock state.
- **Backend**: Single authority for Auth, Validation, Business Logic, Expense Splits, Dynamic Balances, and Settlement Simplifications.
- **Database**: MongoDB Atlas stores core entities (`users`, `friendrequests`, `friendships`, `trips`, `expenses`). Derived values (balances, settlement paths) are never stored; they are calculated dynamically.

---

## 🛠 Tech Stack & Architecture

### Backend
- **Runtime**: Node.js (v22+)
- **Framework**: Express.js
- **Database**: MongoDB Atlas Cloud (`cluster1.y67mzjr.mongodb.net/divide_and_rule`) & Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with 30-day sessions & `bcryptjs` password encryption
- **Port**: `http://localhost:5001` (avoids macOS AirPlay port 5000 conflicts)

### Frontend & Client
- **Mobile Architecture**: React Native (Mobile-First, Touch-Optimized)
- **State Management**: Zustand stores (`authStore.js`, etc.)
- **Interactive Simulator**: Served via lightweight HTTP preview on `http://localhost:3000`

---

## 🧠 Core Engineering & Financial Principles

### 1. Zero IEEE 754 Floating-Point Loss (Minor Currency Units)
- Floats like `4000.33` produce rounding inaccuracies in multi-way splits.
- All monetary amounts (`amountMinor`, `shareAmountMinor`, `netBalanceMinor`) are stored strictly as **64-bit integers in minor units (paise/cents)**:
  - ₹4,000.00 $\to$ `400000`
  - ₹33.33 $\to$ `3333`

### 2. Zero-Drift Remainder Cent Allocation
When dividing odd amounts (e.g. ₹100 among 3 friends):
$$\text{Base Share} = \lfloor 10000 / 3 \rfloor = 3333 \text{ paise}$$
$$\text{Remainder} = 10000 \pmod 3 = 1 \text{ paise}$$
The engine allocates the leftover remainder cent to the first member:
- Member 1: 3,334 paise
- Member 2: 3,333 paise
- Member 3: 3,333 paise  
**Total = 10,000 paise (exact ₹100.00, zero cents lost).**

### 3. Dynamic Balances (No Stored Balances in DB)
Balances are never persisted in the database. When requested, the engine aggregates active non-deleted expenses on-the-fly:
$$\text{Net Balance}_u = \sum \text{Paid By } u - \sum \text{Share of } u$$
$$\text{Invariant}: \sum_{u} \text{Net Balance}_u \equiv 0$$

### 4. Dual-Identifier Authentication (`@username` OR `email`)
Users can log in seamlessly using either their `@username` or their registered email address with the same password.

### 5. Internal `_id` Shielding
MongoDB's internal `_id` is never exposed in public JSON endpoints. External identity is anchored strictly to `@username`.

### 6. Bidirectional Friend Graph Requirement
Only accepted friends can be invited to trips. Non-friends are rejected during trip creation with clear HTTP 400 validation feedback.

---

## 🗄 Database Schemas (MongoDB)

### 1. `User` (`users`)
- `username`: Unique, lowercase, alphanumeric + `_`, 3-20 chars.
- `email`: Unique, lowercase, validated email format.
- `fullName`: Up to 60 characters.
- `passwordHash`: Bcrypt hash (hidden from default queries).
- `preferredCurrency`: Default `'INR'`.
- `avatarUrl`: Profile photo or illustration URL.
- `isActive`: Boolean status flag.

### 2. `FriendRequest` (`friend_requests`)
- `senderId`: ObjectId $\to$ `User`.
- `receiverId`: ObjectId $\to$ `User`.
- `status`: `'PENDING' | 'ACCEPTED' | 'REJECTED'`.
- `respondedAt`: Timestamp of decision.
- Unique Compound Index: `{ senderId: 1, receiverId: 1 }`.

### 3. `Friendship` (`friendships`)
- Canonical bidirectional pairing `{ user1, user2 }` (where `user1 < user2`).
- Unique Compound Index: `{ user1: 1, user2: 1 }`.
- Static helper `Friendship.areFriends(u1, u2)` for $O(1)$ trip invitation checks.

### 4. `Trip` (`trips`)
- `name`: Trip title (e.g. "Goa Escape 2026").
- `destination`: Destination location.
- `startDate` & `endDate`: Date range.
- `currency`: ISO code (e.g. `'INR'`, `'USD'`).
- `ownerId`: ObjectId $\to$ `User` (Creator).
- `members`: Array of `{ userId, role: 'OWNER' | 'MEMBER', joinedAt }`.
- `status`: `'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'`.
- `deletedAt`: Soft deletion timestamp.

### 5. `Expense` (`expenses`)
- `tripId`: ObjectId $\to$ `Trip`.
- `title`: Description (e.g. "Dinner at Fisherman Wharf").
- `amountMinor`: Total amount in paise/cents (integer).
- `currency`: Currency code.
- `category`: `'FOOD' | 'TRAVEL' | 'STAY' | 'ACTIVITIES' | 'ENTERTAINMENT' | 'SHOPPING' | 'OTHER'`.
- `paidById`: ObjectId $\to$ `User`.
- `splitBetween`: Array of `{ userId, shareAmountMinor }`.
- `expenseDate`: Date of expenditure.
- `deletedAt`: Soft deletion timestamp.

---

## 🌐 REST API Documentation

Base URL: `http://localhost:5001/api`

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register new user | `{ fullName, username, email, password }` |
| `POST` | `/api/auth/login` | Login via `@username` or `email` | `{ identifier, password }` |
| `GET` | `/api/auth/me` | Current authenticated profile | *Bearer Token* |

### 2. Friends System (`/api/friends`)
| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `GET` | `/api/friends/search?q=@username` | Search registered users | *Bearer Token* |
| `POST` | `/api/friends/request` | Send friend request | `{ targetUsername: "@rahul123" }` |
| `GET` | `/api/friends/requests` | List incoming & outgoing requests | *Bearer Token* |
| `POST` | `/api/friends/requests/:id/respond` | Accept or reject request | `{ action: "ACCEPT" \| "REJECT" }` |
| `GET` | `/api/friends` | List accepted friends | *Bearer Token* |

### 3. Trip Management (`/api/trips`)
| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/trips` | Create trip (validates friends) | `{ name, destination, startDate, endDate, currency, memberUsernames: [...] }` |
| `GET` | `/api/trips` | List user's trips with balances | *Bearer Token* |
| `GET` | `/api/trips/:tripId` | Get detailed trip summary | *Bearer Token* |
| `PATCH` | `/api/trips/:tripId` | Update trip (Owner only) | `{ name, destination, dates, notes }` |
| `DELETE`| `/api/trips/:tripId` | Soft delete trip (Owner only) | *Bearer Token* |

### 4. Expenses & Dynamic Ledgers (`/api/trips/:tripId/expenses`)
| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/trips/:tripId/expenses` | Add expense with auto-equal split | `{ title, amountMinor, category, paidByUsername, splitBetweenUsernames }` |
| `GET` | `/api/trips/:tripId/expenses` | List expense timeline | *Bearer Token* |
| `DELETE`| `/api/trips/:tripId/expenses/:expenseId` | Soft delete expense | *Bearer Token* |

### 5. Dynamic Calculations & Settlements (`/api/trips/:tripId`)
| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/api/trips/:tripId/balances` | Dynamic member net balances | Member balances (`OWES`, `IS_OWED`, `SETTLED`) |
| `GET` | `/api/trips/:tripId/settlements`| Min-Cash-Flow optimal payments | Reduced $N - 1$ payment recommendations |

---

## 🧮 Settlement & Balance Engine (Algorithms)

### Greedy Minimum Cash Flow (Debt Simplification)
Instead of members paying each other in dozens of redundant transactions:
1. All members are split into **Debtors** ($\text{Net} < 0$) and **Creditors** ($\text{Net} > 0$).
2. Both lists are sorted descending by balance magnitude.
3. The algorithm greedily matches the largest debtor with the largest creditor:
   $$\text{Settlement} = \min(|\text{debt}|, |\text{credit}|)$$
4. The debt and credit are decremented, and matching continues until all balances reach 0.
5. **Guarantee**: At most $N - 1$ payments for $N$ members.
6. **Circular debts** (A $\to$ B $\to$ C $\to$ A) automatically cancel to **0 transactions**.

---

## 📁 Project Directory Structure

```
first project/
├── README.md                      # Comprehensive Master Project Documentation
├── package.json                   # Root scripts & backend dependencies
├── .env                           # Local environment configuration (PORT=5001, MONGO_URI)
│
├── server/                        # Express Backend & Analytical Engines
│   ├── config/
│   │   └── db.js                  # Mongoose connection setup
│   ├── controllers/
│   │   ├── authController.js      # Signup, dual login, profile
│   │   ├── friendController.js    # Search, request, accept, list
│   │   ├── tripController.js      # Trip lifecycle, friend checks
│   │   └── expenseController.js   # Expenses, balances, settlements
│   ├── middleware/
│   │   └── authMiddleware.js      # Bearer token JWT verification
│   ├── models/
│   │   ├── User.js                # User model & bcrypt methods
│   │   ├── FriendRequest.js       # Friend invitation records
│   │   ├── Friendship.js          # Canonical friendship pairs
│   │   ├── Trip.js                # Trips with roles & soft deletes
│   │   └── Expense.js             # Integer minor-unit expense ledger
│   ├── services/
│   │   ├── balanceEngine.js       # Dynamic net balances & remainder allocation
│   │   └── settlementEngine.js    # Greedy Min-Cash-Flow simplification
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth routes
│   │   ├── friendRoutes.js        # /api/friends routes
│   │   └── tripRoutes.js          # /api/trips routes & subroutes
│   ├── tests/
│   │   └── runAllTests.js         # Automated 24-step integration test suite
│   ├── app.js                     # Express application configuration
│   └── server.js                  # Main server entry point
│
├── src/                           # React Native Mobile Application
│   ├── components/                # Reusable UI Components
│   │   ├── common/BrandLogo.jsx
│   │   ├── dashboard/StatWidget.jsx, ActionHeroCard.jsx, DailyThoughtCard.jsx
│   │   ├── navigation/FloatingBottomBar.jsx
│   │   └── trips/TripCard.jsx, StepIndicator.jsx, MemberChip.jsx, TripsEmptyState.jsx
│   ├── config/
│   │   ├── colors.js              # Palette (Obsidian Green, Electric Mint)
│   │   └── theme.js               # Spacing, typography, shadows
│   ├── screens/
│   │   ├── auth/SplashScreen.jsx
│   │   ├── main/HomeScreen.jsx    # Home Dashboard (Preserved)
│   │   └── trips/
│   │       ├── TripsHubScreen.jsx # Trips landing hub
│   │       └── CreateTripScreen.jsx # 3-step creation flow
│   ├── store/
│   │   └── authStore.js           # Zustand global state store
│   └── index.js                   # Central export index
│
└── preview/                       # Interactive HTML/JS Web Simulator
    └── index.html                 # Live interactive prototype (Port 3000)
```

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally (default: `mongodb://localhost:27017`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend API Server
```bash
npm start
# Server boots on http://localhost:5001
```

### 3. Start the Interactive UI Prototype
```bash
python3 -m http.server 3000 --directory preview
# Access prototype at http://localhost:3000
```

---

## 🧪 Running Automated Tests

Run the complete test suite verifying remainder cent allocation, circular debt simplification, multi-person settlements, authentication, and database integrity:

```bash
npm test
```

Expected output:
```
====================================================
  DIVIDE & RULE V1 — AUTOMATED TEST SUITE EXECUTION
====================================================
--- 1. Testing Analytical & Settlement Algorithms ---
✅ PASS: Remainder cent split sum must equal exact 10000 paise
✅ PASS: First share receives remainder cent (3334)
✅ PASS: Circular debt resolves to 0 transactions
✅ PASS: Greedy plan reduces 4-person debt to exactly 3 transactions
...
--- 2. Testing Models, Auth & Friendship Integration ---
✅ PASS: Login succeeds with @username + Password
✅ PASS: Users are now confirmed bidirectional friends
✅ PASS: Rahul is dynamically owed +₹2,000 (+200000 paise)
✅ PASS: Settlement plan: Adarsh -> Rahul for ₹2,000
✅ PASS: Creditor can reject settlement request with status REJECTED
✅ PASS: Settlement request officially transitioned to APPROVED
✅ PASS: Rahul net balance is 0 while split is PENDING approval
✅ PASS: Rahul balance is -₹1,000 (OWES) after accepting split
✅ PASS: Adarsh balance is +₹1,000 (IS_OWED) after Rahul accepts split
====================================================
🎉 ALL TESTS COMPLETED: 42/42 PASSED!
====================================================
```

---

## 🚀 Production Deployment Guide

### Deployment Architecture
The platform is packaged so that a single Node.js container or serverless instance can serve **both the Express REST API and the interactive web client**:
- **API Endpoints**: Mounted at `/api/*` (`/api/auth`, `/api/trips`, `/api/friends`, `/api/dashboard`, etc.)
- **Health Check**: Accessible at `/api/health`
- **Web App / UI**: Served automatically at `/`

### Required Environment Variables
Set these variables in your hosting provider's dashboard (refer to `.env.example`):
```env
PORT=5001
NODE_ENV=production
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/divide_and_rule?retryWrites=true&w=majority
JWT_SECRET=your_production_32_char_secret_key
```

### Option 1: Deploy to Render / Railway / Fly.io (Recommended)
1. Connect your GitHub repository.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add the 4 environment variables above.
5. Your service is live! Visiting `https://your-app.onrender.com` serves the full UI and API with zero configuration.

### Option 2: Deploy to Vercel / Netlify (Decoupled Frontend)
- Host `preview/index.html` on Vercel or Netlify.
- Host the backend `server/` on Render or Railway.
- CORS is pre-configured to accept incoming requests from your custom frontend domain.
