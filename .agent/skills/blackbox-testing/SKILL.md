---
description: Perform blackbox testing on MegaCertification API endpoints and UI
---

# Blackbox Testing Skill

Skill ini digunakan untuk melakukan **blackbox testing** pada project MegaCertification - testing aplikasi tanpa melihat internal code, hanya fokus pada input/output.

## Prerequisites

- Backend server running on `http://localhost:8080`
- Frontend running on `http://localhost:3000` (atau port lain sesuai Vite config)
- Valid test user credentials

## Quick Start

### 1. API Testing via HTTP Request

Untuk test API endpoints, gunakan `read_url_content` tool atau browser subagent:

```
# Login test
POST http://localhost:8080/api/auth/login
Content-Type: application/json
{
  "username": "admin",
  "password": "password123"
}
```

### 2. UI Testing via Browser

Gunakan `browser_subagent` tool untuk testing UI flows.

---

## API Endpoints Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | User login | No |
| POST | `/forgot-password` | Request password reset | No |
| GET | `/reset-password/validate?token=xxx` | Validate reset token | No |
| POST | `/reset-password` | Reset password with token | No |
| POST | `/change-password-first-login` | Change password on first login | Yes |

**Test Scenarios - Login:**
1. ✅ Valid credentials → Returns JWT token
2. ❌ Invalid username → Returns error
3. ❌ Invalid password → Returns error
4. ❌ Empty fields → Returns validation error

### Employees (`/api/employees`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/paged` | Get paginated employees | Yes |
| GET | `/resigned/paged` | Get resigned employees | Yes |
| GET | `/all` | Get all active employees | Yes |
| GET | `/count` | Count active employees | Yes |
| GET | `/{id}` | Get employee by ID | Yes |
| POST | `/` | Create employee | Yes |
| PUT | `/{id}` | Update employee | Yes |
| PATCH | `/{id}/resign` | Resign employee | Yes |
| DELETE | `/{id}` | Soft delete employee | Yes |

**Query Parameters for `/paged`:**
- `employeeIds` - Filter by employee IDs
- `regionalIds` - Filter by regional
- `divisionIds` - Filter by division
- `unitIds` - Filter by unit
- `jobPositionIds` - Filter by job position
- `search` - Search keyword
- `page`, `size`, `sort` - Pagination

### Batches (`/api/batches`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/search` | Search batches with filters | Yes |
| GET | `/{id}` | Get batch by ID | Yes |
| POST | `/` | Create batch | Yes |
| PUT | `/{id}` | Update batch | Yes |
| DELETE | `/{id}` | Delete batch | Yes |
| GET | `/export/excel` | Export to Excel | Yes |
| GET | `/dashboard/count` | Dashboard counts | Yes |
| GET | `/monthly` | Monthly statistics | Yes |

**Batch Status:**
- `DRAFT` - Draft batch
- `SCHEDULED` - Scheduled for future
- `ONGOING` - Currently running
- `COMPLETED` - Completed
- `CANCELLED` - Cancelled

**Batch Types:**
- `REGULAR` - Regular batch
- `ADDITIONAL` - Additional batch

### Certifications (`/api/certifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all certifications |
| POST | `/` | Create certification |
| PUT | `/{id}` | Update certification |
| DELETE | `/{id}` | Delete certification |

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users |
| POST | `/` | Create user |
| PUT | `/{id}` | Update user |
| DELETE | `/{id}` | Delete user |

---

## Special Operations (Non-CRUD)

### Employee Eligibility (`/api/employee-eligibility`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/paged` | Get paginated eligibilities with filters |
| GET | `/employee/{employeeId}` | Get eligibility for specific employee |
| GET | `/{id}` | Get eligibility by ID |
| POST | `/refresh` | **Refresh ALL eligibilities** |
| POST | `/refresh/{employeeId}` | **Refresh eligibility for specific employee** |
| GET | `/export/excel` | **Export eligibility to Excel** |
| GET | `/dashboard/count` | Dashboard count by status |
| PATCH | `/{id}/toggle` | Toggle eligibility active status |
| DELETE | `/{id}` | Soft delete eligibility |

**Query Parameters for `/paged`:**
- `employeeIds`, `jobIds`, `regionalIds`, `divisionIds`, `unitIds` - Filters
- `status` - Filter by eligibility status
- `certificationId`, `levelId`, `subFieldId` - Certification filters

### Employee Import (`/api/employees/import`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/template` | **Download Excel import template** |
| POST | `/dry-run` | **Preview import** (multipart file) |
| POST | `/confirm` | **Execute import** (multipart file) |
| GET | `/logs` | Get all import logs |
| GET | `/logs/{userId}` | Get import logs by user |

**Import Flow:**
1. Download template → 2. Fill data → 3. Dry run (preview) → 4. Confirm (execute)

