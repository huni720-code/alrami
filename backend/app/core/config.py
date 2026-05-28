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

    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: Optional[str] = None
    KAKAO_ALIMTALK_KEY: Optional[str] = None
    KAKAO_SENDER_KEY: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
