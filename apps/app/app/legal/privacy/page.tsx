import { LegalDocumentView } from '@/components/legal-document'
import { PRIVACY } from '@/lib/legal'

export const metadata = { title: 'นโยบายความเป็นส่วนตัว' }

export default function PrivacyPage() {
  return <LegalDocumentView doc={PRIVACY} />
}
