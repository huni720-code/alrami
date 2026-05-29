/**
 * AI 파싱 서비스
 *
 * 현재: 정규식 기반 mock 파서
 *
 * AI API로 교체하는 방법:
 *   parseLine() 함수 내부를 아래처럼 교체하면 됩니다.
 *
 *   const res = await fetch('/api/ai/parse-line', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ line }),
 *   })
 *   return (await res.json()) as ParsedExpense | null
 *
 *   또는 Claude API:
 *   client.messages.create({ model: 'claude-sonnet-4-6', ... })
 *   → 날짜/가맹점/금액/카테고리 JSON 추출
 */

import type { ExpenseCategory, ImportParseResult, ParsedExpense } from '../types/expenseImport'

// ── 카테고리 자동 분류 ─────────────────────────────────────────
const CATEGORY_MAP: Array<[string[], ExpenseCategory]> = [
  [
    [
      '스타벅스', '맥도날드', '버거킹', '롯데리아', '이마트', '홈플러스', '롯데마트',
      '편의점', 'GS25', 'CU', '세븐일레븐', 'MINI스톱', '배달의민족', '쿠팡이츠',
      '요기요', '배민', '카페', '식당', '커피', '빵', '베이커리', '치킨', '피자',
      '라멘', '파스타', '도시락', '마트', '슈퍼',
    ],
    '식비',
  ],
  [
    [
      '택시', '카카오T', 'KTX', 'SRT', '지하철', 'T-money', '버스', '주유',
      'GS칼텍스', 'SK에너지', 'S-OIL', '현대오일', '자동차', '주차', '톨',
    ],
    '교통',
  ],
  [
    [
      '쿠팡', '11번가', 'G마켓', '옥션', '무신사', '올리브영', '다이소', '이케아',
      'IKEA', '신세계', '현대백화점', '롯데백화점', 'H&M', 'ZARA', '유니클로',
      '아디다스', '나이키',
    ],
    '쇼핑',
  ],
  [['병원', '의원', '약국', '치과', '한의원', '피부과', '내과', '외과', '의료', '건강'], '의료'],
  [
    [
      'CGV', '롯데시네마', '메가박스', '넷플릭스', '유튜브', '스포티파이',
      '게임', '공연', '전시', '영화', '헬스', '스크린', '볼링',
    ],
    '문화/여가',
  ],
  [
    [
      'SKT', 'KT', 'LGU', '통신', '인터넷', '렌탈', '관리비', '전기', '가스',
      '수도', '월세', '전세', '보험',
    ],
    '주거/통신',
  ],
  [['학원', '교육', '학습', '인터넷강의', '책', '도서', '문구'], '교육'],
  [['은행', '이체', '보험료', '증권', '투자', '금융', '납부', '수수료'], '금융'],
]

function guessCategory(merchant: string): ExpenseCategory {
  const lower = merchant.toLowerCase()
  for (const [keywords, cat] of CATEGORY_MAP) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return cat
  }
  return '기타'
}

// ── 날짜 추출 ─────────────────────────────────────────────────
function extractDate(line: string): string {
  const today = new Date()
  const y = today.getFullYear()

  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  let m = line.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  // YY-MM-DD / YY.MM.DD
  m = line.match(/(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m) return `20${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  // MM/DD or MM-DD (앞의 숫자가 월 범위일 때만)
  m = line.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
  if (m) {
    const mo = parseInt(m[1])
    const d = parseInt(m[2])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // N월 N일
  m = line.match(/(\d{1,2})월\s*(\d{1,2})일/)
  if (m) return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`

  return today.toISOString().slice(0, 10)
}

// ── 금액 추출 ─────────────────────────────────────────────────
function extractAmount(line: string): number | null {
  const patterns = [
    /₩\s*([\d,]+)/,
    /[-－]\s*([\d,]+)\s*원/,
    /([\d,]+)\s*원/,
  ]
  for (const p of patterns) {
    const m = line.match(p)
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10)
      if (!isNaN(n) && n > 0 && n < 100_000_000) return n
    }
  }
  // 탭·공백 구분 숫자 (은행 내역 포맷)
  for (const part of line.split(/\s+/).reverse()) {
    const clean = part.replace(/[,원₩\-－]/g, '')
    const n = parseInt(clean, 10)
    if (!isNaN(n) && n >= 100 && n < 100_000_000) return n
  }
  return null
}

// ── 카드사 추출 ───────────────────────────────────────────────
const CARD_COMPANIES = [
  '신한카드', 'KB국민카드', '삼성카드', '현대카드', '롯데카드',
  '하나카드', '우리카드', 'BC카드', '씨티카드', '농협카드',
]

function extractCardCompany(line: string): string | null {
  for (const c of CARD_COMPANIES) {
    if (line.includes(c)) return c
  }
  const m = line.match(/\[([^\]]*카드[^\]]*)\]/)
  if (m) return m[1]
  return null
}

// ── 가맹점 추출 ───────────────────────────────────────────────
function extractMerchant(line: string, amount: number): string {
  let s = line
  s = s.replace(/\[.*?\]/g, ' ')                          // [신한카드] 제거
  s = s.replace(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/, ' ') // 날짜 제거
  s = s.replace(/\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2}/, ' ')
  s = s.replace(/\d{1,2}월\s*\d{1,2}일/, ' ')
  s = s.replace(/\b\d{1,2}[\/\-]\d{1,2}\b/, ' ')
  s = s.replace(/₩\s*[\d,]+/, ' ')                        // 금액 제거
  s = s.replace(/[-－]?\s*[\d,]+\s*원/, ' ')
  s = s.replace(new RegExp(String(amount).replace(/(\d)(?=(\d{3})+$)/g, '$1,?'), 'g'), ' ')
  s = s.replace(/승인|이용|결제|일시불|할부|취소|잔여한도|고객님|님\b|카드\b/g, ' ')
  s = s.replace(/\b\d{4}\b/g, ' ')                        // 카드번호 끝 4자리 제거
  s = s.replace(/\s+/g, ' ').trim()

  const words = s.split(/\s+/).filter((w) => w.length >= 2 && /[가-힣a-zA-Z]/.test(w))
  return words[0] ?? (s.slice(0, 20).trim() || '미확인 가맹점')
}

// ── 핵심 파싱 함수 (AI API 교체 지점) ────────────────────────
//
// 이 함수의 내부를 AI API 호출로 교체하면 파싱 품질이 향상됩니다.
// 반환 타입(ParsedExpense | null)은 유지해야 합니다.
//
export function parseLine(line: string): ParsedExpense | null {
  const trimmed = line.trim()
  if (trimmed.length < 4) return null

  const amount = extractAmount(trimmed)
  if (!amount) return null

  const date = extractDate(trimmed)
  const card_company = extractCardCompany(trimmed)
  const merchant = extractMerchant(trimmed, amount)
  const category = guessCategory(merchant)
  const description = card_company ? `${card_company} ${merchant}` : merchant

  return {
    id: Math.random().toString(36).slice(2, 9),
    date,
    card_company,
    merchant,
    amount,
    category,
    description,
    raw_line: trimmed,
  }
}

// ── 여러 줄 한꺼번에 파싱 ────────────────────────────────────
export function parseText(rawText: string): ImportParseResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const items: ParsedExpense[] = []
  const failed_lines: string[] = []

  for (const line of lines) {
    const parsed = parseLine(line)
    if (parsed) {
      items.push(parsed)
    } else {
      failed_lines.push(line)
    }
  }

  return { items, failed_lines }
}
