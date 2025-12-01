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

3. (Optional) Configure environment variables:
Create a `.env` file in the web directory (see [Configuration](#configuration))

4. Run the development server:
```bash
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

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

## Configuration

The application includes built-in API protection with rate limiting and security headers. You can customize these settings using environment variables.

### Environment Variables

Create a `.env` file in the web directory with the following variables:

```bash
# Rate Limiting - Info Endpoint
# Number of requests allowed per minute for the /api/info endpoint
RATE_LIMIT_INFO_RPM=20

# Rate Limiting - Download Endpoint
# Number of requests allowed per minute for the /api/download endpoint
RATE_LIMIT_DOWNLOAD_RPM=3

# CORS Configuration
# Allowed origins for API access. Supports:
# - Wildcard: * (allows all)
# - Single domain: example.com (allows example.com and *.example.com)
# - Multiple domains: example.com,another.com
ALLOWED_ORIGINS=*
```

### Security Features

- **Rate Limiting**: IP-based rate limiting prevents abuse
  - Info endpoint: 20 requests per minute (configurable)
  - Download endpoint: 3 requests per minute (configurable)
- **CORS Protection**: Dynamic origin checking
  - Supports exact domain matching
  - Supports wildcard subdomains (e.g., `*.example.com`)
  - Automatically allows direct IP access (useful for development/testing)
- **Security Headers**: Standard web security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **Input Validation**: Validates all inputs to prevent injection attacks
- **Request Size Limits**: Prevents oversized payloads

All API responses include rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: When the rate limit resets

## API Endpoints

### `POST /api/info`

Fetches album metadata (title and author).

**Rate Limit:** 20 requests per minute per IP (configurable)

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
  "author_name": "Author Name",
  "post_count": 100,
  "has_unlock_all": true
}
```

### `GET /api/download`

Streams the album content as a downloadable text file.

**Rate Limit:** 3 requests per minute per IP (configurable)

**Query Parameters:**
- `album_id`: The album ID
- `auth_token`: Your authentication token
- `toc_format`: Format for chapter headers (`markdown` or `chapter_number`)
- `progress`: Set to `true` for SSE progress updates

## Building for Production

```bash
bun run build
bun start
```

## Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t afd-downloader .

# Run the container with environment variables
docker run -p 3000:3000 \
  -e RATE_LIMIT_INFO_RPM=20 \
  -e RATE_LIMIT_DOWNLOAD_RPM=3 \
  -e ALLOWED_ORIGINS=* \
  afd-downloader
```

Or using docker-compose:

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - RATE_LIMIT_INFO_RPM=20
      - RATE_LIMIT_DOWNLOAD_RPM=3
      - ALLOWED_ORIGINS=*
```

### GitHub Actions Deployment

The included GitHub Actions workflow automatically builds and deploys to your VM. To configure API protection:

1. Go to your repository Settings → Secrets and variables → Actions
2. Add the following optional secrets (defaults will be used if not set):
   - `RATE_LIMIT_INFO_RPM` (default: 20)
   - `RATE_LIMIT_DOWNLOAD_RPM` (default: 3)
   - `ALLOWED_ORIGINS` (default: *)
3. The workflow will automatically pass these to the container on deployment

The workflow uses default values if secrets are not configured, so your existing deployment will continue working without changes.

## License

Same as the parent project.
