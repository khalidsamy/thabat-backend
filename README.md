# Thabat Quran Backend

## 1. Project Overview
Thabat is a specialized Quran memorization tracking and analytics platform designed to foster consistency and community engagement. This repository contains the RESTful Node.js backend architecture powering the Thabat application. It handles user authentication, continuous progress tracking, automated historical analytics, gamified achievements, and a global leaderboard engine. It is built to be resilient, performant, and secure for production deployment.

## 2. Features
- **User Authentication**: Secure registration and login flow utilizing bcrypt password hashing and JSON Web Tokens (JWT).
- **Progress Tracking**: Sophisticated daily logging mechanism that tracks total pages memorized, daily targets, and automated history ledgers.
- **Streak Engine**: Native continuous habit tracking that automatically validates daily submissions and stores historical maximum consecutive days (longest streak).
- **In-Depth Analytics**: Computes trailing 7-day activity metrics, completion rates, and historical charting data for frontend presentation.
- **Global Leaderboard**: An optimized ranking system calculating explicitly active users based on their longest standing streaks and pages memorized.
- **Achievement System**: Dynamic logic evaluating user thresholds and dispensing unlocked achievements seamlessly without inflating database footprint.

## 3. Tech Stack
- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (managed via Mongoose ODM)
- **Security & Auth**: JSON Web Tokens (JWT), bcrypt, Helmet, Express Rate Limit

## 4. API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate an existing user and retrieve access tokens

### Progress (Protected)
- `GET /api/progress` - Fetch general progress objects
- `POST /api/progress/update` - Log daily progress and trigger automated streak mapping
- `GET /api/progress/today` - Retrieve metrics pertaining strictly to the current day
- `GET /api/progress/stats` - Retrieve overall life-time consistency analytics
- `GET /api/progress/weekly` - Fetch aggregated history spanning a 7-day retrospective window
- `GET /api/progress/chart` - Pull standard, backfilled visual axis data explicitly for charting libraries

### Community & Gamification
- `GET /api/leaderboard` - Fetch the top globally active memorizers (Public)
- `GET /api/achievements` - Dynamically compute progress accomplishments (Protected)

## 5. Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- A running MongoDB cluster (e.g., MongoDB Atlas) or local instance

### Installation
1. Clone the repository.
2. Initialize the terminal within the root directory (`thabat-backend`).
3. Execute `npm install` to load all necessary dependencies.
4. Duplicate the attached `.env.example` file and explicitly rename the copy to `.env`.
5. Execute `npm run dev` for local hot-reloading (via nodemon), or `npm start` for production execution.

## 6. Environment Variables
To securely operate the API, the following variables must be populated inside your `.env` file prior to booting the server:

- `MONGO_URI`: The isolated connection string binding the application to MongoDB.
- `JWT_SECRET`: The cryptographic alphanumeric key used to securely sign and verify authentication tokens.
- `PORT`: Declares the localized network interface port (Execution falls back to 3001 if omitted).
- `CLIENT_URL`: Dictates strict CORS permission rules matching your frontend domain.
- `NODE_ENV`: Define the operative environment state (Setting exactly to `production` boots custom request logging).

## 7. Future Improvements
- Establish role-based access control (RBAC) structure enabling moderation dashboards.
- Refactor token execution incorporating a standard Refresh Token system for indefinite safe persistence.
- Layer the backend with comprehensive integration and component tests utilizing Jest/Supertest.
- Build isolated group models enabling private leaderboard brackets entirely separate from the global rankings.
