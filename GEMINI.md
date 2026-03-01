# Helerix OA

## Project Overview
Helerix OA is a full-stack Next.js web application functioning as an AI Studio app. It appears to be an Office Automation (OA) or educational management system with integrated AI features. The frontend is built with React, Tailwind CSS, and various UI components, while the backend uses Next.js API routes with a `better-sqlite3` database. 

Key features include:
- **User Management**: Authentication, profiles, and user lists.
- **Certificates**: Managing and viewing certificates.
- **Scheduling**: Calendar and event management.
- **AI Integration**: AI Exam Analysis and AI Critic functionalities.
- **System Settings**: Configuration for AI providers and prompts.

## Architecture
- **Framework**: Next.js (App Router with Client Components for the main app).
- **Frontend**: React, Tailwind CSS, Recharts.
- **Backend**: Next.js API Routes (`app/api/`).
- **Database**: SQLite (`better-sqlite3`).
- **State Management**: React Hooks (`useState`, `useEffect`, Context API for Toasts).
- **Testing**: Vitest with React Testing Library.

## Building and Running

**Prerequisites**: Node.js and npm.

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
3.  **Development Server**:
    Run the app locally with HTTPS support:
    ```bash
    npm run dev
    ```
4.  **Build for Production**:
    ```bash
    npm run build
    npm start
    ```
5.  **Testing**:
    Run the Vitest test suite:
    ```bash
    npm test
    ```
    Run tests with coverage:
    ```bash
    npm run test:coverage
    ```
    Run tests in single-run mode:
    ```bash
    npm run test:run
    ```
6.  **Linting**:
    ```bash
    npm run lint
    ```

## Development Conventions
-   **Client Components**: The main application logic resides in client components (`'use client'`), often dynamically imported to avoid SSR issues. The entry point `app/page.tsx` dynamically imports `App.tsx`.
-   **Database Interactions**: The `db.ts` file acts as a client-side wrapper around the Next.js API routes, managing data fetching and updates for Users, Certificates, Exam Analyses, Critic Sessions, Prompts, Events, and AI Providers.
-   **Styling**: Tailwind CSS is used extensively for responsive and custom styling.
-   **Testing**: Unit and component tests are located in the `tests/` directory and use Vitest. Ensure new features are tested following the existing patterns.
