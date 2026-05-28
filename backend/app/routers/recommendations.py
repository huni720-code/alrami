from itertools import combinations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.product import Card, TelecomPlan
from app.models.saving_benchmark import SavingBenchmark
from app.models.user import User
from app.models.user_profile import UserProfile
from app.services.benchmark_calculator import _build_index, _calc_combo

router = APIRouter(prefix="/recommendations", tags=["추천"])


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

    # 카드: amount 이하 spending_monthly 중 가장 큰 구간
    eligible = [b for b in card_benchmarks if b.spending_monthly and b.spending_monthly <= amount]
    if eligible:
        matched = max(eligible, key=lambda b: b.spending_monthly)
        card_saving = matched.saving_monthly
        matched_bracket = matched.label
    else:
        # amount가 최솟값 구간보다 작으면 가장 작은 구간 사용
        if card_benchmarks:
            matched = min(card_benchmarks, key=lambda b: b.spending_monthly or 0)
            card_saving = matched.saving_monthly
            matched_bracket = matched.label
        else:
            card_saving = 0
            matched_bracket = "해당 없음"

    # 통신: 전체 telecom 벤치마크 중 saving_monthly 최댓값
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

    # ── 카드 추천 ──────────────────────────────────────────
    cards = (
        db.query(Card)
        .filter(Card.is_latest == True)
        .options(joinedload(Card.benefits))
        .all()
    )
    index = _build_index(cards)
    monthly_spending = profile.card_monthly_total or 0

    best_benefit = 0
    best_combo: tuple = ()
    for r in range(1, 4):
        for combo in combinations(index, r):
            benefit = _calc_combo(combo, monthly_spending)
            if benefit > best_benefit:
                best_benefit = benefit
                best_combo = combo

    card_cards = [
        {"name": c["name"], "company": c["company"], "annual_fee": c["annual_fee"]}
        for c in best_combo
    ]
    card_recommendation = {
        "cards": card_cards,
        "monthly_benefit": max(0, best_benefit),
        "annual_benefit": max(0, best_benefit * 12),
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
        # 사용자 현재 요금제와 가장 가까운 플랜으로 무제한 여부 판단
        carrier_plans = [p for p in plans if p.carrier == profile.telecom_carrier] if profile.telecom_carrier else plans
        current_plan = min(carrier_plans, key=lambda p: abs(p.monthly_fee - current_fee), default=None) if carrier_plans else None

        if current_plan and current_plan.data_unlimited:
            candidates = [p for p in plans if p.data_unlimited and p.monthly_fee < current_fee]
        elif current_plan and current_plan.data_gb:
            candidates = [p for p in plans if not p.data_unlimited and p.data_gb and p.data_gb >= current_plan.data_gb and p.monthly_fee < current_fee]
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
    total_monthly = card_recommendation["monthly_benefit"] + telecom_monthly_saving

    return {
        "card_recommendation": card_recommendation,
        "telecom_recommendation": telecom_recommendation,
        "total_monthly_saving": total_monthly,
        "total_annual_saving": total_monthly * 12,
    }
