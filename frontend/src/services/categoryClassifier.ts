import type { ExpenseCategory } from '../types/expenseImport'

interface ClassificationRule {
  keywords: string[]
  category: ExpenseCategory
}

// 더 구체적인 규칙을 위로 — 순서가 우선순위
const RULES: ClassificationRule[] = [
  {
    keywords: [
      '스타벅스', '이디야', '투썸플레이스', '메가커피', '컴포즈커피', '빽다방', '할리스',
      '폴바셋', '파스쿠찌', '더벤티', '커피빈', '탐앤탐스', '카페베네', '엔제리너스',
      '카페', '커피', '라떼', '아메리카노',
    ],
    category: '카페',
  },
  {
    keywords: [
      'GS칼텍스', 'SK에너지', 'S-OIL', '에쓰오일', '현대오일뱅크', '오일뱅크',
      '주유소', '주유', '셀프주유', 'EV충전', '전기차충전', '테슬라충전',
    ],
    category: '주유',
  },
  {
    keywords: [
      '넷플릭스', 'Netflix', '유튜브프리미엄', 'YouTube Premium', '스포티파이', 'Spotify',
      '왓챠', '웨이브', '디즈니플러스', 'Disney+', 'TVING', '티빙', '시즌', 'Seezn',
      '애플TV', 'Apple TV', 'Apple One', 'iCloud', '구독', '멤버십',
    ],
    category: '구독',
  },
  {
    keywords: [
      '배달의민족', '배민', '쿠팡이츠', '요기요', '맥도날드', '버거킹', '롯데리아',
      '이마트', '홈플러스', '롯데마트', 'GS25', 'CU', '세븐일레븐', 'MINI스톱',
      '편의점', '베이커리', '빵', '치킨', '피자', '라멘', '파스타', '도시락',
      '마트', '슈퍼', '식당', '밥집', '분식', '국밥', '찌개', '고기',
    ],
    category: '식비',
  },
  {
    keywords: [
      '택시', '카카오T', 'KTX', 'SRT', '지하철', 'T-money', '티머니', '버스',
      '주차', '톨', '통행료', '렌터카', '자동차',
    ],
    category: '교통',
  },
  {
    keywords: [
      '쿠팡', '11번가', 'G마켓', '옥션', '무신사', '올리브영', '다이소', '이케아', 'IKEA',
      '신세계', '현대백화점', '롯데백화점', 'H&M', 'ZARA', '자라', '유니클로', '아디다스', '나이키',
    ],
    category: '쇼핑',
  },
  {
    keywords: ['병원', '의원', '약국', '치과', '한의원', '피부과', '내과', '외과', '의료', '건강'],
    category: '의료',
  },
  {
    keywords: ['CGV', '롯데시네마', '메가박스', '게임', '공연', '전시', '영화', '헬스', '스크린', '볼링', 'PC방'],
    category: '문화/여가',
  },
  {
    keywords: ['SKT', 'KT', 'LGU', '통신', '인터넷', '렌탈', '관리비', '전기', '가스', '수도', '월세', '전세', '보험'],
    category: '주거/통신',
  },
  {
    keywords: ['학원', '교육', '학습', '인터넷강의', '도서', '문구', '교재'],
    category: '교육',
  },
  {
    keywords: ['은행', '이체', '보험료', '증권', '투자', '금융', '납부', '수수료', 'ATM'],
    category: '금융',
  },
]

export function classifyCategory(merchant: string): ExpenseCategory {
  if (!merchant.trim()) return '기타'
  const lower = merchant.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return rule.category
    }
  }
  return '기타'
}
