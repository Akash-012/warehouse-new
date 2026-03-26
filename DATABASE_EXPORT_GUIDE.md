# 📦 DATABASE EXPORT & IMPORT GUIDE

## Quick Answer: You MIGHT NOT NEED THIS!

**✅ The demo database is AUTO-CREATED on first backend startup!**

When you run `mvn spring-boot:run` for the first time, the Spring Boot application automatically:
1. Creates the `wms_db` database
2. Creates all tables via Flyway migration (V1-V5)
3. Seeds demo users and warehouse structure
4. Pre-populates inventory data

**You only need to export/import the database if:**
- You want to share a database snapshot with others
- You want to backup your current demo data
- You want to skip the auto-seeding process

---

## METHOD 1: EXPORT LIVE DATABASE (Recommended for Sharing)

### Prerequisites
- Backend must be running (database created and seeded)
- MySQL must be in your system PATH

### Quick Export Command

**Windows PowerShell:**
```powershell
# Navigate to project root
cd D:\warehouse-new

# Export the database
mysqldump -u root -p wms_db > wms_db_demo.sql
# Enter MySQL password when prompted

# File will be created: wms_db_demo.sql
```

**macOS / Linux:**
```bash
cd /path/to/warehouse-new
mysqldump -u root -p wms_db > wms_db_demo.sql
# Enter password when prompted
```

### Add MySQL to PATH (if command not found)

**Windows - Add MySQL bin folder to PATH:**

If you get "mysqldump: command not found", add MySQL to your system PATH:

1. Find your MySQL installation:
   - Usually: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
   
2. Add to Windows PATH:
   - Open `System Properties` → `Environment Variables`
   - Edit the `PATH` system variable
   - Add: `;C:\Program Files\MySQL\MySQL Server 8.0\bin`
   - Restart terminal and try again

Or use full path in one command:
```powershell
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump" -u root -p wms_db > wms_db_demo.sql
```

---

## METHOD 2: MANUAL EXPORT USING MYSQL SHELL

If `mysqldump` doesn't work, use the MySQL command-line client:

```powershell
# Open MySQL shell
mysql -u root -p

# Inside MySQL shell:
mysql> USE wms_db;
mysql> SOURCE C:\path\to\warehouse-new\export.sql;

# Or create a dump through MySQL Workbench GUI
```

---

## METHOD 3: BACKUP VIA MYSQL WORKBENCH (GUI Method)

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Right-click `wms_db` → `Data Export`
4. Select all tables
5. Choose export options:
   - ✅ Export to Self-Contained File
   - ✅ Include Create Database statement
6. Click `Start Export`
7. Save as: `wms_db_demo.sql`

---

## IMPORT DATABASE TO NEW PC

### Method 1: Direct Import Command (Recommended)

**Windows PowerShell:**
```powershell
# First ensure MySQL is running
net start MySQL80

# Then import the dump file
mysql -u root -p < wms_db_demo.sql
# Enter password when prompted
```

**macOS / Linux:**
```bash
mysql -u root -p < wms_db_demo.sql
# Enter password when prompted
```

### Method 2: Step-by-Step Import

```powershell
# Connect to MySQL
mysql -u root -p

# Inside MySQL shell:
mysql> CREATE DATABASE IF NOT EXISTS wms_db;
mysql> USE wms_db;
mysql> SOURCE C:\path\to\warehouse-new\wms_db_demo.sql;
mysql> EXIT;
```

### Method 3: Via MySQL Workbench (GUI)

1. Open MySQL Workbench
2. Connect to server
3. Go to `Server` → `Data Import`
4. Select `Import from Self-Contained File`
5. Choose `wms_db_demo.sql`
6. Click `Start Import`
7. Done! Database is restored

---

## WHAT'S IN THE DATABASE DUMP?

### Tables (Created by Flyway migrations V1-V5)
- `users` - Demo user accounts
- `roles` - Admin, Supervisor, Picker, etc.
- `permissions` - Feature access controls
- `zone` - Warehouse zones
- `aisle` - Aisles within zones
- `rack` - Racks within aisles
- `bin` - Bins on racks
- `sku` - Stock Keeping Units (products)
- `inventory` - Stock levels per bin
- `orders` - Sales orders
- `order_items` - Items in each order
- `inbound_receipt` - Receiving transactions
- `picking_wave` - Batch picking assignments
- `shipping_batch` - Shipment consolidation

### Demo Data
- **Users:** admin, supervisor, wh_manager, picker (all password: `password123`)
- **Warehouse:** 2 zones, 10 aisles, 50+ racks, 500+ bins
- **Products:** ~100 SKUs with sample inventory
- **Orders:** Sample orders for testing workflows

---

## COMMON ISSUES & SOLUTIONS

### ❌ "mysqldump: command not found"
```powershell
# Use full path
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump" -u root -p wms_db > wms_db_demo.sql

# Or add to PATH permanently
```

### ❌ "Access denied for user 'root'@'localhost'"
```powershell
# Make sure you enter correct MySQL password
mysqldump -u root -p wms_db > wms_db_demo.sql
# Enter the password you set during MySQL install
```

