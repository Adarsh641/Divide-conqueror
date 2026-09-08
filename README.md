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
10. [Production Deployment Guide](#-production-deployment-guide)
11. [Consent-Based Expense Split & Settlement Engine](#-consent-based-expense-split--settlement-engine)
12. [Android Native Mobile App & EAS Build Pipeline](#-android-native-mobile-app--eas-build-pipeline)
13. [Engineering Chronicle: Problems Faced, Root Causes & Fixes](#-engineering-chronicle-problems-faced-root-causes--fixes)
14. [Mobile App Releases & Installation Guide](#-mobile-app-releases--installation-guide)

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

---

## 🤝 Consent-Based Expense Split & Settlement Engine

### 1. Consent-Based Split Approval Flow
Traditional bill-splitting apps burden users with debts unilaterally without their confirmation. **Divide & Rule** implements a consent-driven protocol:
- **Payer Auto-Consent**: When a user creates an expense, their own share is automatically marked as `'ACCEPTED'`.
- **Peer Debt Isolation**: All other invited members have their split placed in `'PENDING'` status.
- **Strict Invariant Guarantee**: As long as a member's split remains `'PENDING'`, **their active net balance remains unaffected (0 paise change)**, and the amount is isolated in `pendingShareMinor`. The payer is also not credited for unconfirmed shares, strictly preserving the core ledger invariant:
  $$\sum_{u} \text{Net Balance}_u \equiv 0$$
- **Peer Decision**:
  - **Accept Split (`[Accept Split ✓]`)**: Transitions split to `'ACCEPTED'`, commits the debt to the active balance ledger, and re-computes optimal settlement paths in real time.
  - **Decline Split (`[Decline ✕]`)**: Transitions split to `'DECLINED'`. The user is never billed for that expense.

### 2. Two-Party Peer Settlement Verification
- Debtor submits a payment claim selecting their payment method (`UPI`, `CASH`, or `BANK_TRANSFER`), entering reference notes and timestamps.
- The request transitions to `'PENDING_APPROVAL'`.
- The creditor receives an actionable alert and can verify receipt with **Approve ✓** (which applies the credit) or **Reject ✕** with feedback.

---

## 📱 Android Native Mobile App & EAS Build Pipeline

Divide & Rule features a production-ready mobile app built with React Native and Expo SDK 52.

### Cloud Build Architecture (Expo Application Services - EAS)
- **Standalone Android APK**: Compiled directly into a standalone `.apk` using EAS Build cloud workers. Does not require a paid Google Play Developer account.
- **EAS Profile (`preview`)**: Configured in `eas.json` with `"buildType": "apk"` for instant side-loading on any Android device.
- **Entrypoint Architecture**: Standardized on `index.js` invoking Expo's `registerRootComponent(App)` and `AppRegistry.registerComponent('main', () => App)` for native bridge binding.

---

## 🛠 Engineering Chronicle: Problems Faced, Root Causes & Fixes

During the end-to-end development, integration, and Android native compilation of Divide & Rule, the following technical challenges were encountered and resolved:

### 1. Dependency Version Mismatches & Expo Doctor Failure
- **Symptom**: `npx expo-doctor` reported check failures with exit code 1; build failed to initiate.
- **Root Cause**: NPM installed mismatched native package versions (`react-native@0.76.6` instead of `0.76.9`, `@react-native-async-storage/async-storage@2.2.0` instead of `1.23.1`, and `react-native-svg@15.15.5` instead of `15.8.0`).
- **Resolution**: Ran `npx expo install --check` and pinned exact SDK 52 compatible dependency versions in `package.json`. Verified with 18/18 passing checks in `expo-doctor`.

### 2. Metro Bundler Babel / JSX Syntax Parsing Errors
- **Symptom**: Cloud Gradle task `:app:bundleReleaseJsAndAssets` threw syntax errors parsing JSX constructs inside React Native components.
- **Root Cause**: The project lacked a root `babel.config.js`, causing Metro bundler to default to standard JavaScript parsing rather than JSX / React Native transformations.
- **Resolution**: Created `babel.config.js` with `presets: ['babel-preset-expo']`.

### 3. Android Startup Crash ("Divide & Rule keeps stopping")
- **Symptom**: The APK installed cleanly on Android phones, but crashed immediately upon tapping the app icon with the system dialog: *"Divide & Rule keeps stopping"*.
- **Root Causes**:
  1. **Missing Root Component Registration**: Android's `MainActivity.kt` asks the React Native bridge for a component named `"main"`. In `App.js`, the component was exported as a standard default export without calling `registerRootComponent(App)` or `AppRegistry.registerComponent('main', () => App)`. The native runtime found an empty app registry and immediately aborted.
  2. **Missing `SafeAreaProvider` Context**: Modern React Native `SafeAreaView` threw an unhandled exception (`No safe area value available`) because the root component tree was not wrapped with `<SafeAreaProvider>`.
  3. **React Navigation Context**: Screens used `@react-navigation/native` hooks (`useFocusEffect`) outside of a `<NavigationContainer>`, throwing unhandled context exceptions.
- **Resolution**:
  - Created standard `index.js` calling `registerRootComponent(App)`.
  - Added `AppRegistry.registerComponent('main', () => App)` to `App.js` and set `"main": "index.js"` in `package.json`.
  - Wrapped root in `<SafeAreaProvider>`.
  - Replaced navigation hooks with native React `useEffect` hooks across `HomeScreen.jsx`, `TripsHubScreen.jsx`, `TripDetailsScreen.jsx`, and `FriendsScreen.jsx`.
  - Added a resilient `<ErrorBoundary>` fallback screen with an instant "Try Again" recovery action.

### 4. Android Cleartext HTTP Network Security Policy ("Network error" on Login/Signup)
- **Symptom**: The app opened smoothly, but attempting to log in or create an account threw: `⚠️ Network error` / `⚠️ Network request failed`.
- **Root Causes**:
  1. **Android OS Cleartext HTTP Block**: Starting with Android 9 (API 28+), Android OS strictly disables cleartext (unencrypted HTTP) traffic by default. When the app attempted to reach the laptop backend at `http://192.168.1.11:5001/api/auth/login`, Android's `NetworkSecurityPolicy` immediately dropped the socket connection.
  2. **Fixed Hardcoded IP without in-app configuration**: If the phone was on mobile data, or on a different Wi-Fi network, or if the laptop's IP changed, the hardcoded address became unreachable.
- **Resolution**:
  - Installed `expo-build-properties` plugin and configured `android: { usesCleartextTraffic: true }` in `app.json`.
  - Created `ServerConfigModal.jsx` with a **`⚙️ Server`** button in the header of both Login and Signup screens.
  - Added an in-app **"Test Connection"** feature that checks `/api/health` in real time and provides instant feedback.
  - Allowed users to edit and save any custom IP, localtunnel, ngrok, or cloud URL directly inside the app, persisting changes to `AsyncStorage`.

### 5. Expo Configuration Schema Validation Error
- **Symptom**: Adding `usesCleartextTraffic: true` directly under the `android` object in `app.json` caused `expo-doctor` to fail schema validation.
- **Root Cause**: In Expo SDK 52, native Android manifest properties are managed through config plugins rather than top-level JSON keys.
- **Resolution**: Installed `expo-build-properties` and configured `usesCleartextTraffic` inside the `plugins` array. Passed 18/18 `expo-doctor` checks.

---

## 📲 Mobile App Releases & Installation Guide

### Build Release Matrix

| Build | ID | Status | Key Milestone | Artifact |
|---|---|---|---|---|
| **Build 5** | `4655f074` | FINISHED | Initial EAS Android APK | `.apk` (v1.0.0) |
| **Build 6** | `4ae5d47b` | FINISHED | Root component registration & ErrorBoundary fix | `.apk` (v1.0.0) |
| **Build 7** | `0a1fbf79` | **FINISHED** | **Cleartext HTTP enabled (`usesCleartextTraffic: true`) & in-app Server Settings (`⚙️ Server`)** | [Download APK](https://expo.dev/artifacts/eas/k78Iv5MM8OoBHaVc14HGOKUgZz-iUWSoF4MKSHu8qyE.apk) |

### Latest Stable Release (Build 7)
- **Direct APK Download**: [Download Divide & Rule APK (Build 7)](https://expo.dev/artifacts/eas/k78Iv5MM8OoBHaVc14HGOKUgZz-iUWSoF4MKSHu8qyE.apk)
- **Expo Build Dashboard**: [View on Expo](https://expo.dev/accounts/adarsh76777/projects/divide-and-rule/builds/0a1fbf79-9a66-47c6-87c3-a106276f074d)

### How to Install and Run on Android:
1. **Uninstall any previous version** of Divide & Rule from your device.
2. Open the link above in Chrome on your phone to download `k78Iv5MM8OoBHaVc14HGOKUgZz-iUWSoF4MKSHu8qyE.apk`.
3. Tap **Install** (allow "Install unknown apps" if prompted).
4. Make sure your phone is connected to the **same Wi-Fi network** as your laptop.
5. Launch the app:
   - Tap **`⚙️ Server`** in the top right corner.
   - Tap **"Test Connection"** to verify connection to `http://192.168.1.11:5001/api`.
   - Tap **"Save & Apply"**, then log in or sign up!
