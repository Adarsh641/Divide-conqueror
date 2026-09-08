# 🌍 Divide & Rule — Complete Engineering & Architecture Chronicle
> **The Definitive Story of How Divide & Rule Was Designed, Built, Tested, and Deployed.**  
> *A complete record of our architectural decisions, financial algorithms, consent systems, and DevOps pipelines.*

---

## 📖 Table of Contents
1. [Vision & Design Philosophy](#1-vision--design-philosophy)
2. [High-Level Architecture (The Unidirectional Data Flow)](#2-high-level-architecture)
3. [The Financial Core: Mathematical Precision](#3-the-financial-core-mathematical-precision)
4. [Algorithm 1: Greedy Min-Cash-Flow Debt Minimization](#4-algorithm-1-greedy-min-cash-flow-debt-minimization)
5. [Feature 1: Two-Party Peer Settlement Verification](#5-feature-1-two-party-peer-settlement-verification)
6. [Feature 2: Consent-Based Expense Split Approval](#6-feature-2-consent-based-expense-split-approval)
7. [Automated Testing Strategy (42/42 Tests)](#7-automated-testing-strategy)
8. [DevOps, Docker, CI/CD & Cloud Deployment](#8-devops-docker-cicd--cloud-deployment)
9. [Mobile App Packaging (Android APK via EAS)](#9-mobile-app-packaging)
10. [Complete File Directory & Component Dictionary](#10-complete-file-directory--component-dictionary)

---

## 1. Vision & Design Philosophy

Traditional expense splitters look like spreadsheets or utility calculators. **Divide & Rule** was engineered to combine:
- **Linear-level craftsmanship**: Keyboard-first speed, deterministic states, zero latency feel.
- **Notion-like modularity**: Clean cards, contextual nested details, intuitive hierarchy.
- **Airbnb-inspired wanderlust**: Deep Obsidian Green (`#051B14`), Electric Mint (`#00E599`), frosted glass cards (`rgba(255, 255, 255, 0.05)`), and travel adventure headers.
- **Apple fluid physics**: Micro-animations, smooth transitions, and tactile feedback.

---

## 2. High-Level Architecture

The entire application adheres to a strict **Backend-First Single Source of Truth**:

$$\text{User Action (UI)} \longrightarrow \text{Express REST API} \longrightarrow \text{MongoDB Atlas} \longrightarrow \text{Dynamic Balance Engine} \longrightarrow \text{UI Refresh}$$

### Core Tenet: Zero Redundant State
Balances, debts, and settlement paths are **never statically saved in database columns**. If debts were stored statically, a single edited or deleted bill would cause data corruption. Instead:
- MongoDB stores **immutable events** (Users, Trips, Expenses, Settlement Requests).
- The **Balance Engine** dynamically calculates balances on-the-fly in milliseconds when requested.

---

## 3. The Financial Core: Mathematical Precision

### 🚫 The Floating-Point Problem (IEEE 754)
In standard JavaScript:
```javascript
0.1 + 0.2 === 0.3 // false (0.30000000000000004)
```
Splitting ₹100.00 among 3 people in standard floats gives `33.333333333333336`. Over 50 expenses, debts drift by rupees.

### ✅ Our Solution: Integer Minor Units (Paise)
Every monetary field (`amountMinor`, `shareMinor`, `netBalanceMinor`) is strictly stored as a **64-bit integer representing paise (₹1 = 100 paise)**.

### Remainder Cent Allocation Algorithm
When splitting an odd amount like ₹100.00 (10,000 paise) among 3 people:
- Base share: $\lfloor 10000 / 3 \rfloor = 3333$ paise
- Remainder: $10000 \pmod 3 = 1$ paisa
- The algorithm distributes the remainder 1 paisa to the first member:
  - Member 1: **3,334 paise** (₹33.34)
  - Member 2: **3,333 paise** (₹33.33)
  - Member 3: **3,333 paise** (₹33.33)
  - **Sum**: $3334 + 3333 + 3333 \equiv 10,000$ paise (**0.00 drift!**).

---

## 4. Algorithm 1: Greedy Min-Cash-Flow Debt Minimization

If 4 friends travel:
- A owes B ₹1,000
- B owes C ₹1,000
- C owes D ₹1,000

Without simplification, this requires **3 separate transactions**. But mathematically, A can just pay D ₹1,000 directly, resolving all 4 debts in **1 single transaction**!

### How Our Engine Works (`server/services/settlementEngine.js`):
1. **Net Balances**: Compute net position for each person: $\text{net} = \text{totalPaid} - \text{totalShare}$.
2. **Partition**: Separate into two heaps:
   - **Debtors** (people who owe money, $\text{net} < 0$).
   - **Creditors** (people who are owed money, $\text{net} > 0$).
3. **Greedy Matching**: In each step, take the person who owes the most and the person who is owed the most:
   $$\text{settledAmount} = \min(|\text{maxDebtor}|, \text{maxCreditor})$$
4. Form direct transaction: $\text{Debtor} \xrightarrow{\text{settledAmount}} \text{Creditor}$.
5. Reduces an $N$-person debt graph to at most $N - 1$ payments. Circular debts simplify to **0 transactions**.

---

## 5. Feature 1: Two-Party Peer Settlement Verification

In traditional apps, anyone can tap "Settle" and erase debt without the other person's knowledge.

### Our Solution: Real-World Consent Flow
1. **Initiation**: Debtor pays via UPI, Cash, or Bank Transfer, and taps **"Record Payment & Request Approval"**.
2. **Pending State**: A `SettlementRequest` document is created with status `'PENDING'`. The debt is **NOT** erased yet.
3. **Debtor View**: Sees `⏳ You marked ₹X as paid to @friend. Awaiting confirmation.`
4. **Creditor View**: Receives a glowing notification banner:
   > *"🔔 Payment Verification Needed: @debtor marked ₹X as paid via UPI (Ref: UPI-12345)."*
5. **Two Choices**:
   - **Confirm Received ✓**: Creates an immutable `Expense` (category `'SETTLEMENT'`), marks request `'APPROVED'`, and the balance engine zeroes out the balance to **₹0 (Settled)**!
   - **Not Received ✕**: Request marked `'REJECTED'`, and the debt stays active.

---

## 6. Feature 2: Consent-Based Expense Split Approval

What if someone adds an expense and bills you for a dinner you never attended?

### Our Solution: Pre-Debt Consent Isolation
1. **Payer Auto-Consent**: When User A creates an expense, User A's own split is marked `'ACCEPTED'`.
2. **Member Isolation**: All other split participants start in `'PENDING'` status.
3. **Balance Isolation**:
   - The pending share is tracked in `pendingShareMinor`.
   - **It is NOT debited from the debtor's active balance**.
   - **It is NOT credited to the payer's active balance**.
   - Upholds the fundamental ledger invariant: $\sum \text{netBalances} \equiv 0$.
4. **Decision**:
   - **Accept Split ✓**: Status becomes `'ACCEPTED'`. The debt officially enters both members' active balances simultaneously.
   - **Decline ✕**: Status becomes `'DECLINED'`. The user is never billed.

---

## 7. Automated Testing Strategy (42/42 Tests)

We wrote a rigorous, end-to-end automated test runner: [`server/tests/runAllTests.js`](file:///Users/adarshgoutam/Desktop/first%20project/server/tests/runAllTests.js).

### Test Coverage Areas:
- **10 Algorithm Tests**: Remainder cent preservation, circular debt elimination, multi-party greedy graph reduction.
- **32 Integration Tests**:
  - User signup and login (Email and @username formats with bcrypt & JWT).
  - Friendship request lifecycle (Send ➔ Accept ➔ Reject ➔ Bidirectional query).
  - Trip creation and membership validation.
  - Expense split creation across multiple participants.
  - Settle-up peer verification transitions (`PENDING` ➔ `REJECTED`, `PENDING` ➔ `APPROVED`).
  - Expense split consent isolation (`PENDING` balance isolation ➔ `ACCEPTED` debt activation).

Run tests locally anytime via:
```bash
npm test
```

---

## 8. DevOps, Docker, CI/CD & Cloud Deployment

### 1. Containerization
- **[`Dockerfile`](file:///Users/adarshgoutam/Desktop/first%20project/Dockerfile)**: Uses `node:22-alpine` for an ultra-lightweight image (~150MB), multi-stage caching, and unprivileged `node` user security.
- **[`.dockerignore`](file:///Users/adarshgoutam/Desktop/first%20project/.dockerignore)**: Prevents `node_modules` and `.env` from baking into images.
- **[`docker-compose.yml`](file:///Users/adarshgoutam/Desktop/first%20project/docker-compose.yml)**: Runs App + MongoDB locally for offline development.

### 2. GitHub Actions CI/CD Pipeline
- **[`.github/workflows/ci-cd.yml`](file:///Users/adarshgoutam/Desktop/first%20project/.github/workflows/ci-cd.yml)**:
  - **Job 1 (Test)**: Automatically spins up an ephemeral `mongo:7.0` container inside GitHub's cloud and runs the 42 tests on every commit.
  - **Job 2 (Docker Hub)**: Authenticates with Docker Hub secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`) and publishes `:latest` and `:<commit-sha>` images.
  - **Job 3 (Vercel)**: Auto-deploys to Vercel upon merging into `main`.

### 3. Vercel Serverless Architecture
- **[`vercel.json`](file:///Users/adarshgoutam/Desktop/first%20project/vercel.json)**: Rewrites `/api/*` to serverless function and `/*` to high-speed CDN static preview.
- **[`api/index.js`](file:///Users/adarshgoutam/Desktop/first%20project/api/index.js)**: Warm-caches MongoDB connections across serverless invocations.

---

## 9. Mobile App Packaging & The Android Cloud Build Odyssey

We chose **Expo Application Services (EAS Build)** to build a 100% free standalone Android `.apk` in the cloud without requiring a local Android Studio / Gradle toolchain or paying Google's $25 Play Store developer fee.

### Mobile Configuration:
- **[`app.json`](file:///Users/adarshgoutam/Desktop/first%20project/app.json)**: Android package identifier (`com.adarsh.divideandrule`), app name (`Divide & Rule`), dark theme splash (`#051B14`), versioning (`1.0.0`), and linked EAS `projectId`.
- **[`eas.json`](file:///Users/adarshgoutam/Desktop/first%20project/eas.json)**: Configured with `"buildType": "apk"` in the `"preview"` profile to produce a standalone `.apk` directly installable on any Android phone.
- **[`App.js`](file:///Users/adarshgoutam/Desktop/first%20project/App.js)**: Root React Native entrypoint binding session checks, navigation, and all 8 screens.

---

### The 4 Cloud Builds & All Errors Overcome:

#### ❌ Build 1 (`7ce0b41e-6dbf-47dc-a07c-9b1da6477e68`)
- **Symptom**: Cloud build failed immediately during project initialization.
- **Root Cause**: `package.json` had `"main": "server/server.js"`, but `server/` was excluded by `.easignore`. Metro bundler couldn't find the entrypoint.
- **Fix Applied**: Updated `package.json` `"main"` to point to `"App.js"`.

#### ❌ Build 2 (`f41ae835-fd7a-45b5-92c8-bddead66c69e`)
- **Symptom**: Failed during `npx expo export:embed` (JavaScript bundling).
- **Root Cause**: The project was missing [`babel.config.js`](file:///Users/adarshgoutam/Desktop/first%20project/babel.config.js). Metro had no instructions to transpile JSX syntax inside `src/`. Also, `app.json` had a dead reference to `./preview/favicon.ico`.
- **Fix Applied**: Created `babel.config.js` with `babel-preset-expo`, removed dead favicon path from `app.json`.

#### ❌ Build 3 (`6a4275fe-8011-468e-a61b-5cadd9b245b8`)
- **Symptom**: Metro bundler failed with:
  `Error: Unable to resolve module react-native-safe-area-context from src/screens/main/HomeScreen.jsx`
- **Root Cause**: Discovered via raw Brotli decompression of EAS worker logs that screens imported `react-native-safe-area-context` (for status bars) and `@react-navigation/native` (for `useFocusEffect`), but neither package was declared in `package.json`.
- **Fix Applied**: Ran `npx expo install react-native-safe-area-context @react-navigation/native` to install pinned, Expo SDK 52-compatible versions (`react-native-safe-area-context@4.12.0`). Verified with `npx expo-doctor` (18/18 checks passed).

#### ✅ Build 4 (`4655f074-b8da-4d78-9dfa-f9a808a13258`) — SUCCESS!
- **Result**: JavaScript bundle compiled with 0 errors. Native C++ / Java compiled across all 4 Android ABIs (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`). Gradle assembled and signed the `.apk`.
- **Artifact**: Direct `.apk` download URL generated and verified.
  - Download Link: `https://expo.dev/artifacts/eas/kPeLXdjYO7HRXUpkqcQU2tUyx1U_EyyUUTP9kTyNT20.apk`

---

## 10. Complete File Directory & Component Dictionary

```
divide-and-rule/
├── App.js                               # Root React Native Entrypoint
├── app.json                             # Mobile App Configuration & Permissions
├── eas.json                             # EAS Android APK & Play Store Build Profiles
├── Dockerfile                           # Multi-Stage Production Docker Build
├── .dockerignore                        # Docker Build Exclusions
├── docker-compose.yml                   # Local Multi-Container Stack (App + MongoDB)
├── vercel.json                          # Vercel Serverless & Static Asset Rewrites
├── DEVOPS_GUIDE.md                      # Universal DevOps Blueprint for Every Project
├── README.md                            # High-Level Project Overview & Documentation
│
├── api/
│   └── index.js                         # Vercel Serverless Bridge to Express
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml                    # Automated GitHub Actions Pipeline
│
├── server/
│   ├── app.js                           # Express App, Middleware, CORS, Static Serving
│   ├── server.js                        # Server Startup & Port Binding (5001)
│   ├── config/
│   │   └── db.js                        # MongoDB Atlas Connection with Pool Config
│   ├── models/
│   │   ├── User.js                      # User Schema, Bcrypt Hashing, Validation
│   │   ├── Friendship.js                # Bidirectional Friendship Records
│   │   ├── FriendRequest.js             # Friend Request State (PENDING, ACCEPTED)
│   │   ├── Trip.js                      # Trip Schema, Members, Dates, Currencies
│   │   ├── Expense.js                   # Ledger Expenses with Integer Minor Units
│   │   └── SettlementRequest.js         # Two-Party Settlement State (UPI, Cash, Bank)
│   ├── controllers/
│   │   ├── authController.js            # Signup, Login, Profile Handlers
│   │   ├── friendController.js          # Search, Request, Accept/Reject Handlers
│   │   ├── tripController.js            # Trip CRUD, Balances, Settlements
│   │   ├── expenseController.js         # Expense Splits, Approvals, Settlements
│   │   └── dashboardController.js       # Aggregated User Financial Analytics
│   ├── services/
│   │   ├── balanceEngine.js             # Dynamic Net Balance Computation
│   │   └── settlementEngine.js          # Greedy Min-Cash-Flow Simplifier
│   └── tests/
│       └── runAllTests.js               # Complete 42/42 Automated Test Runner
│
├── src/
│   ├── config/
│   │   ├── colors.js                    # Obsidian Green & Electric Mint Palette
│   │   └── theme.js                     # Typography, Spacing, Shadows, Border Radii
│   ├── services/
│   │   └── api.js                       # Centralized Mobile Fetch Client (JWT Auth)
│   ├── store/
│   │   ├── authStore.js                 # Session State & AsyncStorage Persistence
│   │   ├── dashboardStore.js            # Dashboard Statistics & Aggregates
│   │   ├── tripStore.js                 # Trips Hub & Creation Actions
│   │   ├── friendStore.js               # Friends List & Search State
│   │   └── expenseStore.js              # Active Trip Expenses, Splits, Settlements
│   ├── components/
│   │   ├── common/                      # BrandLogo, Buttons, Cards
│   │   ├── dashboard/                   # StatWidget, ActionHeroCard, DailyThought
│   │   ├── navigation/                  # FloatingBottomBar
│   │   └── trips/                       # TripCard, MemberChip, StepIndicator
│   └── screens/
│       ├── auth/                        # SplashScreen, LoginScreen, SignupScreen
│       ├── main/                        # HomeScreen
│       ├── trips/                       # TripsHubScreen, CreateTripScreen, TripDetailsScreen
│       └── friends/                     # FriendsScreen
│
└── preview/
    └── index.html                       # Standalone Interactive Web Simulator
```
