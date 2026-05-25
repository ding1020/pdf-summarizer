#!/bin/bash
# Database Backup Script
# Usage: ./scripts/backup.sh [backup_name_suffix]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}_${1:-manual}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Starting database backup..."
echo "Backup name: ${BACKUP_NAME}"

# Extract database type from connection string
if [[ "$DATABASE_URL" == postgresql* ]]; then
    DB_TYPE="postgresql"
elif [[ "$DATABASE_URL" == mysql* ]]; then
    DB_TYPE="mysql"
elif [[ "$DATABASE_URL" == sqlite* ]]; then
    DB_TYPE="sqlite"
else
    DB_TYPE="unknown"
fi

case "$DB_TYPE" in
    postgresql)
        # PostgreSQL backup using pg_dump
        echo "Detected PostgreSQL database"
        pg_dump "$DATABASE_URL" -F c -f "${BACKUP_PATH}.dump"
        ;;
    mysql)
        # MySQL backup using mysqldump
        echo "Detected MySQL database"
        mysqldump "$DATABASE_URL" --single-transaction -r "${BACKUP_PATH}.sql"
        ;;
    sqlite)
        # SQLite backup by copying the file
        echo "Detected SQLite database"
        DB_PATH=$(echo "$DATABASE_URL" | sed 's|file:||')
        cp "${DB_PATH}" "${BACKUP_PATH}.db"
        ;;
    *)
        echo "Unknown database type, attempting Prisma migrate diff..."
        npx prisma migrate diff --from-url "$DATABASE_URL" --to-empty > "${BACKUP_PATH}.sql" || true
        ;;
esac

# Create metadata file
cat > "${BACKUP_PATH}.meta.json" << EOF
{
    "backupName": "${BACKUP_NAME}",
    "timestamp": "${TIMESTAMP}",
    "databaseType": "${DB_TYPE}",
    "createdAt": "$(date -Iseconds)",
    "retentionDays": ${RETENTION_DAYS}
}
EOF

# Compress the backup
echo "Compressing backup..."
tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}.dump" "${BACKUP_NAME}.meta.json" 2>/dev/null || \
tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}.sql" "${BACKUP_NAME}.meta.json" 2>/dev/null || \
tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}.db" "${BACKUP_NAME}.meta.json" 2>/dev/null || \
echo "Compression skipped"

# Clean up uncompressed files
rm -f "${BACKUP_PATH}.dump" "${BACKUP_PATH}.sql" "${BACKUP_PATH}.db" "${BACKUP_PATH}.meta.json"

# Calculate checksum
echo "Calculating checksum..."
sha256sum "${BACKUP_PATH}.tar.gz" > "${BACKUP_PATH}.sha256"

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "backup_*.sha256" -mtime +${RETENTION_DAYS} -delete

echo ""
echo "Backup completed successfully!"
echo "Backup file: ${BACKUP_PATH}.tar.gz"
echo "Checksum: $(cat ${BACKUP_PATH}.sha256)"
echo ""

# Upload to cloud storage (configure as needed)
if [ -n "$AWS_S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 cp "${BACKUP_PATH}.tar.gz" "s3://${AWS_S3_BUCKET}/backups/" --storage-class STANDARD_IA
    aws s3 cp "${BACKUP_PATH}.sha256" "s3://${AWS_S3_BUCKET}/backups/"
    echo "Uploaded to S3"
fi
