# WMS Pro — Warehouse Management System

A full-stack Warehouse Management System built with **Spring Boot 3.3** (backend) and **Next.js 16** (frontend).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Quick Start (New System Setup)](#quick-start-new-system-setup)
   - [Step 1 — Install Prerequisites](#step-1--install-prerequisites)
   - [Step 2 — Clone / Extract Project](#step-2--clone--extract-project)
   - [Step 3 — MySQL Setup](#step-3--mysql-setup)
   - [Step 4 — Backend Setup](#step-4--backend-setup)
   - [Step 5 — Frontend Setup](#step-5--frontend-setup)
   - [Step 6 — Run Both Servers](#step-6--run-both-servers)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Demo Credentials](#demo-credentials)
7. [Role-Based Access Control](#role-based-access-control)
8. [API Reference](#api-reference)
9. [Database — Export & Import](#database--export--import)
10. [Production Build](#production-build)

---

## Tech Stack

| Layer    | Technology                                      | Version  |
|----------|-------------------------------------------------|----------|
| Backend  | Java + Spring Boot                              | 21 / 3.3 |
| Security | Spring Security + JWT (jjwt)                    | 0.12.5   |
| Database | MySQL                                           | 8.0+     |
| ORM      | Hibernate / Spring Data JPA                     | —        |
| Frontend | Next.js (React 19)                              | 16.2     |
| UI       | Tailwind CSS v4 + shadcn/ui + Radix UI          | —        |
| HTTP     | Axios                                           | —        |
| Forms    | React Hook Form + Zod                           | —        |
| Charts   | Recharts                                        | —        |

---

## Prerequisites

Install the following on the new machine **before** doing anything else.

### 1. Java 17 (JDK)

- Download: https://adoptium.net/temurin/releases/?version=17
- After install, verify:
  ```bash
  java -version
  # openjdk version "17.x.x" ...
  ```
- Set `JAVA_HOME` environment variable to the JDK folder.

### 2. Apache Maven 3.9+

- Download: https://maven.apache.org/download.cgi
- Extract to a folder (e.g. `C:\tools\maven`)
- Add `<maven_folder>\bin` to system `PATH`
- Verify:
  ```bash
  mvn -version
  # Apache Maven 3.9.x ...
  ```

### 3. Node.js 18+ (LTS)

- Download: https://nodejs.org/en/download
- Verify:
  ```bash
  node -v   # v18.x.x or higher
  npm -v    # 9.x.x or higher
  ```

### 4. MySQL 8.0+

- Download: https://dev.mysql.com/downloads/mysql/
- During install, set a root password (or leave blank for local dev)
- Verify:
  ```bash
  mysql -u root -p
  # Enter password → should open MySQL shell
  ```

---

## Project Structure

```
warehouse-new/
├── backend/                  ← Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/warehouse/wms/
│   │   │   │   ├── config/       Security, JWT filter, CORS, DataInitializer
│   │   │   │   ├── controller/   REST endpoints (12 modules)
│   │   │   │   ├── dto/          Request/Response objects
│   │   │   │   ├── entity/       JPA entities + Role/Permission enums
│   │   │   │   ├── repository/   Spring Data JPA repositories
│   │   │   │   └── service/      Business logic
│   │   │   └── resources/
│   │   │       ├── application.yml   Main config (reads env vars)
│   │   │       └── db/migration/     SQL schema files (V1–V5)
│   ├── .env.example          ← Copy to .env and fill in values
│   └── pom.xml
│
├── frontend/                 ← Next.js application
│   ├── src/
│   │   ├── app/              Pages (login, dashboard, inbound, etc.)
│   │   ├── components/       Reusable UI components + shadcn/ui
│   │   └── lib/
│   │       ├── api.ts        Axios instance (reads NEXT_PUBLIC_API_URL)
│   │       ├── permissions.js Permission constants + role matrix
│   │       └── hooks/        usePermissions, usePickingSession
│   ├── .env.example          ← Copy to .env.local and fill in values
│   └── package.json
│
└── README.md
```

---

## Quick Start (New System Setup)

### Step 1 — Install Prerequisites

Follow the [Prerequisites](#prerequisites) section above. Make sure `java`, `mvn`, `node`, `npm`, and `mysql` are all available in your terminal.

---

### Step 2 — Clone / Extract Project

**If using Git:**
```bash
git clone <repository-url> warehouse-new
cd warehouse-new
```

**If using a ZIP:**
```bash
# Extract the ZIP, then open a terminal inside the extracted folder
cd warehouse-new
```

---

### Step 3 — MySQL Setup

#### Option A — Let the app create the database automatically (recommended)

The database `wms_db` will be created automatically on first startup because the DB URL includes `createDatabaseIfNotExist=true`.

Just make sure MySQL is running:

**Windows:**
```powershell
# Start MySQL service
net start MySQL80
```

**macOS / Linux:**
```bash
sudo service mysql start
# or
brew services start mysql
```

#### Option B — Import a provided database dump

If you have received a `wms_db_dump.sql` file:

```bash
# Create the database first
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS wms_db;"

# Import the dump
mysql -u root -p wms_db < wms_db_dump.sql
```

To **export** the current database for sharing:
```bash
mysqldump -u root -p wms_db > wms_db_dump.sql
```

---

### Step 4 — Backend Setup

#### 4.1 — Configure environment variables

```bash
cd backend
copy .env.example .env      # Windows
# OR
cp .env.example .env        # macOS / Linux
```

Edit `.env` and fill in your values:

```env
DB_URL=jdbc:mysql://localhost:3306/wms_db?createDatabaseIfNotExist=true
DB_USERNAME=root
DB_PASSWORD=your_mysql_password_here
JWT_SECRET=replace_with_a_long_random_secret_string_minimum_64_characters
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

> **Note:** Spring Boot reads environment variables set in your OS or shell session. You can set them before running `mvn` or export them permanently.

#### 4.2 — Set environment variables in your shell (Windows PowerShell)

```powershell
# Load all values from backend/.env into current process
Set-Location D:\path\to\warehouse-new\backend
Get-Content .env |
  Where-Object { $_ -and -not $_.StartsWith('#') } |
  ForEach-Object {
    $parts = $_ -split '=',2
    if ($parts.Length -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
  }

# Ensure Java 17 is used
$env:JAVA_HOME = "C:\\path\\to\\jdk-17"

# Keep AI off for local dev and avoid startup key errors
$env:APP_AI_ENABLED = "false"
if (-not $env:SPRING_AI_OPENAI_API_KEY) {
  $env:SPRING_AI_OPENAI_API_KEY = "disabled-local-key"
}
```

**macOS / Linux (bash/zsh):**
```bash
export DB_USERNAME=root
export DB_PASSWORD=your_password
export JWT_SECRET=your_jwt_secret
export SERVER_PORT=8080
export CORS_ALLOWED_ORIGINS=http://localhost:3000
```

#### 4.3 — Run the backend

**Windows PowerShell (with JAVA_HOME set):**
```powershell
# From repo root (recommended):
taskkill /F /IM java.exe /T > $null 2>&1
& 'D:\path\to\warehouse-new\tools\apache-maven-3.9.6\bin\mvn.cmd' -f 'D:\path\to\warehouse-new\backend\pom.xml' spring-boot:run

# If mvn is available in PATH, you can also run:
# Set-Location D:\path\to\warehouse-new\backend
# mvn spring-boot:run
```

**macOS / Linux:**
```bash
cd /path/to/warehouse-new/backend
mvn spring-boot:run
```

You should see:
```
Started WmsApplication in X.XXX seconds
Tomcat started on port 8080
```

On first run, `DataInitializer` automatically seeds:
- Warehouse structure (zones, aisles, racks, bins)
- SKUs and inventory
- Demo users (see [Demo Credentials](#demo-credentials))

---

### Step 5 — Frontend Setup

#### 5.1 — Configure environment variables

```bash
cd frontend
copy .env.example .env.local      # Windows
# OR
cp .env.example .env.local        # macOS / Linux
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

If your backend runs on a different host or port, update this accordingly.

#### 5.2 — Install dependencies

```bash
cd frontend
npm install
```

#### 5.3 — Run the frontend

```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 16.2.0
- Local:        http://localhost:3000
```

---

### Step 6 — Run Both Servers

Open **two terminal windows** (or two VS Code terminal panels):

**Terminal 1 — Backend:**
```powershell
# Windows PowerShell (repo root)
Set-Location D:\path\to\warehouse-new\backend
Get-Content .env |
  Where-Object { $_ -and -not $_.StartsWith('#') } |
  ForEach-Object {
    $parts = $_ -split '=',2
    if ($parts.Length -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
  }
$env:JAVA_HOME = "C:\\path\\to\\jdk-17"
$env:APP_AI_ENABLED = "false"
if (-not $env:SPRING_AI_OPENAI_API_KEY) { $env:SPRING_AI_OPENAI_API_KEY = "disabled-local-key" }
& 'D:\path\to\warehouse-new\tools\apache-maven-3.9.6\bin\mvn.cmd' spring-boot:run
```

**Terminal 2 — Frontend:**
```powershell
cd D:\path\to\warehouse-new\frontend
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## Environment Variables Reference

### Backend (`backend/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/wms_db?createDatabaseIfNotExist=true` | Full JDBC connection URL |
| `DB_USERNAME` | `root` | MySQL username |
| `DB_PASSWORD` | _(empty)_ | MySQL password |
| `DB_POOL_SIZE` | `20` | HikariCP max pool size |
| `JWT_SECRET` | _(default key)_ | **Change in production!** Min 64 chars |
| `JWT_EXPIRATION_MS` | `86400000` | Token lifetime in ms (default: 24h) |
| `SERVER_PORT` | `8080` | Backend HTTP port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Comma-separated allowed origins |
| `JPA_DDL_AUTO` | `update` | Hibernate DDL mode (`update` / `validate` / `none`) |
| `JPA_SHOW_SQL` | `false` | Log SQL queries to console |

### Frontend (`frontend/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend base URL (must start with `NEXT_PUBLIC_`) |

---

## Demo Credentials

On first startup, the backend automatically creates these four users:

| Role | Username | Password | Access |
|---|---|---|---|
| **Super Admin** | `superadmin` | `superadmin123` | All permissions |
| **Admin** | `admin` | `admin123` | All except user management |
| **Manager** | `manager` | `manager123` | Operations — no master data |
| **Worker** | `worker` | `worker123` | Floor ops only |

These are also shown as clickable rows in the login page.

---

## Role-Based Access Control

The system uses Spring Security `@PreAuthorize` with granular permission constants.

### Permission Matrix

| Permission | Super Admin | Admin | Manager | Worker |
|---|:---:|:---:|:---:|:---:|
| DASHBOARD_VIEW | ✓ | ✓ | ✓ | — |
| INBOUND_VIEW | ✓ | ✓ | ✓ | — |
| INBOUND_RECEIVE | ✓ | ✓ | ✓ | — |
| INVENTORY_VIEW | ✓ | ✓ | ✓ | — |
| INVENTORY_ADJUST | ✓ | ✓ | ✓ | — |
| PUTAWAY_VIEW | ✓ | ✓ | ✓ | ✓ |
| PUTAWAY_EXECUTE | ✓ | ✓ | ✓ | ✓ |
| PICKING_VIEW | ✓ | ✓ | ✓ | ✓ |
| PICKING_EXECUTE | ✓ | ✓ | ✓ | ✓ |
| PACKING_VIEW | ✓ | ✓ | ✓ | ✓ |
| PACKING_EXECUTE | ✓ | ✓ | ✓ | ✓ |
| SHIPPING_VIEW | ✓ | ✓ | ✓ | — |
| SHIPPING_CONFIRM | ✓ | ✓ | ✓ | — |
| ORDERS_VIEW | ✓ | ✓ | ✓ | — |
| ORDERS_CREATE | ✓ | ✓ | — | — |
| TROLLEYS_VIEW | ✓ | ✓ | ✓ | ✓ |
| TROLLEYS_CREATE | ✓ | ✓ | ✓ | — |
| TROLLEYS_ASSIGN | ✓ | ✓ | ✓ | — |
| LABELS_VIEW | ✓ | ✓ | ✓ | ✓ |
| LABELS_PRINT | ✓ | ✓ | ✓ | ✓ |
| REPORTS_VIEW | ✓ | ✓ | ✓ | — |
| REPORTS_EXPORT | ✓ | ✓ | — | — |
| MASTER_VIEW | ✓ | ✓ | — | — |
| MASTER_MANAGE | ✓ | ✓ | — | — |
| USERS_VIEW | ✓ | — | — | — |
| USERS_MANAGE | ✓ | — | — | — |

---

## API Reference

Base URL: `http://localhost:8080/api`

All endpoints except `/auth/**` require a `Bearer` token in the `Authorization` header.

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/register` | Public | Register new user |
| GET | `/dashboard/stats` | DASHBOARD_VIEW | Dashboard KPIs |
| GET | `/inbound/purchase-orders` | INBOUND_VIEW | List purchase orders |
| POST | `/inbound/receive` | INBOUND_RECEIVE | Receive items |
| GET | `/inventory` | INVENTORY_VIEW | Current stock |
| GET | `/orders` | ORDERS_VIEW | Sales orders |
| POST | `/orders` | ORDERS_CREATE | Create sales order |
| GET | `/picking/tasks` | PICKING_VIEW | Picking tasks |
| GET | `/packing/tasks` | PACKING_VIEW | Packing tasks |
| GET | `/putaway/tasks` | PUTAWAY_VIEW | Putaway tasks |
| GET | `/shipping` | SHIPPING_VIEW | Shipments |
| GET | `/trolleys` | TROLLEYS_VIEW | Trolley list |
| GET | `/reports` | REPORTS_VIEW | Reports |
| GET | `/master/bins` | MASTER_VIEW | Bin master data |
| GET | `/users` | USERS_VIEW | List users |
| POST | `/users` | USERS_MANAGE | Create user |
| PUT | `/users/{id}` | USERS_MANAGE | Update user |
| DELETE | `/users/{id}` | USERS_MANAGE | Delete user |

---

## Database — Export & Import

### Export current database (for sharing)

```bash
mysqldump -u root -p --databases wms_db > wms_db_dump.sql
```

Or export with create-database statement included (for fresh imports):
```bash
mysqldump -u root -p --databases wms_db --add-drop-database > wms_db_full_dump.sql
```

### Import on a new machine

```bash
# Option 1: Import directly
mysql -u root -p < wms_db_full_dump.sql

# Option 2: Create DB first, then import
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS wms_db;"
mysql -u root -p wms_db < wms_db_dump.sql
```

### Reset to clean state

To wipe all data and re-seed from scratch:
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS wms_db;"
# Then restart the Spring Boot backend — it will recreate everything
```

---

## Production Build

### Backend — Build a JAR

```bash
cd backend
mvn clean package -DskipTests

# Run the JAR (set env vars first)
java -jar target/wms-0.0.1-SNAPSHOT.jar
```

### Frontend — Build static output

```bash
cd frontend
npm run build    # Produces .next/ folder
npm run start    # Serves the production build on port 3000
```

### Environment for production

Set the following before running the JAR:

```bash
export DB_URL=jdbc:mysql://your-db-host:3306/wms_db
export DB_USERNAME=wms_user
export DB_PASSWORD=strong_password
export JWT_SECRET=very_long_random_secret_64_plus_characters
export SERVER_PORT=8080
export CORS_ALLOWED_ORIGINS=https://yourfrontend.com
export JPA_DDL_AUTO=validate
export JPA_SHOW_SQL=false
```

And set `NEXT_PUBLIC_API_URL=https://yourbackend.com` in the frontend `.env.production` before building.

---

## Common Issues

| Problem | Solution |
|---|---|
| `Port 8080 already in use` | Kill the existing Java process or set `SERVER_PORT=8081` |
| `Port 3000 already in use` | Run `npm run dev -- -p 3001` or kill existing Node process |
| `mvn is not recognized` | Use repo Maven directly: `D:\...\tools\apache-maven-3.9.6\bin\mvn.cmd` |
| `JAVA_HOME environment variable is not defined correctly` | Set Java 17 path, for example: `C:\path\to\jdk-17` |
| `OpenAI API key must be set` during backend start | Set `APP_AI_ENABLED=false` and `SPRING_AI_OPENAI_API_KEY=disabled-local-key` in process/env |
| `Invalid username or password` | Backend may have stale role values in DB. Restart the Spring Boot app — DataInitializer will fix them automatically |
| `403 Forbidden on login` | Ensure you are **not** running an old version of the backend. The fix (catching `BadCredentialsException`) must be present |
| `CORS error in browser` | Verify `CORS_ALLOWED_ORIGINS` includes the exact origin from your browser URL bar |
| `Connection refused` (frontend can't reach backend) | Confirm backend is running on the port matching `NEXT_PUBLIC_API_URL` |
| `No enum constant Role.ROLE_ADMIN` | DB has legacy role prefix. Restart backend — migration auto-fix will strip `ROLE_` prefix |
