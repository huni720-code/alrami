"""
약정 D-day 알림톡 검증 스크립트.
DB 없이 send_kakao_alimtalk 직접 호출 → [KAKAO-DEV] 로그 확인.
실행: python scripts/verify_contract_notify.py  (backend/ 디렉터리에서)
"""
import asyncio
import logging
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

from app.services.notification import send_kakao_alimtalk
from app.core.config import settings


def fmt_date(d: date) -> str:
    return d.strftime("%Y년 %m월 %d일")


today = date.today()

TEST_CASES = [
    {
        "delta": 90,
        "category": "휴대폰",
        "provider": "SKT",
        "end_date": fmt_date(today + timedelta(days=90)),
    },
    {
        "delta": 30,
        "category": "인터넷",
        "provider": "KT",
        "end_date": fmt_date(today + timedelta(days=30)),
    },
    {
        "delta": 7,
        "category": "정수기",
        "provider": "코웨이",
        "end_date": fmt_date(today + timedelta(days=7)),
    },
]

print(f"\n=== 알림톡 템플릿 코드: {settings.KAKAO_CONTRACT_TEMPLATE_CODE} ===")
print(f"=== 서비스 URL: {settings.SERVICE_URL} ===\n")

for tc in TEST_CASES:
    variables = {
        "username": "홍길동",
        "category": tc["category"],
        "provider": tc["provider"],
        "end_date": tc["end_date"],
        "dday": str(tc["delta"]),
        "link": f"{settings.SERVICE_URL}/contracts/onboarding",
    }
    print(f"[D-{tc['delta']}] {tc['provider']} {tc['category']} → 발송 시도")
    asyncio.run(
        send_kakao_alimtalk("010-0000-0000", settings.KAKAO_CONTRACT_TEMPLATE_CODE, variables)
    )

print("\n=== 검증 완료 ===")
print("위 [KAKAO-DEV] 줄에 template= 과 vars= 가 모두 찍히면 정상.")
