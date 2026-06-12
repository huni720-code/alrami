"""운영자 계정을 관리자(is_admin=True)로 승격.

실행: backend/ 디렉터리에서
    python scripts/make_admin.py huni720@gmail.com

해당 이메일 사용자가 DB에 있어야 한다(먼저 앱에서 그 이메일로 가입/로그인).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User


def main() -> None:
    if len(sys.argv) < 2:
        print("사용법: python scripts/make_admin.py <email>")
        sys.exit(1)

    email = sys.argv[1].strip()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            print(f"❌ 해당 이메일 사용자가 없습니다: {email}")
            print("   먼저 앱에서 그 이메일로 회원가입/로그인 후 다시 실행하세요.")
            sys.exit(1)
        if user.is_admin:
            print(f"ℹ️  {email} 은 이미 관리자입니다.")
            return
        user.is_admin = True
        db.commit()
        print(f"✅ {email} → 관리자 권한 부여 완료 (is_admin=True). 다시 로그인하면 '관리자' 메뉴가 보입니다.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
