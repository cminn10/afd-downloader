import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseAlbumId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  
  // Check for album ID in URL (e.g. ifdian.net/album/ID or full URL)
  // Matches /album/ followed by 32 hex characters
  const match = trimmed.match(/album\/([a-f0-9]{32})/i);
  if (match) {
    return match[1];
  }
  
  return trimmed;
}

