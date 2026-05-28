import asyncio
import logging
from datetime import date, timezone, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.exc import OperationalError

from app.core.database import SessionLocal
from app.models.admin_log import AdminLog
from app.models.user import User
from app.models.user_profile import UserProfile
from app.services.notification import send_email

logger = logging.getLogger(__name__)
_scheduler = BackgroundScheduler(timezone="Asia/Seoul")


# ──────────────────────────────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────────────────────────────

def _already_notified(db, action: str, user_id: int) -> bool:
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    return (
        db.query(AdminLog)
        .filter(
            AdminLog.action == action,
            AdminLog.target_type == "user",
            AdminLog.target_id == user_id,
            AdminLog.created_at >= today_start,
        )
        .first()
        is not None
    )


def _record_log(db, action: str, user_id: int, detail: dict) -> None:
    log = AdminLog(
        action=action,
        target_type="user",
        target_id=user_id,
        detail=detail,
        performed_by=user_id,  # 자동 발송: 수신자 ID를 행위자로 기록
    )
    db.add(log)
    db.commit()


def _run_async(coro):
    asyncio.run(coro)


# ──────────────────────────────────────────────────────────────
# 작업 1: 매일 오전 9시 — 약정 만기 D-day 알림
# ──────────────────────────────────────────────────────────────

def job_contract_dday():
    today = date.today()
    db = SessionLocal()
    try:
        profiles = (
            db.query(UserProfile)
            .filter(
                UserProfile.contract_end_date.isnot(None),
                UserProfile.onboarding_completed == True,  # noqa: E712
            )
            .all()
        )
        for p in profiles:
            delta = (p.contract_end_date - today).days
            if delta not in (90, 30, 7):
                continue

            user = db.query(User).filter(User.id == p.user_id, User.is_active == True).first()  # noqa: E712
            if not user:
                continue

            action = "alarm.contract_notify"
            if _already_notified(db, action, user.id):
                logger.info("[SCHEDULER] 약정 알림 중복 건너뜀 user_id=%s", user.id)
                continue

            subject = f"[알라미] 통신 약정 만료 D-{delta}일 남았습니다"
            body_html = f"""
<h2>안녕하세요, {user.username}님!</h2>
<p>통신 약정 종료일이 <strong>{p.contract_end_date}</strong>로 <strong>D-{delta}일</strong> 남았습니다.</p>
<p>지금 알라미에서 추천 요금제로 변경하면 매월 통신비를 절약할 수 있어요.</p>
<p><a href="http://localhost:5173/dashboard">알라미에서 요금제 확인하기 →</a></p>
"""
            _run_async(send_email(user.email, subject, body_html))
            _record_log(db, action, user.id, {"delta": delta, "contract_end_date": str(p.contract_end_date)})

    except Exception as exc:
        logger.exception("[SCHEDULER] job_contract_dday 오류: %s", exc)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 작업 2: 매월 25일 오전 9시 — 카드 실적 리마인더
# (UserCard / CardTransaction 모델이 생성된 후 활성화됩니다)
# ──────────────────────────────────────────────────────────────

def job_card_performance():
    db = SessionLocal()
    try:
        # 동적 임포트: 해당 모델이 없으면 경고 후 종료
        try:
            from app.models.user_card import UserCard          # noqa: PLC0415
            from app.models.card_transaction import CardTransaction  # noqa: PLC0415
        except ImportError:
            logger.warning("[SCHEDULER] UserCard/CardTransaction 모델 미생성 — 카드 실적 알림 건너뜀")
            return

        today = date.today()
        cards = (
            db.query(UserCard)
            .filter(UserCard.performance_target.isnot(None))
            .all()
        )

        # 사용자별 현재 실적 합산
        from sqlalchemy import func  # noqa: PLC0415
        user_card_map: dict[int, list] = {}
        for card in cards:
            user_card_map.setdefault(card.user_id, []).append(card)

        for user_id, user_cards in user_card_map.items():
            user = db.query(User).filter(User.id == user_id, User.is_active == True).first()  # noqa: E712
            if not user:
                continue

            lines = []
            any_below_target = False
            for card in user_cards:
                total = (
                    db.query(func.coalesce(func.sum(CardTransaction.amount), 0))
                    .filter(
                        CardTransaction.user_card_id == card.id,
                        CardTransaction.transaction_date >= date(today.year, today.month, 1),
                        CardTransaction.transaction_date <= today,
                    )
                    .scalar()
                ) or 0
                shortage = max(0, card.performance_target - total)
                if shortage > 0:
                    any_below_target = True
                lines.append(
                    f"<tr><td>{card.name}</td>"
                    f"<td>{total:,}원</td>"
                    f"<td>{card.performance_target:,}원</td>"
                    f"<td>{'달성 ✅' if shortage == 0 else f'{shortage:,}원 부족'}</td></tr>"
                )

            if not any_below_target:
                continue

            subject = "[알라미] 카드 실적 마감이 얼마 남지 않았어요"
            body_html = f"""
<h2>안녕하세요, {user.username}님!</h2>
<p>이번 달 카드 실적을 확인해 보세요.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse">
  <tr><th>카드</th><th>현재 실적</th><th>목표</th><th>상태</th></tr>
  {''.join(lines)}
</table>
<p><a href="http://localhost:5173/my-cards">카드 실적 자세히 보기 →</a></p>
"""
            _run_async(send_email(user.email, subject, body_html))

    except OperationalError as exc:
        logger.warning("[SCHEDULER] job_card_performance DB 오류 (테이블 미생성 가능): %s", exc)
    except Exception as exc:
        logger.exception("[SCHEDULER] job_card_performance 오류: %s", exc)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 작업 3: 매월 1일 오전 8시 — 월간 절약 리포트
