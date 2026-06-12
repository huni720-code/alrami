import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body_html: str) -> None:
    # DEV FALLBACK ONLY — 사용자 노출 알림 채널은 카카오 알림톡 단일.
    # 이 함수는 알림톡 키(KAKAO_ALIMTALK_KEY)가 없을 때만 개발용으로 호출됨.
    # SMS(문자) 발송 코드는 원래 없음(설계상 카톡 단일). 삭제 금지.
    if not settings.SENDGRID_API_KEY:
        logger.info("[EMAIL-DEV] to=%s subject=%s", to, subject)
        return

    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": settings.FROM_EMAIL},
        "subject": subject,
        "content": [{"type": "text/html", "value": body_html}],
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
    if res.status_code not in (200, 202):
        logger.error("[EMAIL] 발송 실패 to=%s status=%s body=%s", to, res.status_code, res.text)
    else:
        logger.info("[EMAIL] 발송 완료 to=%s subject=%s", to, subject)


async def send_sms(phone: str, text: str) -> None:
    # 인증코드 SMS 전용(사용자 결정: 만기 알림은 카톡, 인증코드 문자는 OK).
    # SMS_API_KEY 미설정이면 [SMS-DEV] 로그만 — 개발 중 코드 자가 확인용.
    # TODO: 실발송 연동(솔라피 등). 아래는 키 있을 때 호출할 자리(미연동).
    if not settings.SMS_API_KEY:
        logger.info("[SMS-DEV] to=%s text=%s", phone, text)
        return

    # 실발송 연동 미완 — 키가 있어도 아직 외부 발송 코드는 없음.
    # 솔라피(coolsms) 등 연동 시 여기에 POST 추가. 그 전까지는 로그로 대체.
    logger.warning("[SMS] SMS_API_KEY 설정됨 — 실발송 연동 미완(솔라피 등). to=%s", phone)
    logger.info("[SMS-DEV] to=%s text=%s", phone, text)


async def send_kakao_alimtalk(to: str, template_code: str, variables: dict) -> None:
    if not settings.KAKAO_ALIMTALK_KEY or not settings.KAKAO_SENDER_KEY:
        logger.info("[KAKAO-DEV] to=%s template=%s vars=%s", to, template_code, variables)
        return

    payload = {
        "senderKey": settings.KAKAO_SENDER_KEY,
        "templateCode": template_code,
        "recipientList": [
            {
                "recipientNo": to,
                "templateParameter": variables,
            }
        ],
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/"
            f"{settings.KAKAO_ALIMTALK_KEY}/messages",
            json=payload,
            timeout=10,
        )
    if res.status_code != 200:
        logger.error("[KAKAO] 발송 실패 to=%s status=%s body=%s", to, res.status_code, res.text)
    else:
        logger.info("[KAKAO] 발송 완료 to=%s template=%s", to, template_code)
