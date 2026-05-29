from datetime import date
from itertools import combinations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.crud.expense import get_expense_summary
from app.models.product import Card, TelecomPlan
from app.models.user import User
from app.models.user_card import UserCard
from app.models.user_profile import UserProfile
from app.routers.my_cards import _card_summary
from app.services.benchmark_calculator import _build_index, _calc_combo

router = APIRouter(prefix="/dashboard", tags=["대시보드"])


@router.get("/kpi")
def get_kpi(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    year, month = today.year, today.month

    # ── 1. 이번 달 지출 합산 ────────────────────────────────
    expense_summary = get_expense_summary(db, user_id=current_user.id, year=year, month=month)

    # ── 2. 카드 실적 ────────────────────────────────────────
    user_cards = (
        db.query(UserCard)
        .filter(UserCard.user_id == current_user.id)
        .order_by(UserCard.created_at)
        .all()
    )
    card_perf = []
    total_spent_sum = 0
    total_target_sum = 0
    cards_achieved = 0

    for uc in user_cards:
        s = _card_summary(db, uc, today)
        pct = 0
        if s["performance_target"] and s["performance_target"] > 0:
            pct = min(100, round(s["this_month_spent"] / s["performance_target"] * 100))
            total_target_sum += s["performance_target"]
        total_spent_sum += s["this_month_spent"]
        if s["achieved"]:
            cards_achieved += 1
        card_perf.append({
            "id": s["id"],
            "card_name": s["card_name"],
            "nickname": s["nickname"],
            "spent": s["this_month_spent"],
            "target": s["performance_target"],
            "remaining": s["remaining"],
            "achieved": s["achieved"],
            "pct": pct,
        })

    # ── 3. 예상 절약액 (포트폴리오 기반) ────────────────────
    saving = {"recommended_monthly": 0, "recommended_annual": 0}
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if profile and profile.onboarding_completed:
        cards_db = (
            db.query(Card)
            .filter(Card.is_latest == True)  # noqa: E712
            .options(joinedload(Card.benefits))
            .all()
        )
        index = _build_index(cards_db)
        monthly_spending = profile.card_monthly_total or 0
        best_benefit = 0
        for r in range(1, 4):
            for combo in combinations(index, r):
                benefit = _calc_combo(combo, monthly_spending)
                if benefit > best_benefit:
                    best_benefit = benefit

        plans = (
            db.query(TelecomPlan)
            .filter(TelecomPlan.is_latest == True)  # noqa: E712
            .order_by(TelecomPlan.monthly_fee)
            .all()
        )
        current_fee = profile.telecom_monthly_fee or 0
        telecom_saving = 0
        if plans and current_fee > 0:
            carrier_plans = (
                [p for p in plans if p.carrier == profile.telecom_carrier]
                if profile.telecom_carrier else plans
            )
            current_plan = (
                min(carrier_plans, key=lambda p: abs(p.monthly_fee - current_fee), default=None)
                if carrier_plans else None
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
                best_plan = min(candidates, key=lambda p: p.monthly_fee)
                telecom_saving = current_fee - best_plan.monthly_fee

        total_monthly = best_benefit + telecom_saving
        saving = {
            "recommended_monthly": total_monthly,
            "recommended_annual": total_monthly * 12,
        }

    # ── 4. 약정/렌탈 종료 알림 ──────────────────────────────
    contracts = []
    if profile:
        if profile.contract_end_date:
            days_left = (profile.contract_end_date - today).days
            carrier = profile.telecom_carrier
            contracts.append({
                "type": "telecom",
                "label": f"{carrier} 통신 약정" if carrier else "통신 약정",
                "end_date": profile.contract_end_date.isoformat(),
                "days_left": days_left,
                "urgent": days_left <= 30,
                "carrier": carrier,
                "monthly_fee": profile.telecom_monthly_fee,
            })
        if profile.rental_end_date:
            days_left = (profile.rental_end_date - today).days
            contracts.append({
                "type": "rental",
                "label": "렌탈 계약",
                "end_date": profile.rental_end_date.isoformat(),
                "days_left": days_left,
                "urgent": days_left <= 30,
                "carrier": None,
                "monthly_fee": None,
            })

    return {
        "month": {"year": year, "month": month},
        "expense": {
            "total": int(expense_summary.total),
            "count": expense_summary.count,
        },
        "card_performance": card_perf,
        "card_performance_summary": {
            "total_spent": total_spent_sum,
            "total_target": total_target_sum,
            "cards_achieved": cards_achieved,
            "cards_total": len(user_cards),
        },
        "saving": saving,
        "contracts": contracts,
    }
