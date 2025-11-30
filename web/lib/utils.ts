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

export function parseAuthToken(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // Try to match auth_token in cookie string
  // Matches auth_token= followed by value until semicolon or end of string
  const match = trimmed.match(/auth_token=([^;]+)/);
  if (match) {
    return match[1];
  }

  return trimmed;
}