### Job Certification Mapping Import (`/api/job-certification-mappings/import`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/template` | **Download mapping import template** |
| POST | `/dry-run` | **Preview mapping import** |
| POST | `/confirm` | **Execute mapping import** |
| GET | `/logs` | Get import logs |

### Batch Export (`/api/batches`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/export/excel` | **Export batches to Excel** |
| GET | `/dashboard/count` | Get count by status |
| GET | `/monthly` | Get monthly statistics |

**Query Parameters for Export:**
- `status`, `type` - Filter by batch status/type
- `startDate`, `endDate` - Date range filter
- `search` - Search keyword
- `certificationRuleIds` - Filter by certification rule

### Notifications (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get my notifications |
| GET | `/latest?limit=5` | Get latest N notifications |
| GET | `/unread-count` | Get unread notification count |
| GET | `/filter` | Filter notifications |
| PATCH | `/{id}/read` | Mark notification as read |
| POST | `/batch/{batchId}/send` | **Send notifications to batch participants** |

**Query Parameters for `/filter`:**
- `unread` - Filter unread only
- `type` - Notification type
- `startDate`, `endDate` - Date range

---

## Test Execution Guide

### Step 1: Authenticate

Semua request ke protected endpoints harus menyertakan JWT token:

```
Authorization: Bearer <jwt_token>
```

Untuk mendapatkan token:
1. Gunakan browser subagent untuk login via UI, atau
2. Call `/api/auth/login` endpoint

### Step 2: Test CRUD Operations

Untuk setiap entity (employees, batches, certifications, dll):

1. **CREATE** - Test dengan valid data, invalid data, missing fields
2. **READ** - Test get by ID, pagination, filtering, search
3. **UPDATE** - Test dengan valid updates, partial updates, invalid data
4. **DELETE** - Test soft delete, verify data is marked as deleted

### Step 3: Test Edge Cases

- Empty requests
- Invalid JSON format
- Unauthorized access (no token)
- Forbidden access (wrong role)
- Non-existent IDs
- Duplicate data
- Boundary values

### Step 4: Test Special Operations

1. **Import Operations**
   - Download template
   - Dry run with sample data (preview)
   - Confirm import (execute)
   - Verify imported data
   - Check import logs

2. **Export Operations**
   - Export with no filters
   - Export with various filters (status, date range, etc.)
   - Verify Excel file content

3. **Refresh Eligibility**
   - Refresh all eligibilities
   - Refresh single employee eligibility
   - Verify eligibility recalculated correctly

4. **Notifications**
   - Send batch notifications
   - Verify notifications appear in user inbox
   - Test mark as read

---

## UI Testing Flows

### Login Flow

```
Task: Test login functionality
Steps:
1. Navigate to http://localhost:3000/login
2. Enter username in username field
3. Enter password in password field
4. Click login button
5. Verify redirect to dashboard or error message
Return: Login result (success/failure) with any error messages
```

### Employee Management Flow

```
Task: Test employee CRUD via UI
Steps:
1. Login as admin
2. Navigate to employee list page
3. Test search functionality
4. Test pagination
5. Test create employee modal
6. Test edit employee
7. Test delete employee
Return: Results of each operation
```

### Batch Management Flow

```
Task: Test batch management
Steps:
1. Login as admin/PIC
2. Navigate to batch page
3. Test batch creation
4. Test adding participants
5. Test batch status changes
6. Test export functionality
Return: Results of each operation
```

---

## Sample Test Commands

### Test Login API

```powershell
# PowerShell command to test login
$body = @{
    username = "admin"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

### Test Protected Endpoint

```powershell
$token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$headers = @{ Authorization = $token }

Invoke-RestMethod -Uri "http://localhost:8080/api/employees/paged" -Method GET -Headers $headers
```

---

## Reporting

Untuk setiap test, catat:

3. **Expected Result**: Hasil yang diharapkan
4. **Actual Result**: Hasil sebenarnya (setelah testing)
5. **Status**: PASS/FAIL

### Example Report Format

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AUTH-01 | Login Valid | Login Page | 1. Input credentials<br>2. Submit | `u:admin`, `p:pass` | Redirect ke Dashboard | Dashboard tampil | ✅ PASS |
| AUTH-02 | Login Invalid | Login Page | 1. Input wrong pass<br>2. Submit | `p:wrong` | Error 401 | Error 401 tampil | ✅ PASS |

---

## Common Issues & Troubleshooting

### CORS Errors
Jika mengalami CORS error saat testing dari browser, pastikan backend sudah dikonfigurasi untuk allow CORS dari origin yang digunakan.

### Authentication Errors
- `401 Unauthorized`: Token tidak ada atau expired
- `403 Forbidden`: Token valid tapi tidak punya akses

### Validation Errors
- `400 Bad Request`: Data tidak valid, cek response body untuk detail error
