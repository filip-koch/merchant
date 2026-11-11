# Merchant POS

A simple, lightweight, mobile-first Point of Sale (POS) application built for small sellers, market stalls, and pop-up merchants. It runs straight in the browser and lets you manage products, build a cart, and generate instant bank transfer QR codes (SPAYD / QR Platba).

---

> [!WARNING]
> ### Unfinished Project & Work in Progress
> This project is currently **very incomplete, experimental, and under development**. Many features are still being tested or built out, and breaking changes may occur at any time. It is **not** intended to be used as production financial software without thorough review and testing.

---

## Features

- **Mobile-First POS**: Fast interface designed for phones and tablets.
- **Instant QR Payments**: Generates standard Czech & Slovak bank QR codes (SPAYD format with CBA "QR Platba" layout).
- **Product & Cart Management**: Quickly add items, adjust quantities, and calculate totals.
- **Offline & Local Storage**: Products and configuration are saved directly in your browser using IndexedDB.
- **Backup & Restore**: Export and import your shop settings and product catalog as JSON files.
- **PWA Ready**: Can be installed to your home screen for quick offline access.

---

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) (v18 or newer recommended) installed on your machine.

### Installation

1. Clone or download this repository:
   ```bash
   git clone <repo-url>
   cd merchant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open the displayed URL (usually `http://localhost:5173`) in your browser.

### Available Scripts

- `npm run dev` – Starts the local development server.
- `npm run build` – Bundles the app for production.
- `npm run preview` – Serves the production build locally.
- `npm run lint` – Runs ESLint code quality checks.
- `npm run test` – Runs unit tests.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Storage**: Browser IndexedDB with local fallback
- **QR Engine**: Built-in SVG SPAYD payment generator

---

## Disclaimer & No Liability

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.**

This software is an unfinished experimental hobby/prototype project. The author(s) and contributor(s):
- Make no representations or warranties regarding accuracy, reliability, security, or financial compliance.
- Are **not responsible or liable** for any direct, indirect, incidental, or consequential damages, including but not limited to financial losses, incorrect payment details, misdirected bank transfers, lost profits, or data loss arising from the use or inability to use this software.
- **Always test first**: Send a small trial payment (e.g. 1 CZK) and verify it lands in your bank account before using the QR payment feature in a live selling environment.
- Always verify all bank account numbers, IBANs, amounts, and payment references manually before accepting or making transactions.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
