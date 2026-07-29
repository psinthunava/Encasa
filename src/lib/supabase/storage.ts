import 'server-only'
import { randomUUID } from 'crypto'
import { createAdminClient } from './admin'

// First real use of Supabase Storage in this app. Uses the service-role
// client (bypasses auth policies) rather than RLS, consistent with this
// app's pattern of enforcing all authorization in the application layer
// (see Architecture doc section 4 / Decision Log D8) -- callers must have
// already passed requireMember()/requireAdmin() before reaching these
// functions.

const BUCKET = 'bill-attachments'
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
])

export class BillAttachmentError extends Error {}

// Cheap pre-flight check, safe to call before any DB write so a bad file
// (wrong type / too large) fails fast without leaving a half-created Bill.
export function assertValidAttachmentFile(file: File) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new BillAttachmentError(`"${file.name}" must be a JPEG, PNG, HEIC, or PDF file.`)
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new BillAttachmentError(`"${file.name}" must be smaller than 10MB.`)
  }
}

async function ensureBillAttachmentsBucket() {
  const admin = createAdminClient()
  const { data: existing } = await admin.storage.getBucket(BUCKET)
  if (existing) return
  const { error } = await admin.storage.createBucket(BUCKET, { public: false })
  // Ignore a race where another request created it first between the get/create calls.
  if (error && !/already exists/i.test(error.message)) {
    throw new BillAttachmentError(`Could not create storage bucket: ${error.message}`)
  }
}

export async function uploadBillAttachment(householdId: string, billId: string, file: File) {
  assertValidAttachmentFile(file)

  await ensureBillAttachmentsBucket()

  const storagePath = `${householdId}/${billId}/${randomUUID()}-${file.name}`
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
  })
  if (error) {
    throw new BillAttachmentError(`Could not upload attachment: ${error.message}`)
  }

  return storagePath
}

export async function getSignedAttachmentUrl(storagePath: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function removeAttachmentFile(storagePath: string) {
  const admin = createAdminClient()
  await admin.storage.from(BUCKET).remove([storagePath])
}
