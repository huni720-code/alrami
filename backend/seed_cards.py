"""One-time script: clear old cards and insert the updated 35-card fallback data."""
import asyncio
import sys
from datetime import datetime

sys.path.insert(0, ".")

from app.core.database import SessionLocal
from app.crawlers.card_crawler import CardCrawler
from app.models.product import Card, CardBenefit


async def main():
    crawler = CardCrawler()
    results = await crawler.crawl()

    valid = [r for r in results if "error" not in r]
    print(f"크롤러 결과: {len(valid)}개 카드")

    db = SessionLocal()
    try:
        data_month = datetime.now().strftime("%Y-%m")

        # 기존 카드 전체 비활성화 (월 무관)
        deactivated = db.query(Card).filter(Card.is_active == True).update({"is_active": False})
        print(f"기존 카드 {deactivated}개 비활성화")

        saved = 0
        for item in valid:
            card = Card(
                name=item.get("name", ""),
                company=item.get("company", ""),
                annual_fee=item.get("annual_fee", 0),
                card_type=item.get("card_type", "credit"),
                data_month=data_month,
                is_active=True,
            )
            db.add(card)
            db.flush()
            for b in item.get("benefits", []):
                db.add(CardBenefit(
                    card_id=card.id,
                    category=b.get("category", ""),
                    benefit_type=b.get("benefit_type", "cashback"),
                    rate=b.get("rate", 0.0),
                    condition_amount=b.get("condition_amount", 0),
                    monthly_max=b.get("monthly_max"),
                    description=b.get("description"),
                ))
            saved += 1

        db.commit()
        print(f"[OK] {saved}개 카드 저장 완료 (기준월: {data_month})")
    except Exception as e:
        db.rollback()
        print(f"[ERR] 오류: {e}")
        raise
    finally:
        db.close()


asyncio.run(main())
