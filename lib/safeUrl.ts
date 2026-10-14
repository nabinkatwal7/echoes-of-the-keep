/** Image links people paste (portraits, scene backdrops) must be plain https links to an image file. Empty is allowed and means none. */
export function safeImageUrl(input: string): boolean {
  if (!input) return true;
  if (input.length > 500) return false;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password && /\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
