export function buildAssetUrl(
  logoPath: string | null | undefined,
  version?: string | null,
): string | null {
  if (!logoPath) return null
  const limpio = logoPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/')
  const base = `panda-asset://asset/${limpio}`
  return version ? `${base}?v=${encodeURIComponent(version)}` : base
}