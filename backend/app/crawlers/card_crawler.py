import logging
import re

from bs4 import BeautifulSoup

from .base import BaseCrawler

logger = logging.getLogger(__name__)

FALLBACK_CARDS = [
    # ── 신한카드 (4개) ─────────────────────────────────────────────────────
    {
        "name": "신한카드 Deep Dream",
        "company": "신한", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 300000, "monthly_max": 8000},
        ],
    },
    {
        "name": "신한카드 Mr.Life",
        "company": "신한", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "신한카드 S-Line",
        "company": "신한", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "대중교통", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 8000},
        ],
    },
    {
        "name": "신한카드 B.Big",
        "company": "신한", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 12000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
        ],
    },
    # ── KB국민카드 (4개) ───────────────────────────────────────────────────
    {
        "name": "KB국민 알파원카드",
        "company": "KB", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 15000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 10000},
        ],
    },
    {
        "name": "KB국민 노리 2 travelj카드",
        "company": "KB", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "KB국민 위클리 체크카드",
        "company": "KB", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 100000, "monthly_max": 8000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 100000, "monthly_max": 5000},
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 100000, "monthly_max": 8000},
        ],
    },
    {
        "name": "KB국민 청춘대로 톡톡카드",
        "company": "KB", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "음식점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 8000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    # ── 현대카드 (3개) ─────────────────────────────────────────────────────
    {
        "name": "현대카드 ZERO Edition2",
        "company": "현대", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "cashback", "rate": 0.01, "condition_amount": 0, "monthly_max": None, "description": "전 가맹점 1% 캐시백 (조건 없음)"},
        ],
    },
    {
        "name": "현대카드 the Green",
        "company": "현대", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 8000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "대중교통", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "현대카드 M3",
        "company": "현대", "annual_fee": 15000, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "point", "rate": 0.02, "condition_amount": 0, "description": "전 가맹점 2% M포인트"},
            {"category": "온라인쇼핑", "benefit_type": "point", "rate": 0.05, "condition_amount": 300000, "monthly_max": 15000},
        ],
    },
    # ── 삼성카드 (4개) ─────────────────────────────────────────────────────
    {
        "name": "삼성카드 taptap O",
        "company": "삼성", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "대중교통", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "삼성카드 taptap M",
        "company": "삼성", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 15000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 8000},
        ],
    },
    {
        "name": "삼성카드 숫자카드 6",
        "company": "삼성", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.06, "condition_amount": 300000, "monthly_max": 15000, "description": "온라인 6% 특화"},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "삼성카드 iD BLUE",
        "company": "삼성", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "cashback", "rate": 0.007, "condition_amount": 0, "description": "전 가맹점 0.7%"},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    # ── 롯데카드 (3개) ─────────────────────────────────────────────────────
    {
        "name": "롯데카드 LOCA 365",
        "company": "롯데", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 200000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 200000},
            {"category": "대중교통", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 200000},
        ],
    },
    {
        "name": "롯데카드 로카 시그니처",
        "company": "롯데", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "대중교통", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "롯데카드 슬기로운 생활 체크",
        "company": "롯데", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 200000, "monthly_max": 10000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 200000, "monthly_max": 8000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 200000, "monthly_max": 8000},
        ],
    },
    # ── 하나카드 (3개) ─────────────────────────────────────────────────────
    {
        "name": "하나카드 1Q 체크",
        "company": "하나", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 0},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 0},
            {"category": "전체", "benefit_type": "cashback", "rate": 0.005, "condition_amount": 0, "description": "전 가맹점 기본 0.5%"},
        ],
    },
    {
        "name": "하나카드 Viva X",
        "company": "하나", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.07, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 8000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 8000},
            {"category": "대중교통", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
    {
        "name": "하나카드 멀티 체크",
        "company": "하나", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 150000, "monthly_max": 8000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 150000, "monthly_max": 5000},
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 150000, "monthly_max": 8000},
        ],
    },
    # ── 우리카드 (3개) ─────────────────────────────────────────────────────
    {
        "name": "우리카드 카드의 정석 EVERY CHECK",
        "company": "우리", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "cashback", "rate": 0.01, "condition_amount": 200000, "description": "전 가맹점 1%"},
        ],
    },
    {
        "name": "우리카드 카드의 정석 POINT",
        "company": "우리", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "point", "rate": 0.015, "condition_amount": 0, "description": "전 가맹점 1.5% 포인트 (조건 없음)"},
        ],
    },
    {
        "name": "우리카드 WON카드",
        "company": "우리", "annual_fee": 0, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 8000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
            {"category": "마트", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 8000},
        ],
    },
    # ── BC카드 (3개) ───────────────────────────────────────────────────────
    {
        "name": "BC카드 바로 체크",
        "company": "BC", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 150000, "monthly_max": 8000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 150000, "monthly_max": 5000},
            {"category": "마트", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 150000, "monthly_max": 8000},
        ],
    },
    {
        "name": "BC카드 페이북 체크",
        "company": "BC", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 100000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 100000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 100000},
        ],
    },
    {
        "name": "BC카드 빅스마트",
        "company": "BC", "annual_fee": 5000, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 12000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "음식점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 300000, "monthly_max": 8000},
        ],
    },
    # ── 카카오뱅크 (2개) ───────────────────────────────────────────────────
    {
        "name": "카카오뱅크 체크카드",
        "company": "카카오", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "cashback", "rate": 0.002, "condition_amount": 0, "description": "전 가맹점 0.2%"},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 100000, "monthly_max": 3000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 100000, "monthly_max": 2000},
        ],
    },
    {
        "name": "카카오뱅크 프렌즈 체크카드",
        "company": "카카오", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 0, "monthly_max": 3000},
            {"category": "온라인쇼핑", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 0, "monthly_max": 5000},
        ],
    },
    # ── 토스뱅크 (1개) ─────────────────────────────────────────────────────
    {
        "name": "토스뱅크 카드",
        "company": "토스", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "cashback", "rate": 0.015, "condition_amount": 0, "monthly_max": 15000, "description": "전 가맹점 1.5% 무조건 캐시백"},
        ],
    },
    # ── NH농협카드 (2개) ───────────────────────────────────────────────────
    {
        "name": "NH농협 올원페이 체크",
        "company": "NH농협", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 100000, "monthly_max": 5000},
            {"category": "카페", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 100000, "monthly_max": 3000},
            {"category": "마트", "benefit_type": "cashback", "rate": 0.02, "condition_amount": 100000, "monthly_max": 5000},
        ],
    },
    {
        "name": "NH농협 채움 체크카드",
        "company": "NH농협", "annual_fee": 0, "card_type": "debit", "source": "manual",
        "benefits": [
            {"category": "전체", "benefit_type": "cashback", "rate": 0.002, "condition_amount": 0, "description": "전 가맹점 0.2%"},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 200000, "monthly_max": 5000},
            {"category": "주유", "benefit_type": "cashback", "rate": 0.03, "condition_amount": 200000, "monthly_max": 5000},
        ],
    },
    # ── 씨티카드 (1개) ─────────────────────────────────────────────────────
    {
        "name": "씨티 Clear 카드",
        "company": "씨티", "annual_fee": 15000, "card_type": "credit", "source": "manual",
        "benefits": [
            {"category": "주유", "benefit_type": "cashback", "rate": 0.07, "condition_amount": 300000, "monthly_max": 14000, "description": "주유 7% 특화"},
            {"category": "마트", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 10000},
            {"category": "편의점", "benefit_type": "cashback", "rate": 0.05, "condition_amount": 300000, "monthly_max": 5000},
        ],
    },
]


