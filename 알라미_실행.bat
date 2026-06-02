@echo off
chcp 65001 >nul
title 만기톡 Launcher
cd /d %~dp0
echo ============================================
echo    만기톡 실행
echo ============================================
echo.
echo 백엔드와 프론트엔드 창이 각각 열립니다.
echo 프론트엔드 창에 "Local: http://localhost:5173" 이 뜨면 준비 완료입니다.
echo (처음 실행이면 부품 설치로 몇 분 걸립니다.)
echo.
start "만기톡 Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "만기톡 Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
timeout /t 10 >nul
start http://localhost:5173
echo.
echo 브라우저가 열렸는데 "연결 거부"가 뜨면, 프론트엔드 창에
echo "Local: http://localhost:5173" 이 나타날 때까지 기다린 뒤 브라우저에서 F5 를 누르세요.
echo 끄려면 새로 열린 검은 창 2개를 닫으세요.
echo.
pause
