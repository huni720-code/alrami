import re
from datetime import datetime, timezone
from typing import Optional


# 카드사별 패턴 정의
# 각 패턴은 named group: company, amount, last4(optional), merchant(optional)
_PATTERNS = [
    # [신한카드] 12,000원 승인 홍길동(1234) 스타벅스
    (
        r"\[(?P<company>신한카드)\].*?(?P<amount>[\d,]+)원\s*승인.*?\((?P<last4>\d{4})\)\s*(?P<merchant>\S+)",
        "신한카드",
    ),
    # [KB국민카드] 승인 35,000원 일시불 올리브영 0000카드(1234)
    (
        r"\[(?P<company>KB국민카드)\].*?(?P<amount>[\d,]+)원.*?(?P<merchant>\S+)\s+\S*카드\((?P<last4>\d{4})\)",
        "KB국민카드",
    ),
    # [삼성카드] 1234 15,500원 승인 (편의점GS25)
    (
        r"\[(?P<company>삼성카드)\]\s*(?P<last4>\d{4})\s+(?P<amount>[\d,]+)원\s*승인\s*[（(](?P<merchant>[^)）]+)[)）]",
        "삼성카드",
    ),
    # [현대카드] 홍길동 7,200원 이용 버거킹
    (
        r"\[(?P<company>현대카드)\]\s*\S+\s+(?P<amount>[\d,]+)원\s*이용\s*(?P<merchant>\S+)",
        "현대카드",
    ),
    # [롯데카드] 승인 홍길동 23,000원 이마트 1234
    (
        r"\[(?P<company>롯데카드)\]\s*승인\s*\S+\s+(?P<amount>[\d,]+)원\s*(?P<merchant>\S+)\s+(?P<last4>\d{4})",
        "롯데카드",
    ),
    # [하나카드] (1234) 8,900원 승인 올리브영
    (
        r"\[(?P<company>하나카드)\]\s*\((?P<last4>\d{4})\)\s*(?P<amount>[\d,]+)원\s*승인\s*(?P<merchant>\S+)",
        "하나카드",
    ),
    # [우리카드] 1234승인 5,600원 GS편의점
    (
        r"\[(?P<company>우리카드)\]\s*(?P<last4>\d{4})승인\s*(?P<amount>[\d,]+)원\s*(?P<merchant>\S+)",
        "우리카드",
    ),
    # [BC카드] 홍길동님 12,000원 승인(1234)
    (
        r"\[(?P<company>BC카드)\]\s*\S+님\s+(?P<amount>[\d,]+)원\s*승인\((?P<last4>\d{4})\)",
        "BC카드",
    ),
]

# 컴파일
_COMPILED = [(re.compile(p, re.DOTALL), company) for p, company in _PATTERNS]


def _parse_amount(raw: str) -> Optional[int]:
    try:
        return int(raw.replace(",", ""))
    except (ValueError, AttributeError):
        return None


def parse_card_sms(raw_sms: str) -> Optional[dict]:
    for pattern, company in _COMPILED:
        m = pattern.search(raw_sms)
        if not m:
            continue

        groups = m.groupdict()
        amount = _parse_amount(groups.get("amount"))
        if amount is None:
            continue

        last4 = groups.get("last4")
        merchant = groups.get("merchant")
        if merchant:
            # 가맹점명에서 후행 특수문자 제거
            merchant = re.sub(r"[^\w가-힣]+$", "", merchant).strip() or None

        return {
            "card_company": company,
            "last_4_digits": last4 if last4 else None,
            "amount": amount,
            "merchant": merchant,
            "transaction_at": datetime.now(timezone.utc),
        }

    return None
