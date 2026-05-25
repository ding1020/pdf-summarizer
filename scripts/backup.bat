@echo off
REM Database Backup Script for Windows
REM Usage: backup.bat [backup_name_suffix]

setlocal enabledelayedexpansion

set BACKUP_DIR=%BACKUP_DIR% || set BACKUP_DIR=.\backups
set RETENTION_DAYS=%RETENTION_DAYS% || set RETENTION_DAYS=30
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=backup_%TIMESTAMP%_%~1
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%

if "%DATABASE_URL%"=="" (
    echo Error: DATABASE_URL environment variable is not set
    exit /b 1
)

echo Starting database backup...
echo Backup name: %BACKUP_NAME%

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM PostgreSQL backup using pg_dump
echo Detected PostgreSQL database
pg_dump "%DATABASE_URL%" -F c -f "%BACKUP_PATH%.dump"

REM Create metadata file
(
    echo {
    echo     "backupName": "%BACKUP_NAME%",
    echo     "timestamp": "%TIMESTAMP%",
    echo     "databaseType": "postgresql",
    echo     "createdAt": "%date% %time%",
    echo     "retentionDays": %RETENTION_DAYS%
    echo }
) > "%BACKUP_PATH%.meta.json"

REM Compress the backup
echo Compressing backup...
powershell -command "Compress-Archive -Path '%BACKUP_PATH%.dump','%BACKUP_PATH%.meta.json' -DestinationPath '%BACKUP_PATH%.zip' -Force"

REM Clean up uncompressed files
del /f /q "%BACKUP_PATH%.dump" "%BACKUP_PATH%.meta.json"

REM Calculate checksum
certutil -hashfile "%BACKUP_PATH%.zip" SHA256 > "%BACKUP_PATH%.sha256"

REM Clean up old backups
echo Cleaning up backups older than %RETENTION_DAYS% days...
forfiles /p "%BACKUP_DIR%" /s /m backup_*.zip /d -%RETENTION_DAYS% /c "cmd /c del /f /q @path"
forfiles /p "%BACKUP_DIR%" /s /m backup_*.sha256 /d -%RETENTION_DAYS% /c "cmd /c del /f /q @path"

echo.
echo Backup completed successfully!
echo Backup file: %BACKUP_PATH%.zip
echo.

REM Upload to cloud storage (configure as needed)
if defined AWS_S3_BUCKET (
    echo Uploading to S3...
    aws s3 cp "%BACKUP_PATH%.zip" "s3://%AWS_S3_BUCKET%/backups/"
    aws s3 cp "%BACKUP_PATH%.sha256" "s3://%AWS_S3_BUCKET%/backups/"
    echo Uploaded to S3
)

endlocal
