@echo off
cd /d "%~dp0"
echo Starting Heartfall server on http://localhost:5500
python -m http.server 5500
