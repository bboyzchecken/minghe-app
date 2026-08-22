import { LegalDocumentView } from '@/components/legal-document'
import { COOKIES } from '@/lib/legal'

export const metadata = { title: 'นโยบายคุกกี้' }

export default function CookiesPage() {
  return <LegalDocumentView doc={COOKIES} />
}
