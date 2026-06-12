from datetime import datetime
from itertools import combinations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.crud.expense import get_expense_summary
from app.models.product import Card, TelecomPlan
from app.models.saving_benchmark import SavingBenchmark
from app.models.user import User
from app.models.user_profile import UserProfile
from app.services.benchmark_calculator import SPEND_ALLOCATION, _build_index, _calc_combo

router = APIRouter(prefix="/recommendations", tags=["추천"])

# 사용자 카테고리 → CardBenefit.category 매핑
USER_TO_BENEFIT_CATEGORY: dict[str, set[str]] = {
    "식비":     {"마트", "편의점", "편의점/마트", "식비", "생활", "전체"},
    "카페":     {"카페", "카페/베이커리", "커피", "전체"},
    "교통":     {"대중교통", "교통", "교통/주유", "전체"},
    "주유":     {"주유", "교통/주유", "전체"},
    "쇼핑":     {"온라인쇼핑", "온라인", "이커머스", "쇼핑", "일반쇼핑", "백화점", "전체"},
    "의료":     {"의료", "전체"},
    "문화/여가": {"문화", "여가", "전체"},
    "구독":     {"구독", "통신", "전체"},
    "주거/통신": {"통신", "전체"},
    "교육":     {"교육", "전체"},
    "금융":     {"금융", "전체"},
    "기타":     {"전체"},
}

BENEFIT_TYPE_KO = {
    "cashback": "캐시백",
    "point": "적립",
    "discount": "할인",
}


def _calc_card_portfolio(
    card: dict,
    category_spending: dict[str, int],
    total_spending: int,
) -> dict:
    matched_categories = []
    total_benefit = 0.0

    for user_cat, spending in category_spending.items():
        if spending <= 0:
            continue
        valid_benefit_cats = USER_TO_BENEFIT_CATEGORY.get(user_cat, set())

        best_benefit = 0.0
        best_detail: dict | None = None

        for b in card["benefits"]:
            if b["category"] not in valid_benefit_cats:
                continue
            if total_spending < b["condition_amount"]:
                continue  # 전월실적 미달
            raw = spending * b["rate"]
            if b["monthly_max"]:
                raw = min(raw, b["monthly_max"])
            if raw > best_benefit:
                best_benefit = raw
                best_detail = b

        if best_benefit > 0 and best_detail:
            type_ko = BENEFIT_TYPE_KO.get(best_detail["benefit_type"], best_detail["benefit_type"])
            rate_pct = best_detail["rate"] * 100
            reason_parts = [f"{best_detail['category']} {rate_pct:.1f}% {type_ko}"]
            if best_detail["monthly_max"]:
                reason_parts.append(f"월 한도 {int(best_detail['monthly_max']):,}원")

            matched_categories.append({
                "user_category": user_cat,
                "benefit_category": best_detail["category"],
                "benefit_type": best_detail["benefit_type"],
                "rate": best_detail["rate"],
                "monthly_max": best_detail["monthly_max"],
                "user_spending": spending,
                "estimated_benefit": int(best_benefit),
                "reason": ", ".join(reason_parts),
            })
            total_benefit += best_benefit

    net_benefit = total_benefit - (card["annual_fee"] / 12)
    return {
        "card_id": card["id"],
        "name": card["name"],
        "company": card["company"],
        "annual_fee": card["annual_fee"],
        "apply_url": card.get("apply_url"),
        "estimated_monthly_benefit": int(total_benefit),
        "net_monthly_benefit": int(net_benefit),
        "matched_categories": matched_categories,
    }


@router.get("/telecom-estimate")
def telecom_estimate(current_fee: int, db: Session = Depends(get_db)):
    benchmarks = (
        db.query(SavingBenchmark)
        .filter(SavingBenchmark.benchmark_type == "telecom")
        .all()
    )
    if not benchmarks:
        return {"error": "benchmark_not_ready"}

    eligible = [b for b in benchmarks if b.spending_monthly and b.spending_monthly <= current_fee]
    matched = (
        max(eligible, key=lambda b: b.spending_monthly)
        if eligible
        else min(benchmarks, key=lambda b: b.spending_monthly or 0)
    )

    # 결정 카드용: 선택약정 할인 소멸/재약정 시나리오 (계산은 전부 여기서)
    # 가정: 현재 요금이 선택약정 25% 할인 적용가 → 원가 = current_fee / 0.75
    lapse_monthly = round(current_fee / 0.75 / 10) * 10  # 10원 단위 반올림
    lapse_increase_monthly = lapse_monthly - current_fee
    reattach_monthly = current_fee  # 재약정 시 현재 할인가 유지

    return {
        "current_fee": current_fee,
        "saving_monthly": matched.saving_monthly,
        "saving_annual": matched.saving_annual,
        "label": matched.label,
        "lapse_monthly": lapse_monthly,
        "lapse_increase_monthly": lapse_increase_monthly,
        "reattach_monthly": reattach_monthly,
        "assumption": "현재 요금이 선택약정 25% 할인 적용가라고 가정한 추정값이에요",
    }


