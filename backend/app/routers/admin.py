from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import extract, or_
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.deps import get_current_user
from app.crawlers.card_crawler import CardCrawler
from app.crawlers.telecom_crawler import TelecomCrawler
from sqlalchemy import func as sa_func

from app.models.admin_log import AdminLog
from app.models.alarm import Alarm
from app.models.contract import Contract
from app.models.contract_switch_log import ContractSwitchLog
from app.models.crawl_task import CrawlTask
from app.models.expense import Expense
from app.models.product import Card, CardBenefit, TelecomPlan
from app.models.saving_benchmark import SavingBenchmark
from app.models.market_benchmark import MarketBenchmark
from app.models.user import User
from app.services.benchmark_calculator import calculate_card_benchmarks, calculate_telecom_benchmarks

router = APIRouter(prefix="/admin", tags=["관리자"])

CRAWLER_MAP = {"cards": CardCrawler, "telecom": TelecomCrawler}


class UserUpdateBody(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class BenchmarkItem(BaseModel):
    benchmark_type: str
    label: str
    spending_monthly: Optional[int] = None
    saving_monthly: int
    saving_annual: int
    best_strategy: Optional[dict] = None


class BenchmarkSaveBody(BaseModel):
    items: List[BenchmarkItem]


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user


def _log(
    db: Session,
    action: str,
    by: int,
    *,
    target_type: str = None,
    target_id: int = None,
    detail: dict = None,
):
    db.add(AdminLog(
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        performed_by=by,
    ))


async def _run_crawl(task_id: int, target: str) -> None:
    db = SessionLocal()
    task = None
    try:
        task = db.query(CrawlTask).filter(CrawlTask.id == task_id).first()
        if not task:
            return
        task.status = "running"
        db.commit()
        crawler = CRAWLER_MAP[target]()
        result = await crawler.crawl()
        task.status = "completed"
        task.result_json = result
        task.record_count = len([r for r in result if "error" not in r])
        task.completed_at = datetime.now(timezone.utc)
    except Exception as e:
        if task:
            task.status = "failed"
            task.error_message = str(e)[:500]
            task.completed_at = datetime.now(timezone.utc)
    finally:
        db.commit()
        db.close()


# ── KPI 통계 ─────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    from datetime import date as date_type
    now = datetime.now(timezone.utc)
    today = now.date()
    week_ago = now - timedelta(days=7)
    thirty_days_later = today + timedelta(days=30)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    contracts_expiring = db.query(Contract).filter(
        Contract.is_active == True,
        Contract.end_date >= today,
        Contract.end_date <= thirty_days_later,
    ).count()

    switches_total = db.query(ContractSwitchLog).filter(ContractSwitchLog.switched == True).count()
    savings_raw = db.query(sa_func.sum(ContractSwitchLog.estimated_saving_annual)).filter(
        ContractSwitchLog.switched == True
    ).scalar()

    return {
        "users_total": db.query(User).count(),
        "users_new_7d": db.query(User).filter(User.created_at >= week_ago).count(),
        "contracts_active": db.query(Contract).filter(Contract.is_active == True).count(),
        "contracts_expiring_30d": contracts_expiring,
        "alarms_active": db.query(Alarm).filter(Alarm.is_active == True).count(),
        "switches_total": switches_total,
        "switches_saving_annual": int(savings_raw or 0),
        "logs_today": db.query(AdminLog).filter(AdminLog.created_at >= today_start).count(),
    }


# ── 사용자 관리 ───────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    search: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(User)
    if search:
        q = q.filter(
            or_(User.email.ilike(f"%{search}%"), User.username.ilike(f"%{search}%"))
        )
    users = q.order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "expense_count": len(u.expenses),
            "alarm_count": len(u.alarms),
        }
        for u in users
    ]


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdateBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="자신의 계정은 수정할 수 없습니다.")

    if body.is_active is not None:
        target.is_active = body.is_active
        _log(
            db,
            "user.activate" if body.is_active else "user.deactivate",
            admin.id,
            target_type="user",
            target_id=target.id,
            detail={"email": target.email},
        )
    if body.is_admin is not None:
        target.is_admin = body.is_admin
        _log(
            db,
            "user.grant_admin" if body.is_admin else "user.revoke_admin",
            admin.id,
            target_type="user",
            target_id=target.id,
            detail={"email": target.email},
        )

    db.commit()
    db.refresh(target)
    return {"id": target.id, "is_active": target.is_active, "is_admin": target.is_admin}


