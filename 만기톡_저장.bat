@echo off
title save-mangitalk
cd /d %~dp0

echo ============================================
echo  [1/3] Database migration
echo ============================================
cd backend
call venv\Scripts\activate
alembic upgrade head
if errorlevel 1 goto :fail
cd ..

echo.
echo ============================================
echo  [2/3] Git safety check
echo ============================================
if exist .git\index.lock del .git\index.lock
git ls-files | findstr /R "frontend/$" >nul 2>&1
if not errorlevel 1 goto :corrupt
git status --short

echo.
echo ============================================
echo  [3/3] Commit and push
echo ============================================
git add -A
git commit -m "fix: drop term assumption copy, simplify save label, boxed+tap-lift delete button, more sheet bottom padding"
git push

echo.
echo  DONE! If there are no red errors above, everything is saved.
pause
exit /b

:fail
echo.
echo  MIGRATION FAILED - please screenshot this window and show Claude.
pause
exit /b

:corrupt
echo.
echo  GIT INDEX WARNING - stopped for safety. Screenshot this window and show Claude.
pause
exit /b
