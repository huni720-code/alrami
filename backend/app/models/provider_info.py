from sqlalchemy import Column, Integer, String

from app.core.database import Base


class ProviderInfo(Base):
    """회사별 약정 확인 경로 참조 테이블 (약정 확인 도우미)."""
    __tablename__ = "provider_info"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False, unique=True, index=True)
    short_number = Column(String, nullable=True)    # 본인폰 단축번호
    center_number = Column(String, nullable=True)   # 고객센터 번호
    app_name = Column(String, nullable=True)        # 공식 앱 이름
    check_path = Column(String, nullable=True)      # 약정 조회 메뉴 경로
    category_hint = Column(String, nullable=True)   # 해당 카테고리 힌트
