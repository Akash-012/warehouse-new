# 📋 COMPLETE SETUP GUIDE FOR NEW PC
## Warehouse Management System (WMS) - Full Installation & Setup

---

## 📑 TABLE OF CONTENTS
1. [Part 1: Install Prerequisites](#part-1-install-prerequisites)
2. [Part 2: Project Setup](#part-2-project-setup)
3. [Part 3: Database Setup](#part-3-database-setup)
4. [Part 4: Backend Setup](#part-4-backend-setup)
5. [Part 5: Frontend Setup](#part-5-frontend-setup)
6. [Part 6: Access the Application](#part-6-access-the-application)
7. [Quick Terminal Layout](#quick-terminal-layout)
8. [Troubleshooting](#troubleshooting)
9. [Technology Stack](#technology-stack)

---

## PART 1: INSTALL PREREQUISITES
### (on a new PC - install in this order)

### 1.1 Java 21 JDK
1. Download: https://adoptium.net/temurin/releases/?version=21
2. Run the installer and complete the setup
3. Verify installation:
   ```powershell
   java -version
   ```
   Should show: `openjdk version "21.x.x"`

4. **Set `JAVA_HOME` environment variable:**
   - Open `System Properties` → `Environment Variables`
   - Click `New` under `System Variables`
   - Name: `JAVA_HOME`
   - Value: `C:\Program Files\Eclipse Adoptium\jdk-21.x.x` (or your JDK installation path)
   - Click OK

5. **Add to `PATH` variable:**
   - Edit `PATH` system variable
   - Add new entry: `;%JAVA_HOME%\bin`
   - Click OK and restart terminal

---

### 1.2 Apache Maven 3.9+
1. Download: https://maven.apache.org/download.cgi (Binary zip)
2. Extract to: `C:\tools\maven` (or your preferred location)
3. **Set up environment variable:**
   - Add new System Variable:
     - Name: `M2_HOME`
     - Value: `C:\tools\maven`
   - Add to `PATH`: `;%M2_HOME%\bin`

4. **Verify:**
   ```powershell
   mvn -version
   ```
   Should show: `Apache Maven 3.9.x`

---

### 1.3 Node.js 18+ LTS
1. Download: https://nodejs.org/en/download/
2. Run the installer (includes npm automatically)
3. **Verify:**
   ```powershell
   node -v    # should be 18.x or higher
   npm -v     # should be 9.x or higher
   ```

---

### 1.4 MySQL 8.0+
1. Download: https://dev.mysql.com/downloads/mysql/
2. Run installer with these settings:
   - **MySQL Server 8.0** - Standard System Configure
   - **MySQL Port**: `3306`
   - **Set root password** (or leave blank for local development)
   - **Start MySQL as Windows Service** ✓ (CHECK THIS)

3. **Test connection:**
   ```powershell
   # Start MySQL service
   net start MySQL80

   # Test connection
   mysql -u root -p
   # Enter password (or just press Enter if no password)
   # Should show: mysql>
   exit
   ```

**✅ ALL PREREQUISITES INSTALLED - Ready for next step!**

---

## PART 2: PROJECT SETUP

### 2.1 Extract/Receive the Project
Choose one:

**Option A - Extract ZIP folder:**
```powershell
# Extract the warehouse-new.zip file to your preferred location
# For this guide, we'll use: D:\
cd D:\
# Extract here
```

**Option B - Clone from Git:**
```powershell
cd D:\
git clone <repository-url> warehouse-new
cd warehouse-new
```

### 2.2 Verify Project Structure
```powershell
cd D:\warehouse-new
dir   # Should show: backend, frontend, README.md, SETUP_GUIDE_NEW_PC.md
```

---

## PART 3: DATABASE SETUP

### 3.1 Start MySQL Service
```powershell
# Windows PowerShell (Admin)
net start MySQL80

# Verify connection
mysql -u root -p
# Press Ctrl+D or type 'exit' to close
```

### 3.2 Database Auto-Creation
- ✅ The database `wms_db` will be **created automatically** on first backend startup
- This is configured in the connection URL: `createDatabaseIfNotExist=true`
- **No manual SQL needed!**

---

## PART 4: BACKEND SETUP

### 4.1 Navigate to Backend
```powershell
cd D:\warehouse-new\backend
```

### 4.2 Create Environment File
```powershell
# Windows PowerShell
copy .env.example .env

# Or use the file explorer:
# 1. Copy .env.example
# 2. Paste and rename to .env
```

### 4.3 Edit `.env` File
Open the `.env` file with Notepad or VS Code and update:

```env
# ──────────────────────────────────────────
# Database Configuration
# ──────────────────────────────────────────
DB_URL=jdbc:mysql://localhost:3306/wms_db?createDatabaseIfNotExist=true
DB_USERNAME=root
DB_PASSWORD=        # Leave empty if no MySQL password set, OR enter your password

# ──────────────────────────────────────────
# JWT Authentication
# ──────────────────────────────────────────
# Keep this default for development or generate a new 64+ character string for production
JWT_SECRET=a2c4e6f8h1k3m5n7p9r2s4v6y8z1b3d5g7j9l1o3q5w7e9z1x3c5v7b9m2k4
JWT_EXPIRATION_MS=86400000

# ──────────────────────────────────────────
# Server Configuration
# ──────────────────────────────────────────
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:3000

# ──────────────────────────────────────────
# Database & JPA Settings (Keep defaults)
# ──────────────────────────────────────────
JPA_DDL_AUTO=update
JPA_SHOW_SQL=false
JPA_FORMAT_SQL=false
DB_POOL_SIZE=20
```

**Save the file** (Ctrl+S)

### 4.4 First-Time Build (Downloads ~500MB dependencies)
```powershell
cd D:\warehouse-new\backend
mvn clean install
```

⏳ This will take **2-5 minutes** - dependencies are downloaded only once.

### 4.5 Run Backend
```powershell
# From D:\warehouse-new\backend
mvn spring-boot:run
```

**Wait for this message:**
```
Started WmsApplication in X.XXX seconds
Tomcat started on port 8080
```

✅ **Backend is now running at: http://localhost:8080**

✅ **Database `wms_db` created automatically**

✅ **Demo data seeded to database**

---

## PART 5: FRONTEND SETUP
### (Open a NEW terminal window - keep backend running in Terminal 1)

### 5.1 Navigate to Frontend
```powershell
cd D:\warehouse-new\frontend
```

### 5.2 Create Environment File
```powershell
# Windows PowerShell
copy .env.example .env.local
```

### 5.3 Edit `.env.local` File
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**Save the file** (Ctrl+S)

### 5.4 Install Dependencies
```powershell
# From D:\warehouse-new\frontend
npm install
```

⏳ This will take **1-2 minutes** - node_modules downloaded only once.

### 5.5 Run Frontend Development Server
```powershell
npm run dev
```

**Wait for this message:**
```
▲ Next.js 16.2.0
- Local:        http://localhost:3000
```

✅ **Frontend is now running at: http://localhost:3000**

---

## PART 6: ACCESS THE APPLICATION

### 6.1 Open in Browser
1. Open your web browser (Chrome, Firefox, Edge, Safari)
2. Navigate to: **http://localhost:3000**

### 6.2 Login with Demo Credentials
Use one of these accounts to log in:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `password123` |
| Supervisor | `supervisor` | `password123` |
| Warehouse Manager | `wh_manager` | `password123` |
| Picking Associate | `picker` | `password123` |

### 6.3 You Should See
- ✅ Warehouse Management System Dashboard
- ✅ Sidebar with navigation menu
- ✅ Modules: Dashboard, Inbound, Inventory, Picking, Packing, Shipping, Reports, etc.

🎉 **SETUP COMPLETE!**

---

## QUICK TERMINAL LAYOUT

### Best Practice: Use Two Terminal Windows

**Terminal 1 — Backend (Keep Running):**
```powershell
cd D:\warehouse-new\backend
mvn spring-boot:run
```

**Terminal 2 — Frontend (Keep Running):**
```powershell
cd D:\warehouse-new\frontend
npm run dev
```

**Browser:**
```
http://localhost:3000
```

---

## ENVIRONMENT VARIABLES REFERENCE

### Backend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `jdbc:mysql://localhost:3306/wms_db?createDatabaseIfNotExist=true` | Full JDBC MySQL connection URL |
| `DB_USERNAME` | `root` | MySQL username |
| `DB_PASSWORD` | _(empty)_ | MySQL password |
| `DB_POOL_SIZE` | `20` | HikariCP connection pool size |
| `JWT_SECRET` | _(long key)_ | **⚠️ Change in production!** Min 64 chars |
| `JWT_EXPIRATION_MS` | `86400000` | Token lifetime in milliseconds (24 hours) |
| `SERVER_PORT` | `8080` | Backend HTTP port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed frontend URLs |
| `JPA_DDL_AUTO` | `update` | Hibernate DDL mode (`update` / `validate` / `none`) |
| `JPA_SHOW_SQL` | `false` | Log SQL queries to console |

### Frontend (`.env.local`)

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend base URL (must have `NEXT_PUBLIC_` prefix) |

---

## TROUBLESHOOTING

### ❌ "java: command not found"
**Solution:**
- Verify `JAVA_HOME` is set correctly
  ```powershell
  echo $env:JAVA_HOME   # Should show your JDK path
  ```
- Restart your terminal after setting environment variables
- If still failing, restart your PC

---

### ❌ "mvn: command not found"
**Solution:**
- Verify Maven `bin` folder is in `PATH`
  ```powershell
  where mvn   # Should show Maven path
  ```
- Check `M2_HOME` is set:
  ```powershell
  echo $env:M2_HOME
  ```
- Restart terminal and/or PC

---

### ❌ "MySQL connection refused"
**Solution:**
```powershell
# Check if MySQL service is running
Get-Service MySQL80

# If it's not running, start it
net start MySQL80

# Or check error logs:
# C:\ProgramData\MySQL\MySQL Server 8.0\Data\
```

---

### ❌ "Port 8080 already in use"
**Solution 1 - Change backend port:**
- Edit `.env`: Change `SERVER_PORT=8080` to `SERVER_PORT=8081`
- Restart backend

**Solution 2 - Kill process using port 8080:**
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

---

### ❌ "Port 3000 already in use"
**Solution:**
```powershell
# Run frontend on different port
npm run dev -- -p 3001

# Then access at: http://localhost:3001
```

---

### ❌ "npm ERR! ERESOLVE unable to resolve dependency"
**Solution:**
```powershell
cd D:\warehouse-new\frontend
npm install --force
```

---

### ❌ "Frontend can't reach backend / 404 errors"
**Solution:**
- Check `.env.local` has correct URL:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:8080
  ```
- Verify backend is running:
  ```powershell
  curl http://localhost:8080/actuator/health
  # Should return: {"status":"UP"}
  ```

---

### ❌ "Database is locked / Connection timeout"
**Solution:**
```powershell
# Restart MySQL service
net stop MySQL80
net start MySQL80

# Wait 5 seconds then restart backend
mvn spring-boot:run
```

---

### ❌ "Can't log in / Invalid credentials"
**Solution:**
- Use demo credentials from Step 6.2 above
- If database didn't seed, delete folder and rebuild:
  ```powershell
  cd backend
  mvn clean install   # This recreates everything
  ```

---

## TECHNOLOGY STACK

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend** | Spring Boot | 3.3 |
| **Java Runtime** | OpenJDK | 21 |
| **Database** | MySQL | 8.0+ |
| **ORM** | Hibernate / JPA | Latest |
| **Security** | Spring Security + JWT | jjwt 0.12.5 |
| **Build Tool** | Maven | 3.9+ |
| **Frontend Framework** | Next.js | 16.2 |
| **React** | React | 19.2 |
| **UI Components** | Tailwind CSS + shadcn/ui | 4 / Latest |
| **State Management** | React Query (TanStack) | 5.91 |
| **HTTP Client** | Axios | 1.13+ |
| **Forms** | React Hook Form + Zod | Latest |
| **Charts** | Recharts | 3.8 |
| **Node Package Manager** | npm | 9+ |

---

## FEATURES & MODULES

### ✅ Core Features
- **User Management** - Admin panel, role-based access
- **Inbound Operations** - Receiving, putaway management
- **Inventory Management** - Stock levels, bin tracking
- **Picking & Packing** - Order fulfillment workflow
- **Shipping Management** - Label generation, batch shipping
- **Warehouse Structure** - Zones, aisles, racks, bins
- **Reports & Analytics** - KPI dashboards
- **Real-time Updates** - WebSocket support

### 🔐 Security
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Permission matrix system
- Secure password hashing
- CORS protection

---

## ADDITIONAL COMMANDS

### Backend Utility Commands

**View logs in real-time:**
```powershell
mvn spring-boot:run | tee app.log
```

**Build without running:**
```powershell
cd backend
mvn clean package -DskipTests
```

**Run from compiled JAR:**
```powershell
cd backend/target
java -jar wms-0.0.1-SNAPSHOT.jar
```

### Frontend Utility Commands

**Build for production:**
```powershell
cd frontend
npm run build
npm start
```

**Run linter (check for code issues):**
```powershell
npm run lint
```

---

## PRODUCTION BUILD (Optional)

### Backend Production Build
```powershell
cd backend
mvn clean package
cd target
java -jar wms-0.0.1-SNAPSHOT.jar
```

### Frontend Production Build
```powershell
cd frontend
npm run build
npm start
```

---

## DATABASE EXPORT & IMPORT

### Export current database for backup:
```powershell
mysqldump -u root -p wms_db > wms_db_backup.sql
```

### Import database from file:
```powershell
mysql -u root -p wms_db < wms_db_backup.sql
```

---

## NEXT STEPS AFTER SETUP

1. ✅ Explore the dashboard
2. ✅ Create test users and assignments
3. ✅ Configure warehouse structure (zones, bins)
4. ✅ Add SKUs and stock items
5. ✅ Test picking, packing, and shipping workflows
6. ✅ Review reports and KPIs

---

## SUPPORT & DOCUMENTATION

- **Backend API Docs:** http://localhost:8080/swagger-ui.html
- **GitHub Issues:** (link to repo)
- **Main README:** See `README.md` in project root

---

## 🎉 YOU'RE ALL SET!

**Quick checklist before declaring success:**

- [ ] Java 21 installed and JAVA_HOME set
- [ ] Maven 3.9+ installed and M2_HOME set
- [ ] Node.js 18+ installed
- [ ] MySQL 8.0+ running
- [ ] Backend `.env` file created and updated
- [ ] Backend running on http://localhost:8080
- [ ] Frontend `.env.local` file created and updated
- [ ] Frontend running on http://localhost:3000
- [ ] Can log in with demo credentials
- [ ] Can see dashboard and navigate modules

---

**Last Updated:** March 26, 2026

**Document Version:** 1.0

---

### 📧 Have questions?
Contact: [Your contact info here]

### 🐛 Found a bug?
Report it in the GitHub Issues or contact the development team.

