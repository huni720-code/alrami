@echo off
title migrate-only
cd /d %~dp0
echo ============================================
echo  Apply DB migration only (no commit)
echo ============================================
cd backend
call venv\Scripts\activate
alembic upgrade head
if errorlevel 1 goto :fail
echo.
echo  DONE. Migration applied. You can now test the app.
pause
exit /b
:fail
echo.
echo  MIGRATION FAILED - screenshot this window and show Claude.
pause
exit /b
