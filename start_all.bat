@echo off
echo ========================================================
echo   AgriFresh Cold-Chain Logistics Engine - Launch All
echo ========================================================
start "AgriFresh Backend (FastAPI)" cmd /c "%~dp0run_backend.bat"
start "AgriFresh Frontend (Vite)" cmd /c "%~dp0run_frontend.bat"
echo Services launching in background windows.
echo Dashboard URL: http://localhost:8000  (Built App)
echo Dev HMR URL:   http://localhost:5173  (Vite Dev Server)
echo API Docs:      http://localhost:8000/docs

