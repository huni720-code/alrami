import { Smartphone, Wifi, Tv, Droplets } from 'lucide-react'

// 약정 watchdog 공용 상수 — ContractGrid / InlineContractAdd / Dashboard 공유 (중복 정의 금지)

export type Category = '휴대폰' | '인터넷' | 'TV' | '정수기'

export const FOUR_CATS: Category[] = ['휴대폰', '인터넷', 'TV', '정수기']

export const CAT_META: { cat: Category; Icon: typeof Smartphone; providerLabel: string }[] = [
  { cat: '휴대폰', Icon: Smartphone, providerLabel: '통신사' },
  { cat: '인터넷', Icon: Wifi,       providerLabel: '통신사' },
  { cat: 'TV',     Icon: Tv,         providerLabel: '통신사' },
  { cat: '정수기', Icon: Droplets,   providerLabel: '렌탈사' },
]

export const PROVIDERS: Record<Category, string[]> = {
  휴대폰: ['SKT', 'KT', 'LG U+', '알뜰폰'],
  인터넷: ['SKT', 'KT', 'LG U+'],
  TV:    ['SKT', 'KT', 'LG U+'],
  정수기: ['코웨이', '청호나이스', 'LG전자', 'SK매직', '쿠쿠', '기타'],
}

export const TERM_MONTHS = [12, 24, 36] as const
export type TermOpt = typeof TERM_MONTHS[number]
