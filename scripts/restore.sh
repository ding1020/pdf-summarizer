#!/bin/bash
# Database Restore Script
# Usage: ./scripts/restore.sh [backup_name]

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_name>"
    echo ""
    echo "Available backups:"
    ls -la ./backups/ | grep -E "\.zip$|\.tar\.gz$" || echo "No backups found"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_DIR="./backups"

# Determine backup format
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" ]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo "Extracting tar.gz archive..."
    tar -xzf "${BACKUP_FILE}" -C "${BACKUP_DIR}"
    EXTRACTED_NAME=$(basename "${BACKUP_NAME}" .tar.gz)
elif [ -f "${BACKUP_DIR}/${BACKUP_NAME}.zip" ]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.zip"
    echo "Extracting zip archive..."
    unzip -o "${BACKUP_FILE}" -d "${BACKUP_DIR}"
    EXTRACTED_NAME="${BACKUP_NAME}"
else
    echo "Error: Backup file not found: ${BACKUP_NAME}"
    exit 1
fi

# Find the database dump file
if [ -f "${BACKUP_DIR}/${EXTRACTED_NAME}.dump" ]; then
    DUMP_FILE="${BACKUP_DIR}/${EXTRACTED_NAME}.dump"
elif [ -f "${BACKUP_DIR}/${EXTRACTED_NAME}.sql" ]; then
    DUMP_FILE="${BACKUP_DIR}/${EXTRACTED_NAME}.sql"
elif [ -f "${BACKUP_DIR}/${EXTRACTED_NAME}.db" ]; then
    DUMP_FILE="${BACKUP_DIR}/${EXTRACTED_NAME}.db"
else
    echo "Error: Database dump file not found in backup"
    exit 1
fi

# Verify checksum
if [ -f "${BACKUP_DIR}/${EXTRACTED_NAME}.sha256" ]; then
    echo "Verifying checksum..."
    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        sha256sum -c "${BACKUP_DIR}/${EXTRACTED_NAME}.sha256"
    else
        certutil -hashfile "${BACKUP_FILE}" SHA256 | findstr /i "$(cat ${BACKUP_DIR}/${EXTRACTED_NAME}.sha256)"
    fi
    echo "Checksum verified"
fi

echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Determine database type
if [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "Restoring PostgreSQL database..."
    pg_restore --clean --if-exists --dbname "$DATABASE_URL" "$DUMP_FILE"
elif [[ "$DATABASE_URL" == mysql* ]]; then
    echo "Restoring MySQL database..."
    mysql "$DATABASE_URL" < "$DUMP_FILE"
elif [[ "$DUMP_FILE" == *.db ]]; then
    echo "Restoring SQLite database..."
    DB_PATH=$(echo "$DATABASE_URL" | sed 's|file:||')
    cp "$DUMP_FILE" "$DB_PATH"
else
    echo "Unknown database type"
    exit 1
fi

# Clean up extracted files
rm -f "${BACKUP_DIR}/${EXTRACTED_NAME}.dump" "${BACKUP_DIR}/${EXTRACTED_NAME}.sql" "${BACKUP_DIR}/${EXTRACTED_NAME}.db" "${BACKUP_DIR}/${EXTRACTED_NAME}.meta.json"

echo ""
echo "Database restore completed successfully!"
