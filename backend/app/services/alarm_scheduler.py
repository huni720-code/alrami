import asyncio
import logging
from datetime import date, timezone, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.admin_log import AdminLog
from app.models.contract import Contract
from app.models.user import User
from app.models.user_profile import UserProfile
from app.services.notification import send_email, send_kakao_alimtalk

logger = logging.getLogger(__name__)
_scheduler = BackgroundScheduler(timezone="Asia/Seoul")

# 약정 D-day 트리거 기준 (일)
CONTRACT_DDAY_TRIGGERS = (90, 30, 7)


# ──────────────────────────────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────────────────────────────

def _already_notified(db, action: str, target_id: int, target_type: str = "user") -> bool:
    """오늘 같은 (action, target_type, target_id) 로그가 있으면 True."""
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    return (
        db.query(AdminLog)
        .filter(
            AdminLog.action == action,
            AdminLog.target_type == target_type,
            AdminLog.target_id == target_id,
            AdminLog.created_at >= today_start,
        )
        .first()
        is not None
    )


def _record_log(
    db,
    action: str,
    target_id: int,
    detail: dict,
    target_type: str = "user",
    performed_by: int | None = None,
) -> None:
    log = AdminLog(
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        performed_by=performed_by or target_id,
    )
    db.add(log)
    db.commit()


def _run_async(coro) -> None:
    asyncio.run(coro)


def _build_contract_email(username: str, contract: Contract, delta: int) -> str:
    urgency = "긴급" if delta <= 7 else "안내"
    return (
        f"<h2>안녕하세요, {username}님!</h2>"
        f"<p>[{urgency}] {contract.provider} {contract.category} 약정이 "
        f"<strong>{contract.end_date}</strong>에 만료됩니다. "
        f"<strong>D-{delta}일</strong> 남았습니다.</p>"
        f"<p>지금 알라미에서 갈아타기 유리한 조건을 확인해 보세요.</p>"
        f'<p><a href="{settings.SERVICE_URL}/contracts/onboarding">약정 확인하기 →</a></p>'
    )


# ──────────────────────────────────────────────────────────────
# 작업 1: 매일 오전 9시 — 약정 만기 D-day 알림 (다품목)
# ──────────────────────────────────────────────────────────────
#
# 대상: Contract 모델의 is_active=True 약정 전체
# 트리거: end_date 기준 D-90 / D-30 / D-7
# 채널: 카카오 알림톡(정보성) → 키 없으면 [KAKAO-DEV] 로그
#       알림톡 키 없을 때만 이메일 fallback
# 중복 방지: (action=alarm.contract_dday_dN, target_type=contract, target_id=contract.id) 일 단위
#
# ※ 실발송 전 사전 작업 필요:
#   1. 카카오톡 채널 개설
#   2. 발신프로필(Sender Profile) 등록
#   3. 알림톡 템플릿 사전심사 (KAKAO_CONTRACT_TEMPLATE_CODE 교체)
#   4. 수신자 phone 필드: 현재 User 모델에 phone 없음 → 별도 마이그레이션 필요
#      (키 미설정 dev 모드에서는 user.email을 수신자 식별자로 기록)

