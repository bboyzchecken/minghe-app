'use client'

/**
 * Sign in with Google ฝั่งเบราว์เซอร์ (F-02)
 *
 * บทบาทของไฟล์นี้จบแค่ "ขอ ID token จาก Google" เท่านั้น
 * การตรวจ token, การผูกบัญชี และการออก session เป็นงานของ Go API ทั้งหมด
 * (ตัดสินไว้ใน F-02: auth อยู่ที่ Go ที่เดียว · client secret ไม่เคยมาถึงหน้าเว็บ)
 *
 * client id ไม่ได้ฝังตอน build แต่มาจาก `/mode` ตอน runtime — ได้ credential มาเมื่อไร
 * ตั้งใน .env แล้วรีสตาร์ตแค่ API พอ ไม่ต้อง build หน้าเว็บใหม่
 */

const SCRIPT_ID = 'google-identity-services'
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    cancel_on_tap_outside?: boolean
    ux_mode?: 'popup' | 'redirect'
  }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
  prompt(listener?: (notification: PromptNotification) => void): void
  cancel(): void
}

interface PromptNotification {
  isNotDisplayed(): boolean
  isSkippedMoment(): boolean
  getNotDisplayedReason?(): string
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

let scriptPromise: Promise<GoogleAccountsId> | null = null

/** โหลดสคริปต์ของ Google ครั้งเดียวต่อหน้า แล้ว cache ผลไว้ */
function loadGoogleScript(): Promise<GoogleAccountsId> {
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const ready = () => {
      const api = window.google?.accounts?.id
      if (api) resolve(api)
      else reject(new Error('โหลดระบบเข้าสู่ระบบของ Google ไม่สำเร็จ'))
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (window.google?.accounts?.id) ready()
      else existing.addEventListener('load', ready, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = ready
    script.onerror = () => reject(new Error('โหลดระบบเข้าสู่ระบบของ Google ไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ต'))
    document.head.appendChild(script)
  }).catch((error: Error) => {
    // โหลดพลาดแล้วต้องลองใหม่ได้ ไม่ใช่ค้างที่ promise ที่ reject ไปแล้วตลอดกาล
    scriptPromise = null
    throw error
  })

  return scriptPromise
}

/**
 * เปิดหน้าต่างเลือกบัญชีของ Google แล้วคืน ID token
 *
 * ใช้ปุ่มที่ Google เรนเดอร์เองในกล่องซ่อน แล้วสั่งคลิกแทนการใช้ One Tap
 * เพราะ One Tap ถูกบล็อกได้ง่ายจากการตั้งค่าคุกกี้ของเบราว์เซอร์ ทำให้กดปุ่มแล้วเงียบไปเฉย ๆ
 */
export async function requestGoogleIdToken(clientId: string): Promise<string> {
  const api = await loadGoogleScript()

  return new Promise<string>((resolve, reject) => {
    let settled = false
    const host = document.createElement('div')
    host.style.position = 'fixed'
    host.style.opacity = '0'
    host.style.pointerEvents = 'none'
    host.style.zIndex = '-1'
    document.body.appendChild(host)

    const cleanup = () => {
      host.remove()
    }

    api.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      callback: (response) => {
        settled = true
        cleanup()
        if (response.credential) resolve(response.credential)
        else reject(new Error('ไม่ได้รับข้อมูลยืนยันตัวตนจาก Google'))
      },
    })

    api.renderButton(host, { type: 'standard', size: 'large' })

    // ปุ่มที่ Google เรนเดอร์อยู่ใน iframe — คลิกที่ตัว container จะถูกส่งต่อเข้าไปเอง
    const button = host.querySelector<HTMLElement>('div[role="button"]') ?? host.firstElementChild
    if (!(button instanceof HTMLElement)) {
      cleanup()
      reject(new Error('เปิดหน้าต่างเข้าสู่ระบบของ Google ไม่สำเร็จ'))
      return
    }
    button.click()

    // ผู้ใช้ปิดหน้าต่างทิ้งเอง — เก็บกวาดไม่ให้ค้างเป็น element ซ่อนอยู่ในหน้า
    window.addEventListener(
      'focus',
      () => {
        window.setTimeout(() => {
          if (!settled) cleanup()
        }, 1000)
      },
      { once: true },
    )
  })
}

/** token จำลองของโหมดสาธิต — ฝั่ง mock-client รู้จักรูปแบบนี้ */
export function mockGoogleToken(email: string): string {
  return `mock-google:${email}`
}
