@echo off
cd /d "%~dp0"
echo Starting PDF Summarizer Development Server...
echo.
echo Starting on http://localhost:3000
echo Press Ctrl+C to stop
echo.
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev
