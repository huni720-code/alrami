import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body_html: str) -> None:
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
