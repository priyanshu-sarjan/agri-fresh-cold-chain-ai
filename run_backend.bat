@echo off
echo Starting AgriFresh FastAPI Backend Server...
cd /d "%~dp0"
call .venv\Scripts\activate
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause

