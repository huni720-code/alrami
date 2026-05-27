from itertools import combinations
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.product import Card, TelecomPlan

SPEND_ALLOCATION = {
    "식비": 0.35,
    "온라인쇼핑": 0.20,
    "일반쇼핑": 0.12,
    "교통": 0.10,
    "카페": 0.08,
    "기타": 0.15,
}

CATEGORY_MATCH: dict[str, set[str]] = {
    "식비":     {"식비", "마트", "편의점", "편의점/마트", "생활", "전체"},
    "온라인쇼핑": {"온라인쇼핑", "온라인", "이커머스", "쇼핑", "전체"},
    "일반쇼핑":  {"일반쇼핑", "쇼핑", "백화점", "아울렛", "전체"},
    "교통":     {"교통", "대중교통", "교통/주유", "주유", "전체"},
    "카페":     {"카페", "카페/베이커리", "커피", "전체"},
    "기타":     {"전체"},
}

SPENDING_BRACKETS = [300_000, 500_000, 700_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000]


def _build_index(cards: list) -> list[dict]:
    """Pre-extract card data to plain dicts for fast iteration."""
    result = []
    for card in cards:
        benefits = []
        for b in card.benefits:
            benefits.append({
                "category": b.category,
                "rate": b.rate,
                "condition_amount": b.condition_amount or 0,
                "monthly_max": b.monthly_max,
            })
        result.append({
            "id": card.id,
            "name": card.name,
            "company": card.company,
            "annual_fee": card.annual_fee,
            "benefits": benefits,
        })
    return result


def _calc_combo(combo: tuple, monthly_spending: int) -> int:
    total_benefit = 0.0
    for cat, alloc in SPEND_ALLOCATION.items():
        cat_spending = monthly_spending * alloc
        valid_db_cats = CATEGORY_MATCH[cat]
        best = 0.0
        for card in combo:
            for b in card["benefits"]:
                if b["category"] not in valid_db_cats:
                    continue
                if monthly_spending < b["condition_amount"]:
                    continue
                raw = cat_spending * b["rate"]
                if b["monthly_max"]:
                    raw = min(raw, b["monthly_max"])
                if raw > best:
                    best = raw
        total_benefit += best
    annual_fees = sum(c["annual_fee"] / 12 for c in combo)
    return int(total_benefit - annual_fees)


def calculate_card_benchmarks(db: Session) -> list[dict[str, Any]]:
    cards = (
        db.query(Card)
        .filter(Card.is_latest == True)
        .options(joinedload(Card.benefits))
        .all()
    )
    index = _build_index(cards)

    results = []
    for spending in SPENDING_BRACKETS:
        best_saving = 0
        best_combo: tuple = ()

        for r in range(1, 4):
            for combo in combinations(index, r):
                saving = _calc_combo(combo, spending)
                if saving > best_saving:
                    best_saving = saving
                    best_combo = combo

        best_cards = [{"name": c["name"], "company": c["company"], "annual_fee": c["annual_fee"]} for c in best_combo]
        results.append({
            "label": f"월 {spending // 10000}만원 지출",
            "benchmark_type": "card",
            "spending_monthly": spending,
            "saving_monthly": max(0, best_saving),
            "saving_annual": max(0, best_saving * 12),
            "best_strategy": {
                "cards": best_cards,
                "card_count": len(best_combo),
            },
        })

    return results


def calculate_telecom_benchmarks(db: Session) -> list[dict[str, Any]]:
    plans = (
        db.query(TelecomPlan)
        .filter(TelecomPlan.is_latest == True)
        .order_by(TelecomPlan.monthly_fee)
        .all()
    )
    if not plans:
        return []

    MAJOR = {"SKT", "KT", "LGU+"}
    results = []

    def _tier(tier_plans: list) -> dict | None:
        if not tier_plans:
            return None
        cheapest = min(tier_plans, key=lambda p: p.monthly_fee)
        major = [p for p in tier_plans if p.carrier in MAJOR]
        if not major:
            return None
        avg_major = sum(p.monthly_fee for p in major) / len(major)
        saving = int(avg_major - cheapest.monthly_fee)
        return cheapest, int(avg_major), saving

    # 무제한
    unlimited = [p for p in plans if p.data_unlimited]
    t = _tier(unlimited)
    if t:
        cheapest, avg_major, saving = t
        results.append({
            "label": "무제한 요금제",
            "benchmark_type": "telecom",
            "spending_monthly": avg_major,
            "saving_monthly": max(0, saving),
            "saving_annual": max(0, saving * 12),
            "best_strategy": {
                "best_plan": {"name": cheapest.plan_name, "carrier": cheapest.carrier, "fee": cheapest.monthly_fee},
                "comparison": f"3사 무제한 평균 {avg_major:,}원",
            },
        })

    # 15~35GB
    mid = [p for p in plans if p.data_gb and 15 <= p.data_gb <= 35 and not p.data_unlimited]
    t = _tier(mid)
    if t:
        cheapest, avg_major, saving = t
        results.append({
            "label": "중간 용량 (15~35GB)",
            "benchmark_type": "telecom",
            "spending_monthly": avg_major,
            "saving_monthly": max(0, saving),
            "saving_annual": max(0, saving * 12),
            "best_strategy": {
                "best_plan": {"name": cheapest.plan_name, "carrier": cheapest.carrier, "fee": cheapest.monthly_fee},
                "comparison": f"3사 동급 평균 {avg_major:,}원",
            },
        })

    # 3~15GB
    low = [p for p in plans if p.data_gb and 3 <= p.data_gb < 15 and not p.data_unlimited]
    t = _tier(low)
    if t:
        cheapest, avg_major, saving = t
        results.append({
            "label": "소용량 (3~15GB)",
            "benchmark_type": "telecom",
            "spending_monthly": avg_major,
            "saving_monthly": max(0, saving),
            "saving_annual": max(0, saving * 12),
            "best_strategy": {
                "best_plan": {"name": cheapest.plan_name, "carrier": cheapest.carrier, "fee": cheapest.monthly_fee},
                "comparison": f"3사 동급 평균 {avg_major:,}원",
            },
        })

    return results
