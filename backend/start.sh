#!/usr/bin/env bash
# 배포 시작 스크립트 — 마이그레이션 적용 후 서버 실행.
# Cloudtype/Render 시작 커맨드: bash start.sh  (작업 디렉토리 = backend)
set -e
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
