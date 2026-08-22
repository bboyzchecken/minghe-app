import { LegalDocumentView } from '@/components/legal-document'
import { REFUND } from '@/lib/legal'

export const metadata = { title: 'นโยบายการคืนเงินและการขอลบบัญชี' }

export default function RefundPage() {
  return <LegalDocumentView doc={REFUND} />
}
