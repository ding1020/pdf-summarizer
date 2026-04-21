#!/bin/bash
# ============================================
# PDF Summarizer - Production Deployment Script
# ============================================

set -e

echo "PDF Summarizer - Production Deployment"
echo "==========================================="

# Check environment variables
check_env() {
    echo "Checking environment variables..."
    
    if [ -z "$DATABASE_URL" ]; then
        echo "ERROR: DATABASE_URL is not set"
        exit 1
    fi
    
    if [ -z "$CLERK_SECRET_KEY" ] || [[ "$CLERK_SECRET_KEY" == *"xxxx"* ]]; then
        echo "ERROR: CLERK_SECRET_KEY is not configured"
        exit 1
    fi
    
    if [ -z "$DEEPSEEK_API_KEY" ] || [[ "$DEEPSEEK_API_KEY" == *"xxxx"* ]]; then
        echo "ERROR: DEEPSEEK_API_KEY is not configured"
        exit 1
    fi
    
    echo "All required environment variables are set"
    echo ""
}

# Build project
build_project() {
    echo "Building project..."
    npm run build
    echo "Build completed"
    echo ""
}

# Database migration
migrate_database() {
    echo "Running database migration..."
    npx prisma generate
    npx prisma db push
    echo "Database migration completed"
    echo ""
}

# Deploy to Vercel
deploy_vercel() {
    echo "Deploying to Vercel..."
    vercel --prod
    echo "Deployment completed"
    echo ""
}

# Main flow
main() {
    check_env
    build_project
    migrate_database
    deploy_vercel
    
    echo "==========================================="
    echo "Deployment completed successfully!"
    echo "==========================================="
}

main
