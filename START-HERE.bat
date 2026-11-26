@echo off
chcp 65001 >nul
setlocal
echo ============================================================
echo   Awesome-OS — Start Here (Windows 11 / v11 CAS Bootstrap)
echo ============================================================
echo.
if exist "%USERPROFILE%\.b8g\cas\v11\index.json" (
  echo [OK] Existing Awesome-OS v11 CAS root detected.
  echo Opening Unified Control Plane...
  start "" "https://b8g.dev/awesome-os/apps/host-manager.html"
  exit /b 0
)
echo Launching interactive Awesome-OS setup (PowerShell)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://awesome-os.com/install.ps1 | iex"
