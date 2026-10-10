import { z } from 'zod'

export const MAX_LOGO_SIZE = 5 * 1024 * 1024

export const MIME_A_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
}

export const businessLogoFileSchema = z
  .instanceof(File)
  .refine((f) => f.type in MIME_A_EXTENSION, 'El logo debe ser una imagen PNG, JPG o WebP')
  .refine((f) => f.size <= MAX_LOGO_SIZE, 'El logo no puede superar los 5 MB')

export const businessLogoSchema = businessLogoFileSchema.nullable()

export const businessSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  logo: businessLogoSchema,
})

export type BusinessSetupValues = {
  nombre: string
  logo: File | null
}
