import logging
import re

from bs4 import BeautifulSoup

from .base import BaseCrawler

logger = logging.getLogger(__name__)

FALLBACK_PLANS = [
    # SKT
    {"carrier": "SKT", "plan_name": "5GX 슬림+", "monthly_fee": 37000, "data_gb": 6.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "SKT", "plan_name": "5G 언택트 S", "monthly_fee": 47000, "data_gb": 5.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "SKT", "plan_name": "5GX 레귤러+", "monthly_fee": 59000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    {"carrier": "SKT", "plan_name": "5GX 프라임+", "monthly_fee": 75000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    {"carrier": "SKT", "plan_name": "5GX 프리미엄+", "monthly_fee": 95000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    # KT
    {"carrier": "KT", "plan_name": "5G 슬림", "monthly_fee": 45000, "data_gb": 8.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "KT", "plan_name": "5G 심플", "monthly_fee": 49000, "data_gb": 10.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "KT", "plan_name": "5G 베이직", "monthly_fee": 55000, "data_gb": 110.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "KT", "plan_name": "5G 스페셜", "monthly_fee": 75000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    {"carrier": "KT", "plan_name": "5G 프리미어 슈퍼", "monthly_fee": 100000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    # LGU+
    {"carrier": "LGU+", "plan_name": "5G 라이트+", "monthly_fee": 45000, "data_gb": 4.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "LGU+", "plan_name": "5G 에센셜+", "monthly_fee": 55000, "data_gb": 12.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "LGU+", "plan_name": "5G 스탠다드+", "monthly_fee": 69000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    {"carrier": "LGU+", "plan_name": "5G 프리미엄+", "monthly_fee": 85000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
    # MVNO 알뜰폰
    {"carrier": "MVNO", "plan_name": "알뜰폰 5G 6GB", "monthly_fee": 15000, "data_gb": 6.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "MVNO", "plan_name": "알뜰폰 5G 10GB", "monthly_fee": 20000, "data_gb": 10.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "MVNO", "plan_name": "알뜰폰 5G 30GB", "monthly_fee": 28000, "data_gb": 30.0, "data_unlimited": False, "call_type": "무제한", "source": "fallback"},
    {"carrier": "MVNO", "plan_name": "알뜰폰 5G 무제한", "monthly_fee": 35000, "data_gb": None, "data_unlimited": True, "call_type": "무제한", "source": "fallback"},
]


class TelecomCrawler(BaseCrawler):
    """스마트초이스 + 통신3사 요금제 크롤러"""

    SMARTCHOICE_URL = "https://www.smartchoice.or.kr/s_choice/cms/contents/mobile_plan.do"

    async def crawl(self) -> list[dict]:
        results: list[dict] = []

        # 1. 스마트초이스 시도
        try:
            plans = await self._crawl_smartchoice()
            if plans:
                results.extend(plans)
                logger.info(f"스마트초이스 크롤링 성공: {len(plans)}개")
        except Exception as e:
            logger.warning(f"스마트초이스 실패: {e}")

        # 2. 결과에서 확보된 통신사 확인
        found_carriers = {p["carrier"] for p in results}

        # 3. 빠진 통신사는 개별 사이트 시도
        carrier_crawlers = [
            ("SKT", self._crawl_skt),
            ("KT", self._crawl_kt),
            ("LGU+", self._crawl_lgu),
        ]
        for carrier, fn in carrier_crawlers:
            if carrier not in found_carriers:
                try:
                    plans = await fn()
                    if plans:
                        results.extend(plans)
                        logger.info(f"{carrier} 크롤링 성공: {len(plans)}개")
                except Exception as e:
                    logger.warning(f"{carrier} 크롤링 실패: {e}")

        # 4. 전체 크롤링 결과가 너무 적으면 폴백
        if len(results) < 5:
            logger.warning(f"크롤링 결과 부족({len(results)}개) → 폴백 전체 사용")
            return [dict(p, crawl_error="크롤링 실패 — 기준 데이터 사용") for p in FALLBACK_PLANS]

        # 5. MVNO는 항상 폴백 추가 (비교 사이트 구조 복잡)
        if "MVNO" not in {p["carrier"] for p in results}:
            results.extend(p for p in FALLBACK_PLANS if p["carrier"] == "MVNO")

        return results

    # ──────────────────────────────────────────
    # 스마트초이스
    # ──────────────────────────────────────────
    async def _crawl_smartchoice(self) -> list[dict]:
        html = await self.get_html(self.SMARTCHOICE_URL)
        soup = BeautifulSoup(html, "lxml")
        plans: list[dict] = []

        # 테이블 구조 시도
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows[1:]:
                cols = row.find_all(["td", "th"])
                if len(cols) >= 4:
                    plan = self._parse_sc_row([c.get_text(strip=True) for c in cols])
                    if plan:
                        plans.append(plan)

        # 리스트 구조 시도 (테이블 없을 경우)
        if not plans:
            for el in soup.select(".plan_list li, .planList li, [class*='plan'] li")[:30]:
                plan = self._parse_sc_element(el)
                if plan:
                    plans.append(plan)

        return plans

    def _parse_sc_row(self, cols: list[str]) -> dict | None:
        try:
            carrier = self._normalize_carrier(cols[0])
            if not carrier:
                return None
            plan_name = cols[1][:50]
            fee = self._extract_fee(cols[2])
            if not fee:
                return None
            data_gb, unlimited = self._parse_data(cols[3] if len(cols) > 3 else "")
            return {
                "carrier": carrier,
                "plan_name": plan_name,
                "monthly_fee": fee,
                "data_gb": data_gb,
                "data_unlimited": unlimited,
                "call_type": "무제한",
                "source": "smartchoice",
            }
        except Exception:
            return None

    def _parse_sc_element(self, el) -> dict | None:
        text = el.get_text(" ", strip=True)
        fee = self._extract_fee(text)
        if not fee:
            return None
        carrier = self._normalize_carrier(text) or "통신3사"
        name_el = el.find(["strong", "b", "h4", "h3"]) or el
        plan_name = name_el.get_text(strip=True)[:50]
        data_gb, unlimited = self._parse_data(text)
        return {
            "carrier": carrier,
            "plan_name": plan_name,
            "monthly_fee": fee,
            "data_gb": data_gb,
            "data_unlimited": unlimited,
            "call_type": "무제한",
            "source": "smartchoice",
        }

    # ──────────────────────────────────────────
    # 통신3사 개별 사이트
    # ──────────────────────────────────────────
    async def _crawl_skt(self) -> list[dict]:
        html = await self.get_html("https://www.sktelecom.com/product/mobile/index.html")
        return self._extract_from_html(html, "SKT")

    async def _crawl_kt(self) -> list[dict]:
        html = await self.get_html("https://www.kt.com/product/mobile/list.do")
        return self._extract_from_html(html, "KT")

    async def _crawl_lgu(self) -> list[dict]:
        html = await self.get_html("https://www.lguplus.com/mobile/plan-detail")
        return self._extract_from_html(html, "LGU+")

    def _extract_from_html(self, html: str, carrier: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        # JS 렌더링 사이트는 본문이 거의 비어 있음
        if len(soup.get_text(strip=True)) < 300:
            raise ValueError(f"{carrier} — JS 렌더링 필요, 내용 없음")

        plans: list[dict] = []
        # 요금 금액이 포함된 텍스트 노드 기반으로 파싱
        for text_node in soup.find_all(string=re.compile(r'\d{2,3},?\d{3}\s*원')):
            fee = self._extract_fee(str(text_node))
            if not fee:
                continue
            parent = text_node.parent
            for _ in range(5):
                if parent is None:
                    break
                name_el = parent.find(["h3", "h4", "strong", "b"])
                if name_el:
                    plan_name = name_el.get_text(strip=True)[:60]
                    if len(plan_name) > 3:
                        context = parent.get_text(" ", strip=True)
                        data_gb, unlimited = self._parse_data(context)
                        plans.append({
                            "carrier": carrier,
                            "plan_name": plan_name,
                            "monthly_fee": fee,
                            "data_gb": data_gb,
                            "data_unlimited": unlimited,
                            "call_type": "무제한",
                            "source": "crawled",
                        })
                        break
                parent = parent.parent
        return plans

    # ──────────────────────────────────────────
    # 공통 파싱 유틸
    # ──────────────────────────────────────────
    def _normalize_carrier(self, text: str) -> str | None:
        if not text:
            return None
        t = text.upper()
        if "SKT" in t or "SK텔레콤" in text or "에스케이텔레콤" in text:
            return "SKT"
        if "KT" in t or "케이티" in text:
            return "KT"
        if "LGU" in t or "LG유플러스" in text or "엘지유플" in text:
            return "LGU+"
        if "알뜰" in text or "MVNO" in t:
            return "MVNO"
        return None

    def _extract_fee(self, text: str) -> int | None:
        # "59,000원" 또는 "59000원" 형식
        clean = text.replace(",", "")
        m = re.search(r'(\d{4,6})\s*원', clean)
        if m:
            fee = int(m.group(1))
            if 10_000 <= fee <= 200_000:
                return fee
        return None

    def _parse_data(self, text: str) -> tuple[float | None, bool]:
        if "무제한" in text:
            return None, True
        m = re.search(r'(\d+(?:\.\d+)?)\s*GB', text, re.I)
        if m:
            return float(m.group(1)), False
        return None, False