### ❌ "Unknown database 'wms_db'"
```powershell
# Database doesn't exist yet. Start backend first:
cd D:\warehouse-new\backend
mvn spring-boot:run
# Wait for "Started WmsApplication"
# Then try export again
```

### ❌ "File already exists" when importing
```powershell
# Drop existing database first
mysql -u root -p -e "DROP DATABASE wms_db; CREATE DATABASE wms_db;"

# Then import
mysql -u root -p wms_db < wms_db_demo.sql
```

### ❌ "Permission denied" writing to file
```powershell
# Use full path and ensure you have write permissions
mysqldump -u root -p wms_db > C:\Users\YourUsername\Desktop\wms_db_demo.sql
```

---

## FILE SIZES & TRANSFER

| File | Size | Notes |
|------|------|-------|
| `wms_db_demo.sql` | ~2-5 MB | Complete database dump |
| Compressed (.zip) | ~200-500 KB | Much easier to transfer |
| Plain database files | ~50-100 MB | Don't use for sharing |

**For sharing via internet/email:**
1. Export: `mysqldump -u root -p wms_db > wms_db_demo.sql`
2. Compress: Right-click file → Send to → Compressed (Zipped)
3. Share the .zip file (much smaller)
4. Recipient extracts and imports

---

## BACKUP STRATEGY

### Daily Backups (recommended for production)
```powershell
# Windows batch script (save as backup.bat)
@echo off
FOR /F "tokens=2-4 delims=/ " %%a IN ('date /t') DO (set mydate=%%c-%%a-%%b)
mysqldump -u root -p wms_db > "D:\Backups\wms_db_%mydate%.sql"
```

### Automated with Windows Task Scheduler
1. Create the batch script above
2. Open Task Scheduler
3. Create Basic Task
4. Set trigger (daily at 2 AM)
5. Set action (run backup.bat)

### Cloud Backup (for production)
- Export to AWS S3
- Azure Blob Storage
- Google Cloud Storage
- Dropbox or OneDrive

---

## VERIFY IMPORT SUCCESS

After importing, verify the database:

```powershell
mysql -u root -p

# Inside MySQL shell:
mysql> USE wms_db;
mysql> SHOW TABLES;
# Should show 15+ tables

mysql> SELECT COUNT(*) FROM users;
# Should show: 4+ demo users

mysql> SELECT COUNT(*) FROM sku;
# Should show: 100+ products

mysql> EXIT;
```

---

## QUICK REFERENCE COMMANDS

```powershell
# Export with timestamp
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
mysqldump -u root -p wms_db > "wms_db_$date.sql"

# Import with confirmation message
mysql -u root -p wms_db < wms_db_demo.sql && echo "Database imported successfully!"

# Export only structure (no data)
mysqldump -u root -p --no-data wms_db > wms_db_schema.sql

# Export only data (no structure)
mysqldump -u root -p --no-create-info wms_db > wms_db_data.sql

# Export to compressed format
mysqldump -u root -p wms_db | gzip > wms_db_demo.sql.gz

# View database size
mysql -u root -p -e "SELECT table_schema, ROUND(SUM(data_length+index_length)/1024/1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema='wms_db' GROUP BY table_schema;"
```

---

## TROUBLESHOOTING IMPORT ISSUES

### Issue: "Syntax error near line X"
**Solution:**
- File might be corrupted
- Try re-exporting from source
- Check file encoding is UTF-8

### Issue: "Duplicate entry for key"
**Solution:**
- Drop and recreate database:
```powershell
mysql -u root -p -e "DROP DATABASE wms_db; CREATE DATABASE wms_db;"
mysql -u root -p wms_db < wms_db_demo.sql
```

### Issue: Partial import (some tables missing)
**Solution:**
- Check for errors in output:
```powershell
mysql -u root -p wms_db < wms_db_demo.sql 2>&1 | Tee-Object -FilePath import_log.txt
```
- Review import_log.txt for errors

---

## SHARE DATABASE WITH TEAM

### Recommended Approach:
1. **Export:** `mysqldump -u root -p wms_db > wms_db_demo.sql`
2. **Compress:** Zip the file
3. **Share:** Email, onedrive, Google Drive, or Git
4. **Recipient imports:** `mysql -u root -p wms_db < wms_db_demo.sql`

### Include in Project Repository:
```
warehouse-new/
├── README.md
├── SETUP_GUIDE_NEW_PC.md
├── DATABASE_EXPORT_GUIDE.md
├── wms_db_demo.sql              ← Database dump
├── backend/
└── frontend/
```

---

## ⚠️ IMPORTANT NOTES FOR PRODUCTION

**DO NOT use these methods for production databases:**
- No encryption in transit
- No compression in this guide
- Passwords visible in command history
- No backup scheduling

**For production, use:**
- Automated backup services (AWS RDS, Azure Database)
- Encryption at rest and in transit
- Version control for schema changes only
- Regular restore testing

---

## 📧 SUPPORT

For database issues, check:
1. MySQL is running: `Get-Service MySQL80`
2. MySQL port is correct: `netstat -ano | findstr :3306`
3. Credentials are correct
4. Disk space is available
5. File permissions are correct

---

**Last Updated:** March 26, 2026
**Database Version:** v1.0-demo
