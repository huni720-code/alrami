from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    KAKAO_CLIENT_ID: Optional[str] = None
    KAKAO_REDIRECT_URI: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    ADMIN_EMAIL: Optional[str] = None

    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: Optional[str] = None
    # 인증코드 SMS 발송 키(솔라피 등) — 미설정 시 [SMS-DEV] 로그만
    SMS_API_KEY: Optional[str] = None
    KAKAO_ALIMTALK_KEY: Optional[str] = None
    KAKAO_SENDER_KEY: Optional[str] = None
    # 카카오 알림톡 템플릿 코드 — 채널 개설·템플릿 사전심사 후 실제 코드로 교체
    KAKAO_CONTRACT_TEMPLATE_CODE: str = "ALRAMI_CONTRACT_DDAY"
    KAKAO_SWITCH_FOLLOWUP_TEMPLATE_CODE: str = "ALRAMI_SWITCH_FOLLOWUP"
    # 서비스 URL — 알림톡 갈아타기 링크에 사용
    SERVICE_URL: str = "http://localhost:5173"
    # CORS 허용 출처 — 배포 시 프론트 도메인을 콤마로 추가(예: "https://mangitalk.vercel.app")
    CORS_ORIGINS: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
