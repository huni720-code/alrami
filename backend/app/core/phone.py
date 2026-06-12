"""전화번호 정규화 유틸.

가입/로그인/수정/재설정 등 전화번호를 다루는 모든 경로는 이 함수를 통과해야 한다.
- 하이픈/공백/기타 비숫자 제거 → 숫자만 남김
- 010 으로 시작하는 10~11자리만 유효 (한국 휴대폰)
"""
import re


class InvalidPhoneError(ValueError):
    """전화번호 형식이 올바르지 않을 때."""


def normalize_phone(raw: str | None) -> str:
    """숫자만 남기고 010 시작 10~11자리 검증. 실패 시 InvalidPhoneError."""
    if not raw:
        raise InvalidPhoneError("전화번호를 입력해 주세요.")
    digits = re.sub(r"\D", "", raw)
    if not digits.startswith("010") or not (10 <= len(digits) <= 11):
        raise InvalidPhoneError("올바른 휴대폰 번호를 입력해 주세요. (예: 01012345678)")
    return digits


def try_normalize_phone(raw: str | None) -> str | None:
    """검증 실패 시 None 반환(예외 없이). 카카오 등 best-effort 경로용."""
    try:
        return normalize_phone(raw)
    except InvalidPhoneError:
        return None
