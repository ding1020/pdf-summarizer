@echo off
echo Starting PDF Summarizer Development Server...
cd /d "%~dp0"
echo.
echo Starting on http://localhost:3000
echo Press Ctrl+C to stop
echo.
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev
