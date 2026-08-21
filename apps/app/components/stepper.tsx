import type { ElementKey } from '@/lib/brand'
import { ElementIcon } from './element-icon'

export interface StepDef {
  label: string
  element: ElementKey
}

export function Stepper({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <ol className="flex items-center">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  active
                    ? 'border-gold bg-gold/10'
                    : done
                      ? 'border-jade bg-jade/10'
                      : 'border-line bg-cloud'
                }`}
              >
                {done ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B8B57" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <ElementIcon element={s.element} size={18} color={active ? undefined : '#B8B0A0'} />
                )}
              </div>
              <span
                className={`hidden max-w-[7rem] text-[11px] leading-tight sm:block ${
                  active ? 'font-medium text-ink' : 'text-muted'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${done ? 'bg-jade/50' : 'bg-line'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