def job_contract_dday() -> None:
    today = date.today()
    db = SessionLocal()
    try:
        contracts = (
            db.query(Contract)
            .filter(Contract.is_active == True)  # noqa: E712
            .all()
        )

        for c in contracts:
            delta = (c.end_date - today).days
            if delta not in CONTRACT_DDAY_TRIGGERS:
                continue

            user = (
                db.query(User)
                .filter(User.id == c.user_id, User.is_active == True)  # noqa: E712
                .first()
            )
            if not user:
                continue

            action = f"alarm.contract_dday_d{delta}"
            if _already_notified(db, action, c.id, target_type="contract"):
                logger.info(
                    "[SCHEDULER] 중복 건너뜀 contract_id=%s delta=%s",
                    c.id, delta,
                )
                continue

            end_date_fmt = c.end_date.strftime("%Y년 %m월 %d일")
            variables = {
                "username": user.username,
                "category": c.category,
                "provider": c.provider,
                "end_date": end_date_fmt,
                "dday": str(delta),
                "link": f"{settings.SERVICE_URL}/contracts/onboarding",
            }

            # 1순위: 카카오 알림톡 (정보성 — 친구톡 아님)
            # 실발송 시 recipient_phone은 user.phone 필드(미구현)로 교체 필요
            recipient_phone = getattr(user, "phone", None) or user.email
            _run_async(
                send_kakao_alimtalk(
                    recipient_phone,
                    settings.KAKAO_CONTRACT_TEMPLATE_CODE,
                    variables,
                )
            )

            # 2순위: 이메일 fallback — 알림톡 키 없을 때만
            if not settings.KAKAO_ALIMTALK_KEY:
                subject = f"[알라미] {c.category} 약정 만료 D-{delta}일 안내"
                body_html = _build_contract_email(user.username, c, delta)
                _run_async(send_email(user.email, subject, body_html))

            _record_log(
                db,
                action,
                target_id=c.id,
                detail={
                    "user_id": user.id,
                    "delta": delta,
                    "category": c.category,
                    "provider": c.provider,
                    "end_date": str(c.end_date),
                    "accuracy": c.accuracy,
                },
                target_type="contract",
                performed_by=user.id,
            )
            logger.info(
                "[SCHEDULER] 약정 알림 발송 user_id=%s contract_id=%s category=%s delta=%s",
                user.id, c.id, c.category, delta,
            )

    except Exception as exc:
        logger.exception("[SCHEDULER] job_contract_dday 오류: %s", exc)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 작업 2: 매월 25일 오전 9시 — 카드 실적 리마인더
# ──────────────────────────────────────────────────────────────

def job_card_performance() -> None:
    db = SessionLocal()
    try:
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
                    f"<td>{'달성' if shortage == 0 else f'{shortage:,}원 부족'}</td></tr>"
                )

            if not any_below_target:
                continue

            subject = "[알라미] 카드 실적 마감이 얼마 남지 않았어요"
            body_html = (
                f"<h2>안녕하세요, {user.username}님!</h2>"
                "<p>이번 달 카드 실적을 확인해 보세요.</p>"
                '<table border="1" cellpadding="6" style="border-collapse:collapse">'
                "<tr><th>카드</th><th>현재 실적</th><th>목표</th><th>상태</th></tr>"
                f"{''.join(lines)}"
                "</table>"
                f'<p><a href="{settings.SERVICE_URL}/my-cards">카드 실적 자세히 보기 →</a></p>'
            )
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

def job_monthly_report() -> None:
    from sqlalchemy import func  # noqa: PLC0415
    from app.models.expense import Expense  # noqa: PLC0415

    today = date.today()
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
        users = (
            db.query(User)
            .join(UserProfile, UserProfile.user_id == User.id)
            .filter(User.is_active == True, UserProfile.onboarding_completed == True)  # noqa: E712
            .all()
        )

        for user in users:
            total_expense = (
                db.query(func.coalesce(func.sum(Expense.amount), 0))
                .filter(
                    Expense.user_id == user.id,
                    Expense.expense_date >= datetime.combine(period_start, datetime.min.time()),
                    Expense.expense_date <= datetime.combine(period_end, datetime.max.time()),
                )
                .scalar()
            ) or 0

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
            body_html = (
                f"<h2>안녕하세요, {user.username}님!</h2>"
                f"<h3>{last_year}년 {last_month}월 지출 요약</h3>"
                '<table border="1" cellpadding="6" style="border-collapse:collapse">'
                "<tr><th>항목</th><th>내용</th></tr>"
                f"<tr><td>총 지출액</td><td>{int(total_expense):,}원</td></tr>"
                f"<tr><td>카드 실적 달성</td><td>{achieved_cards}개</td></tr>"
                "</table>"
                f'<p><a href="{settings.SERVICE_URL}/dashboard">알라미 대시보드에서 자세히 보기 →</a></p>'
            )
            _run_async(send_email(user.email, subject, body_html))

    except Exception as exc:
        logger.exception("[SCHEDULER] job_monthly_report 오류: %s", exc)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 스케줄러 시작 / 종료
# ──────────────────────────────────────────────────────────────

def start_scheduler() -> None:
    _scheduler.add_job(job_contract_dday,    "cron", hour=9,  minute=0, id="contract_dday")
    _scheduler.add_job(job_card_performance, "cron", day=25,  hour=9,  minute=0, id="card_performance")
    _scheduler.add_job(job_monthly_report,   "cron", day=1,   hour=8,  minute=0, id="monthly_report")
    _scheduler.start()
    logger.info("[SCHEDULER] 알림 스케줄러 시작됨 (작업 3개)")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[SCHEDULER] 알림 스케줄러 종료됨")