class CardCrawler(BaseCrawler):
    CARDGORILLA_URL = "https://www.cardgorilla.com/cards"

    async def crawl(self) -> list[dict]:
        try:
            result = await self._crawl_cardgorilla()
            if len(result) >= 5:
                logger.info(f"카드고릴라 크롤링 성공: {len(result)}개")
                return result
            raise ValueError(f"파싱 결과 부족: {len(result)}개")
        except Exception as e:
            logger.warning(f"카드고릴라 크롤링 실패 → 검증된 기준 데이터 {len(FALLBACK_CARDS)}개 사용: {e}")
            return [dict(c, crawl_error=str(e)) for c in FALLBACK_CARDS]

    async def _crawl_cardgorilla(self) -> list[dict]:
        html = await self.get_html(self.CARDGORILLA_URL)
        soup = BeautifulSoup(html, "lxml")

        card_items = (
            soup.select(".card_item")
            or soup.select("[class*='card_item']")
            or soup.select("li[class*='card']")
        )

        cards = []
        for item in card_items[:20]:
            try:
                card = self._parse_card_item(item)
                if card:
                    cards.append(card)
            except Exception:
                continue
        return cards

    def _parse_card_item(self, item) -> dict | None:
        text = item.get_text(" ", strip=True)
        name_el = (
            item.select_one(".card_name")
            or item.select_one("[class*='name']")
            or item.select_one("strong")
            or item.select_one("h3")
        )
        if not name_el:
            return None
        name = name_el.get_text(strip=True)[:80]
        if len(name) < 3:
            return None
        return {
            "name": name,
            "company": self._detect_company(name, text),
            "annual_fee": self._extract_annual_fee(text),
            "card_type": "debit" if "체크" in name else "credit",
            "source": "cardgorilla",
            "benefits": self._extract_benefits(text),
        }

    def _detect_company(self, name: str, text: str) -> str:
        for kw, co in [("신한","신한"),("KB","KB"),("국민","KB"),("현대","현대"),
                       ("삼성","삼성"),("롯데","롯데"),("우리","우리"),("하나","하나"),
                       ("BC","BC"),("씨티","씨티"),("카카오","카카오"),("토스","토스"),
                       ("NH","NH농협"),("농협","NH농협")]:
            if kw in name or kw in text[:60]:
                return co
        return "기타"

    def _extract_annual_fee(self, text: str) -> int:
        if any(k in text for k in ["연회비 없음", "연회비무료", "연회비 0원"]):
            return 0
        m = re.search(r'연회비[^\d]*(\d[\d,]*)\s*원', text)
        if m:
            fee = int(m.group(1).replace(",", ""))
            return fee if fee < 500_000 else 0
        return 0

    def _extract_benefits(self, text: str) -> list[dict]:
        patterns = [
            (r'편의점[^\d%]*(\d+(?:\.\d+)?)\s*%', "편의점"),
            (r'카페[^\d%]*(\d+(?:\.\d+)?)\s*%', "카페"),
            (r'마트[^\d%]*(\d+(?:\.\d+)?)\s*%', "마트"),
            (r'주유[^\d%]*(\d+(?:\.\d+)?)\s*%', "주유"),
            (r'(?:온라인|쇼핑)[^\d%]*(\d+(?:\.\d+)?)\s*%', "온라인쇼핑"),
            (r'교통[^\d%]*(\d+(?:\.\d+)?)\s*%', "대중교통"),
            (r'해외[^\d%]*(\d+(?:\.\d+)?)\s*%', "해외"),
            (r'전\s*가맹점[^\d%]*(\d+(?:\.\d+)?)\s*%', "전체"),
        ]
        benefits = []
        for pattern, category in patterns:
            m = re.search(pattern, text)
            if m:
                rate = float(m.group(1)) / 100
                if 0 < rate <= 0.30:
                    benefits.append({"category": category, "benefit_type": "cashback", "rate": rate})
        return benefits
