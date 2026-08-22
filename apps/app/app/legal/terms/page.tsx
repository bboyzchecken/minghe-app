import { LegalDocumentView } from '@/components/legal-document'
import { TERMS } from '@/lib/legal'

export const metadata = { title: 'เงื่อนไขการใช้งาน' }

export default function TermsPage() {
  return <LegalDocumentView doc={TERMS} />
}