# ──────────────────────────────────────────────────────────────

def job_monthly_report():
    from sqlalchemy import func  # noqa: PLC0415
    from app.models.expense import Expense  # noqa: PLC0415

    today = date.today()
    # 지난달 범위
    if today.month == 1:
        last_year, last_month = today.year - 1, 12
    else:
        last_year, last_month = today.year, today.month - 1

    import calendar  # noqa: PLC0415
    last_day = calendar.monthrange(last_year, last_month)[1]
    period_start = date(last_year, last_month, 1)
    period_end = date(last_year, last_month, last_day)

    db = SessionLocal()
    try:
        # onboarding_completed=True, is_active=True 사용자
        users = (
            db.query(User)
            .join(UserProfile, UserProfile.user_id == User.id)
            .filter(User.is_active == True, UserProfile.onboarding_completed == True)  # noqa: E712
            .all()
        )

        for user in users:
            # 지난달 지출 합산 (Expense 모델 기준)
            total_expense = (
                db.query(func.coalesce(func.sum(Expense.amount), 0))
                .filter(
                    Expense.user_id == user.id,
                    Expense.expense_date >= datetime.combine(period_start, datetime.min.time()),
                    Expense.expense_date <= datetime.combine(period_end, datetime.max.time()),
                )
                .scalar()
            ) or 0

            # 카드 달성 건수: CardTransaction 없으면 0
            achieved_cards = 0
            try:
                from app.models.user_card import UserCard            # noqa: PLC0415
                from app.models.card_transaction import CardTransaction  # noqa: PLC0415
                cards = db.query(UserCard).filter(UserCard.user_id == user.id).all()
                for card in cards:
                    if card.performance_target:
                        ct = (
                            db.query(func.coalesce(func.sum(CardTransaction.amount), 0))
                            .filter(
                                CardTransaction.user_card_id == card.id,
                                CardTransaction.transaction_date >= period_start,
                                CardTransaction.transaction_date <= period_end,
                            )
                            .scalar()
                        ) or 0
                        if ct >= card.performance_target:
                            achieved_cards += 1
            except (ImportError, OperationalError):
                pass

            subject = f"[알라미] {last_year}년 {last_month}월 절약 현황 리포트"
            body_html = f"""
<h2>안녕하세요, {user.username}님!</h2>
<h3>{last_year}년 {last_month}월 지출 요약</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse">
  <tr><th>항목</th><th>내용</th></tr>
  <tr><td>총 지출액</td><td>{int(total_expense):,}원</td></tr>
  <tr><td>카드 실적 달성</td><td>{achieved_cards}개</td></tr>
</table>
<p><a href="http://localhost:5173/dashboard">알라미 대시보드에서 자세히 보기 →</a></p>
"""
            _run_async(send_email(user.email, subject, body_html))

    except Exception as exc:
        logger.exception("[SCHEDULER] job_monthly_report 오류: %s", exc)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 스케줄러 시작 / 종료
# ──────────────────────────────────────────────────────────────

def start_scheduler() -> None:
    _scheduler.add_job(job_contract_dday,  "cron", hour=9,  minute=0, id="contract_dday")
    _scheduler.add_job(job_card_performance, "cron", day=25, hour=9, minute=0, id="card_performance")
    _scheduler.add_job(job_monthly_report,   "cron", day=1,  hour=8, minute=0, id="monthly_report")
    _scheduler.start()
    logger.info("[SCHEDULER] 알림 스케줄러 시작됨 (작업 3개)")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[SCHEDULER] 알림 스케줄러 종료됨")
