export function buildAssetUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null
  const limpio = logoPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/')
  return `panda-asset://asset/${limpio}`
}