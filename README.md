# Tenku — Cloud Storage + Sharing

[tenku.xyz](https://tenku.xyz)

A full-stack cloud storage web app built with Next.js. Users can create accounts, organize files in folders, upload any file type, preview PDFs and media in the browser, and share public links.

## Features

- User registration and login (email + password)
- Nested folder management
- Drag-and-drop file upload (all file types)
- Public sharing via unique links for files and folders
- In-browser previews: PDF, images, text, video, audio
- Local disk storage (configurable path)

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, NextAuth.js
- **Database:** SQLite via Prisma
- **Storage:** Local filesystem (`./storage`)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set a secure `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`).

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Session encryption secret | (required) |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `STORAGE_PATH` | Upload directory | `./storage` |
| `MAX_UPLOAD_SIZE_MB` | Max file size in MB | `100` |

## Usage

1. **Register** at `/register` or **sign in** at `/login`
2. Open the **dashboard** to manage files
3. Create folders, upload files via drag-and-drop
4. Use the **Share settings** menu on any file or folder to make it public
5. Copy the share link and send it to anyone — no account required to view

## Project Structure

```
src/
├── app/              # Pages and API routes
├── components/       # UI components (file explorer, preview, upload)
├── lib/              # Auth, database, storage helpers
└── types/            # TypeScript types
prisma/               # Database schema and migrations
storage/              # Uploaded files (gitignored)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx prisma studio` | Open database GUI |

## License

MIT
