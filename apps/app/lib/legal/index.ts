import { COOKIES } from './cookies'
import { PRIVACY } from './privacy'
import { REFUND } from './refund'
import { TERMS } from './terms'
import type { LegalDoc } from './types'

export * from './types'

/** เอกสารทั้งสี่ฉบับที่ GB Prime Pay ขอ (F-01) — เรียงตามลำดับที่ควรอ่าน */
export const LEGAL_DOCS: LegalDoc[] = [TERMS, PRIVACY, REFUND, COOKIES]

export const LEGAL_BY_SLUG: Record<LegalDoc['slug'], LegalDoc> = {
  terms: TERMS,
  privacy: PRIVACY,
  refund: REFUND,
  cookies: COOKIES,
}

export { TERMS, PRIVACY, REFUND, COOKIES }
