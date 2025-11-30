# Afdian Album Downloader - Web App

A modern Next.js web application for downloading album posts from Afdian in text format.

## Features

- 🎨 Beautiful, modern UI with dark mode support
- 🔍 Preview album metadata before downloading
- ⚡ Streaming downloads for large albums (no timeout issues)
- 📱 Responsive design
- 🚀 Built with Next.js 15 and React 19

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
bun install
```

3. Run the development server:
```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Enter Album ID**: Input the Afdian album ID you want to download
2. **Enter Auth Token**: Provide your authentication token from Afdian
3. **Fetch Info**: Click the "Fetch Album Info" button to preview the album title and author
4. **Download**: Click the download button to save the album content as a text file

## How to Get Your Auth Token

1. Log in to [Afdian](https://afdian.net)
2. Open your browser's Developer Tools (F12)
3. Go to the Application/Storage tab
4. Navigate to Cookies → https://afdian.net
5. Find the `auth_token` cookie and copy its value

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Runtime**: Bun
- **UI**: React 19

## API Endpoints

### `POST /api/info`

Fetches album metadata (title and author).

**Request Body:**
```json
{
  "album_id": "your-album-id",
  "auth_token": "your-auth-token"
}
```

**Response:**
```json
{
  "album_title": "Album Title",
  "author_name": "Author Name"
}
```

### `GET /api/download`

Streams the album content as a downloadable text file.

**Query Parameters:**
- `album_id`: The album ID
- `auth_token`: Your authentication token

## Building for Production

```bash
bun run build
bun start
```

## License

Same as the parent project.
