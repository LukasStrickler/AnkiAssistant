import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deckToPath(deckFullName: string) {
  return `/deck/${deckFullName.split('::').map(encodeURIComponent).join('/')}`;
}

export function pathToDeck(path: string) {
  return path.split('/').map(decodeURIComponent).join('::');
}