# ── 알림 관리 ─────────────────────────────────────────────────────────────────

@router.get("/alarms")
def list_all_alarms(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    alarms = db.query(Alarm).join(User).order_by(Alarm.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "alarm_time": str(a.alarm_time),
            "days_of_week": a.days_of_week,
            "is_active": a.is_active,
            "user_id": a.user_id,
            "user_email": a.user.email,
            "username": a.user.username,
        }
        for a in alarms
    ]


# ── 운영 로그 ─────────────────────────────────────────────────────────────────

@router.get("/logs")
def list_logs(
    action: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user_cache: dict[int, str] = {}

    def get_email(uid: int) -> str:
        if uid not in user_cache:
            u = db.query(User).filter(User.id == uid).first()
            user_cache[uid] = u.email if u else "unknown"
        return user_cache[uid]

    q = db.query(AdminLog).order_by(AdminLog.created_at.desc())
    if action:
        q = q.filter(AdminLog.action.ilike(f"%{action}%"))
    admin_logs = q.limit(200).all()

    result = [
        {
            "id": f"log_{log.id}",
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "detail": log.detail,
            "performed_by_email": get_email(log.performed_by),
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in admin_logs
    ]

    if not action or "crawl" in action:
        tasks = db.query(CrawlTask).order_by(CrawlTask.created_at.desc()).limit(50).all()
        for t in tasks:
            if t.status == "completed":
                event = "crawl.completed"
            elif t.status == "failed":
                event = "crawl.failed"
            else:
                event = "crawl.trigger"
            ts = t.completed_at or t.created_at
            result.append({
                "id": f"crawl_{t.id}",
                "action": event,
                "target_type": "crawl",
                "target_id": t.id,
                "detail": {
                    "target": t.target,
                    "record_count": t.record_count,
                    "approved": t.approved,
                    "status": t.status,
                },
                "performed_by_email": get_email(t.created_by),
                "created_at": ts.isoformat() if ts else None,
            })

    result.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return result[:150]


# ── 크롤링 트리거 ─────────────────────────────────────────────────────────────

@router.post("/crawl/{target}", status_code=status.HTTP_202_ACCEPTED)
async def trigger_crawl(
    target: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if target not in CRAWLER_MAP:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 타겟: {target}. 가능: {list(CRAWLER_MAP.keys())}")

    already_running = db.query(CrawlTask).filter(
        CrawlTask.target == target,
        CrawlTask.status.in_(["pending", "running"]),
    ).first()
    if already_running:
        raise HTTPException(status_code=409, detail="이미 크롤링이 진행 중입니다.")

    task = CrawlTask(target=target, status="pending", created_by=admin.id)
    db.add(task)
    db.flush()
    _log(db, "crawl.trigger", admin.id, target_type="crawl", target_id=task.id, detail={"target": target})
    db.commit()
    db.refresh(task)
    background_tasks.add_task(_run_crawl, task.id, target)
    return {"task_id": task.id, "target": target, "status": "pending"}


# ── 태스크 조회 ───────────────────────────────────────────────────────────────

@router.get("/crawl/tasks")
def list_tasks(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    tasks = db.query(CrawlTask).order_by(CrawlTask.created_at.desc()).limit(30).all()
    return [_task_dict(t) for t in tasks]


@router.get("/crawl/history")
def list_crawl_history(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """전체 크롤링 이력 (최대 200건)."""
    tasks = db.query(CrawlTask).order_by(CrawlTask.created_at.desc()).limit(200).all()
    user_cache: dict[int, str] = {}

    def get_email(uid: int) -> str:
        if uid not in user_cache:
            u = db.query(User).filter(User.id == uid).first()
            user_cache[uid] = u.email if u else "unknown"
        return user_cache[uid]

    return [
        {
            **_task_dict(t),
            "created_by_email": get_email(t.created_by),
        }
        for t in tasks
    ]


def _task_dict(t: CrawlTask) -> dict:
    return {
        "id": t.id,
        "target": t.target,
        "status": t.status,
        "record_count": t.record_count,
        "approved": t.approved,
        "diff_summary": t.diff_summary,
        "error_message": t.error_message,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
    }


@router.get("/crawl/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    task = db.query(CrawlTask).filter(CrawlTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다.")
    return {
        **_task_dict(task),
        "result_json": task.result_json,
    }


# ── 승인 (결과 → DB 저장, 누적 구조) ─────────────────────────────────────────

@router.post("/crawl/tasks/{task_id}/approve")
def approve_task(
    task_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    task = db.query(CrawlTask).filter(CrawlTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다.")
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="완료 상태의 태스크만 승인할 수 있습니다.")
    if task.approved:
        raise HTTPException(status_code=409, detail="이미 승인된 태스크입니다.")

    now = datetime.now(timezone.utc)
    data_month = now.strftime("%Y-%m")
    saved = 0
    diff_summary: dict = {"added": 0, "removed": 0, "modified": 0}

    if task.target == "telecom":
        old_plans = db.query(TelecomPlan).filter(TelecomPlan.is_latest == True).all()
        old_map = {(p.carrier, p.plan_name): p.monthly_fee for p in old_plans}

        new_items = [i for i in (task.result_json or []) if "error" not in i]
        new_map = {(i.get("carrier", ""), i.get("plan_name", "")): i.get("monthly_fee", 0) for i in new_items}

        diff_summary["added"] = len(set(new_map) - set(old_map))
        diff_summary["removed"] = len(set(old_map) - set(new_map))
        diff_summary["modified"] = sum(
            1 for k in new_map if k in old_map and new_map[k] != old_map[k]
        )

        db.query(TelecomPlan).filter(TelecomPlan.is_latest == True).update({"is_latest": False})
        for item in new_items:
            db.add(TelecomPlan(
                carrier=item.get("carrier", ""),
                plan_name=item.get("plan_name", ""),
                monthly_fee=item.get("monthly_fee", 0),
                data_gb=item.get("data_gb"),
                data_unlimited=item.get("data_unlimited", False),
                call_type=item.get("call_type", "무제한"),
                data_month=data_month,
                is_latest=True,
                crawled_at=now,
            ))
            saved += 1

    elif task.target == "cards":
        old_cards = db.query(Card).filter(Card.is_latest == True).all()
        old_map = {(c.name, c.company): c.annual_fee for c in old_cards}

        new_items = [i for i in (task.result_json or []) if "error" not in i]
        new_map = {(i.get("name", ""), i.get("company", "")): i.get("annual_fee", 0) for i in new_items}

        diff_summary["added"] = len(set(new_map) - set(old_map))
        diff_summary["removed"] = len(set(old_map) - set(new_map))
        diff_summary["modified"] = sum(
            1 for k in new_map if k in old_map and new_map[k] != old_map[k]
        )

        db.query(Card).filter(Card.is_latest == True).update({"is_latest": False})
        for item in new_items:
            card = Card(
                name=item.get("name", ""),
                company=item.get("company", ""),
                annual_fee=item.get("annual_fee", 0),
                card_type=item.get("card_type", "credit"),
                data_month=data_month,
                is_latest=True,
                crawled_at=now,
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

    task.approved = True
    task.diff_summary = diff_summary
    _log(
        db, "crawl.approve", admin.id,
        target_type="crawl", target_id=task_id,
        detail={"target": task.target, "saved": saved, "data_month": data_month},
    )
    db.commit()
    return {"saved": saved, "task_id": task_id, "data_month": data_month}


# ── 저장된 데이터 조회 ────────────────────────────────────────────────────────

@router.get("/data/telecom")
def get_telecom_data(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    plans = (
        db.query(TelecomPlan)
        .filter(TelecomPlan.is_latest == True)
        .order_by(TelecomPlan.carrier, TelecomPlan.monthly_fee)
        .all()
    )
    return [
        {
            "id": p.id,
            "carrier": p.carrier,
            "plan_name": p.plan_name,
            "monthly_fee": p.monthly_fee,
            "data_gb": p.data_gb,
            "data_unlimited": p.data_unlimited,
            "call_type": p.call_type,
            "data_month": p.data_month,
        }
        for p in plans
    ]


@router.get("/data/cards")
def get_cards_data(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    cards = (
        db.query(Card)
        .filter(Card.is_latest == True)
        .order_by(Card.company, Card.name)
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "company": c.company,
            "annual_fee": c.annual_fee,
            "card_type": c.card_type,
            "data_month": c.data_month,
            "benefit_count": len(c.benefits),
            "benefits": [
                {
                    "category": b.category,
                    "benefit_type": b.benefit_type,
                    "rate": b.rate,
                    "condition_amount": b.condition_amount,
                    "monthly_max": b.monthly_max,
                    "description": b.description,
                }
                for b in c.benefits
            ],
        }
        for c in cards
    ]


@router.delete("/data/{data_type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data(
    data_type: str,
    item_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    model = {"telecom": TelecomPlan, "cards": Card}.get(data_type)
    if not model:
        raise HTTPException(status_code=400, detail="잘못된 데이터 타입")
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")
    _log(
        db, "data.delete", admin.id,
        target_type=data_type, target_id=item_id,
        detail={"name": getattr(item, "name", None) or getattr(item, "plan_name", None)},
    )
    db.delete(item)
    db.commit()


# ── 절약 벤치마크 ─────────────────────────────────────────────────────────────

@router.post("/benchmarks/calculate")
def calculate_benchmarks(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    card_results = calculate_card_benchmarks(db)
    telecom_results = calculate_telecom_benchmarks(db)
    return {"card": card_results, "telecom": telecom_results}


@router.post("/benchmarks/save")
def save_benchmarks(
    body: BenchmarkSaveBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    db.query(SavingBenchmark).delete()
    now = datetime.now(timezone.utc)
    for item in body.items:
        db.add(SavingBenchmark(
            benchmark_type=item.benchmark_type,
            label=item.label,
            spending_monthly=item.spending_monthly,
            saving_monthly=item.saving_monthly,
            saving_annual=item.saving_annual,
            best_strategy=item.best_strategy,
            calculated_at=now,
        ))
    db.commit()
    _log(db, "benchmark.save", admin.id, detail={"count": len(body.items)})
    db.commit()
    return {"saved": len(body.items)}


@router.get("/benchmarks")
def get_benchmarks(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    bms = (
        db.query(SavingBenchmark)
        .order_by(SavingBenchmark.benchmark_type, SavingBenchmark.spending_monthly)
        .all()
    )
    return [
        {
            "id": b.id,
            "benchmark_type": b.benchmark_type,
            "label": b.label,
            "spending_monthly": b.spending_monthly,
            "saving_monthly": b.saving_monthly,
            "saving_annual": b.saving_annual,
            "best_strategy": b.best_strategy,
            "calculated_at": b.calculated_at.isoformat() if b.calculated_at else None,
        }
        for b in bms
    ]


# ── 시장 벤치마크(대략) — 어드민 수동 갱신 ───────────────────────────────────
# 코드에 박지 않고 DB에 둠. 어드민이 공개 출처(방통위 한도·공식 할인율) 보고 입력 → 적용.
# 적용 시 같은 카테고리 기존 행 is_latest=false, 새 행 is_latest=true (이력 보존).

class MarketBenchmarkBody(BaseModel):
    category: str
    reattach_subsidy_approx: Optional[int] = None
    new_subsidy_approx: Optional[int] = None
    discount_note: Optional[str] = None
    source: Optional[str] = None
    effective_month: Optional[str] = None


class MarketBenchmarkSaveBody(BaseModel):
    items: List[MarketBenchmarkBody]


@router.get("/benchmarks/market")
def get_market_benchmarks_admin(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = (
        db.query(MarketBenchmark)
        .filter(MarketBenchmark.is_latest == True)  # noqa: E712
        .order_by(MarketBenchmark.category)
        .all()
    )
    return [
        {
            "category": r.category,
            "reattach_subsidy_approx": r.reattach_subsidy_approx,
            "new_subsidy_approx": r.new_subsidy_approx,
            "discount_note": r.discount_note,
            "source": r.source,
            "effective_month": r.effective_month,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.post("/benchmarks/market")
def save_market_benchmarks(
    body: MarketBenchmarkSaveBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    for item in body.items:
        # 같은 카테고리 기존 최신 행 내림
        db.query(MarketBenchmark).filter(
            MarketBenchmark.category == item.category,
            MarketBenchmark.is_latest == True,  # noqa: E712
        ).update({"is_latest": False})
        db.add(MarketBenchmark(
            category=item.category,
            reattach_subsidy_approx=item.reattach_subsidy_approx,
            new_subsidy_approx=item.new_subsidy_approx,
            discount_note=item.discount_note,
            source=item.source,
            effective_month=item.effective_month,
            is_latest=True,
            updated_at=now,
        ))
    _log(db, "benchmark.market.save", admin.id, detail={"count": len(body.items)})
    db.commit()
    return {"saved": len(body.items)}


# 공개 기준 레퍼런스 — 방통위 경품 한도·공식 약정할인율 기반(공개 정보).
# 경쟁사 크롤 아님. 한도가 바뀌면 이 값만 갱신(드물게). '실제 사은품'이 아니라 '대략 한도/공식 규칙'.
PUBLIC_BENCHMARK_REFERENCE = {
    "인터넷": {"reattach_subsidy_approx": 150000, "new_subsidy_approx": 300000,
              "discount_note": "재약정 시 약정할인 유지", "source": "방통위 경품 한도(공개 기준)"},
    "TV": {"reattach_subsidy_approx": 150000, "new_subsidy_approx": 350000,
           "discount_note": "재약정 시 약정할인 유지", "source": "방통위 경품 한도(공개 기준)"},
    "정수기": {"reattach_subsidy_approx": None, "new_subsidy_approx": None,
             "discount_note": "재계약 시 요금할인·사은품 협상", "source": "시장 대략"},
    "휴대폰": {"reattach_subsidy_approx": None, "new_subsidy_approx": None,
             "discount_note": "선택약정 25% 재약정 할인", "source": "공식 약정할인율"},
}


@router.post("/benchmarks/market/fetch")
def fetch_market_benchmarks_draft(admin: User = Depends(require_admin)):
    """공개 기준값(방통위 한도·공식 할인율)으로 '초안'을 만들어 반환(저장 안 함).
    어드민이 검토·수정 후 /benchmarks/market 으로 적용. 라이브 경쟁사 스크랩 아님.
    한도가 바뀌면 PUBLIC_BENCHMARK_REFERENCE만 갱신.
    """
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    draft = []
    for category, ref in PUBLIC_BENCHMARK_REFERENCE.items():
        draft.append({
            "category": category,
            "reattach_subsidy_approx": ref["reattach_subsidy_approx"],
            "new_subsidy_approx": ref["new_subsidy_approx"],
            "discount_note": ref["discount_note"],
            "source": ref["source"],
            "effective_month": month,
        })
    return {"items": draft, "fetched_month": month}
