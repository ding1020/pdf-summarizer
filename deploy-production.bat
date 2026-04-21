@echo off
REM ============================================
REM PDF Summarizer - Production Deployment Script
REM ============================================

echo PDF Summarizer - Production Deployment
echo ===========================================

REM Check environment variables
echo Checking environment variables...

if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL is not set
    exit /b 1
)

if "%CLERK_SECRET_KEY%"=="" (
    echo ERROR: CLERK_SECRET_KEY is not configured
    exit /b 1
)

if "%DEEPSEEK_API_KEY%"=="" (
    echo ERROR: DEEPSEEK_API_KEY is not configured
    exit /b 1
)

echo All required environment variables are set
echo.

REM Build project
echo Building project...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo Build completed
echo.

REM Database migration
echo Running database migration...
call npx prisma generate
call npx prisma db push
echo Database migration completed
echo.

REM Deploy to Vercel
echo Deploying to Vercel...
call vercel --prod --yes
if %ERRORLEVEL% neq 0 (
    echo ERROR: Deployment failed
    exit /b 1
)
echo Deployment completed
echo.

echo ===========================================
echo Deployment completed successfully!
echo ===========================================
pause
