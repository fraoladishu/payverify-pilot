@echo off
title PayVerify - Restaurant Payment Pilot
echo ===================================================
echo   Starting PayVerify System (Backend + Frontend)
echo ===================================================
echo.

start "PayVerify Backend API" cmd /k "cd backend && npm start"
start "PayVerify Frontend PWA" cmd /k "cd frontend && npm run dev"

echo Backend running on: http://localhost:5000
echo Frontend running on: http://localhost:5173
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
