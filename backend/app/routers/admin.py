from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.deps import get_current_user
from app.crawlers.card_crawler import CardCrawler
from app.crawlers.telecom_crawler import TelecomCrawler
from app.models.crawl_task import CrawlTask
from app.models.product import Card, CardBenefit, TelecomPlan
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["관리자"])

CRAWLER_MAP = {
    "cards": CardCrawler,
    "telecom": TelecomCrawler,
}


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user


async def _run_crawl(task_id: int, target: str) -> None:
    """백그라운드에서 실행 — 자체 DB 세션 사용"""
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


# ── 크롤링 트리거 ──────────────────────────────────────────────────────────

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
    db.commit()
    db.refresh(task)

    background_tasks.add_task(_run_crawl, task.id, target)
    return {"task_id": task.id, "target": target, "status": "pending"}


# ── 태스크 조회 ────────────────────────────────────────────────────────────

@router.get("/crawl/tasks")
def list_tasks(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    tasks = db.query(CrawlTask).order_by(CrawlTask.created_at.desc()).limit(30).all()
    return [
        {
            "id": t.id,
            "target": t.target,
            "status": t.status,
            "record_count": t.record_count,
            "approved": t.approved,
            "error_message": t.error_message,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        }
        for t in tasks
    ]


@router.get("/crawl/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    task = db.query(CrawlTask).filter(CrawlTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다.")
    return {
        "id": task.id,
        "target": task.target,
        "status": task.status,
        "record_count": task.record_count,
        "approved": task.approved,
        "error_message": task.error_message,
        "result_json": task.result_json,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


# ── 승인 (결과 → DB 저장) ──────────────────────────────────────────────────

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

    data_month = datetime.now().strftime("%Y-%m")
    saved = 0

    if task.target == "telecom":
        # 같은 달 기존 데이터 비활성화
        db.query(TelecomPlan).filter(TelecomPlan.data_month == data_month).update({"is_active": False})
        for item in (task.result_json or []):
            if "error" in item:
                continue
            db.add(TelecomPlan(
                carrier=item.get("carrier", ""),
                plan_name=item.get("plan_name", ""),
                monthly_fee=item.get("monthly_fee", 0),
                data_gb=item.get("data_gb"),
                data_unlimited=item.get("data_unlimited", False),
                call_type=item.get("call_type", "무제한"),
                data_month=data_month,
            ))
            saved += 1

    elif task.target == "cards":
        # 같은 달 기존 데이터 비활성화
        db.query(Card).filter(Card.data_month == data_month).update({"is_active": False})
        for item in (task.result_json or []):
            if "error" in item:
                continue
            card = Card(
                name=item.get("name", ""),
                company=item.get("company", ""),
                annual_fee=item.get("annual_fee", 0),
                card_type=item.get("card_type", "credit"),
                data_month=data_month,
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
    db.commit()
    return {"saved": saved, "task_id": task_id, "data_month": data_month}


# ── 저장된 데이터 조회 ─────────────────────────────────────────────────────

@router.get("/data/telecom")
def get_telecom_data(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    plans = db.query(TelecomPlan).filter(TelecomPlan.is_active == True).order_by(
        TelecomPlan.carrier, TelecomPlan.monthly_fee
    ).all()
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
    cards = db.query(Card).filter(Card.is_active == True).order_by(
        Card.company, Card.name
    ).all()
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
    db.delete(item)
    db.commit()
