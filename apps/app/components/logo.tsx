import Link from 'next/link'

export function Logo({
  withTagline = false,
  className = '',
  tone = 'gold',
}: {
  withTagline?: boolean
  className?: string
  tone?: 'gold' | 'ink'
}) {
  const main = tone === 'gold' ? 'text-gold' : 'text-ink'
  return (
    <Link href="/" className={`group inline-flex items-baseline gap-2.5 ${className}`}>
      <span className={`cjk text-2xl leading-none ${main}`}>命合</span>
      <span className="flex flex-col leading-none">
        <span className={`font-display-en text-2xl font-semibold tracking-wide ${main}`}>Ming&nbsp;He</span>
        {withTagline && (
          <span className="font-script text-base text-terracotta -mt-0.5">สมพงษ์คนกับองค์กร</span>
        )}
      </span>
    </Link>
  )
}