@router.get("/quick-estimate")
def quick_estimate(amount: int, db: Session = Depends(get_db)):
    card_benchmarks = (
        db.query(SavingBenchmark)
        .filter(SavingBenchmark.benchmark_type == "card")
        .all()
    )
    telecom_benchmarks = (
        db.query(SavingBenchmark)
        .filter(SavingBenchmark.benchmark_type == "telecom")
        .all()
    )

    if not card_benchmarks and not telecom_benchmarks:
        return {
            "error": "benchmark_not_ready",
            "message": "관리자가 벤치마크를 아직 계산하지 않았습니다",
        }

    eligible = [b for b in card_benchmarks if b.spending_monthly and b.spending_monthly <= amount]
    if eligible:
        matched = max(eligible, key=lambda b: b.spending_monthly)
        card_saving = matched.saving_monthly
        matched_bracket = matched.label
    else:
        if card_benchmarks:
            matched = min(card_benchmarks, key=lambda b: b.spending_monthly or 0)
            card_saving = matched.saving_monthly
            matched_bracket = matched.label
        else:
            card_saving = 0
            matched_bracket = "해당 없음"

    telecom_saving = max((b.saving_monthly for b in telecom_benchmarks), default=0)
    total_monthly = card_saving + telecom_saving
    return {
        "input_amount": amount,
        "card_saving_monthly": card_saving,
        "telecom_saving_monthly": telecom_saving,
        "total_saving_monthly": total_monthly,
        "total_saving_annual": total_monthly * 12,
        "matched_bracket": matched_bracket,
    }


@router.get("/portfolio")
def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile or not profile.onboarding_completed:
        raise HTTPException(status_code=422, detail="온보딩을 먼저 완료해주세요.")

    # ── 이번달 실제 지출 조회 ──────────────────────────────
    now = datetime.now()
    summary = get_expense_summary(db, current_user.id, year=now.year, month=now.month)

    if summary.total > 0:
        category_spending = {k: int(v) for k, v in summary.by_category.items()}
        total_monthly = int(summary.total)
        data_quality = "actual"
    else:
        # 냉스타트: SPEND_ALLOCATION 비율로 추정
        base = profile.card_monthly_total or 0
        category_spending = {
            "식비":  int(base * SPEND_ALLOCATION["식비"]),
            "쇼핑":  int(base * (SPEND_ALLOCATION["온라인쇼핑"] + SPEND_ALLOCATION["일반쇼핑"])),
            "교통":  int(base * SPEND_ALLOCATION["교통"]),
            "카페":  int(base * SPEND_ALLOCATION["카페"]),
            "기타":  int(base * SPEND_ALLOCATION["기타"]),
        }
        total_monthly = base
        data_quality = "estimated"

    # ── 카드 목록 + 혜택 조회 ──────────────────────────────
    cards = (
        db.query(Card)
        .filter(Card.is_latest == True)
        .options(joinedload(Card.benefits))
        .all()
    )

    # 카드별 혜택 계산
    card_results = []
    for card in cards:
        card_dict = {
            "id": card.id,
            "name": card.name,
            "company": card.company,
            "annual_fee": card.annual_fee,
            "apply_url": card.apply_url,
            "benefits": [
                {
                    "category": b.category,
                    "benefit_type": b.benefit_type,
                    "rate": b.rate,
                    "condition_amount": b.condition_amount or 0,
                    "monthly_max": b.monthly_max,
                }
                for b in card.benefits
            ],
        }
        result = _calc_card_portfolio(card_dict, category_spending, total_monthly)
        if result["matched_categories"]:
            card_results.append(result)

    card_results.sort(key=lambda x: x["net_monthly_benefit"], reverse=True)
    top_cards = card_results[:5]

    best_monthly = top_cards[0]["estimated_monthly_benefit"] if top_cards else 0
    card_recommendation = {
        "cards": top_cards,
        "monthly_benefit": best_monthly,
        "annual_benefit": best_monthly * 12,
        "data_quality": data_quality,
    }

    # ── 통신 추천 ──────────────────────────────────────────
    plans = (
        db.query(TelecomPlan)
        .filter(TelecomPlan.is_latest == True)
        .order_by(TelecomPlan.monthly_fee)
        .all()
    )

    current_fee = profile.telecom_monthly_fee or 0
    telecom_recommendation = None

    if plans and current_fee > 0:
        carrier_plans = (
            [p for p in plans if p.carrier == profile.telecom_carrier]
            if profile.telecom_carrier
            else plans
        )
        current_plan = (
            min(carrier_plans, key=lambda p: abs(p.monthly_fee - current_fee), default=None)
            if carrier_plans
            else None
        )

        if current_plan and current_plan.data_unlimited:
            candidates = [p for p in plans if p.data_unlimited and p.monthly_fee < current_fee]
        elif current_plan and current_plan.data_gb:
            candidates = [
                p for p in plans
                if not p.data_unlimited
                and p.data_gb
                and p.data_gb >= current_plan.data_gb
                and p.monthly_fee < current_fee
            ]
        else:
            candidates = [p for p in plans if p.monthly_fee < current_fee]

        if candidates:
            recommended = min(candidates, key=lambda p: p.monthly_fee)
            monthly_saving = current_fee - recommended.monthly_fee
            telecom_recommendation = {
                "current_fee": current_fee,
                "recommended_plan": {
                    "carrier": recommended.carrier,
                    "plan_name": recommended.plan_name,
                    "monthly_fee": recommended.monthly_fee,
                },
                "monthly_saving": monthly_saving,
                "annual_saving": monthly_saving * 12,
            }

    telecom_monthly_saving = telecom_recommendation["monthly_saving"] if telecom_recommendation else 0
    total_saving = best_monthly + telecom_monthly_saving

    return {
        "card_recommendation": card_recommendation,
        "telecom_recommendation": telecom_recommendation,
        "total_monthly_saving": total_saving,
        "total_annual_saving": total_saving * 12,
    }
