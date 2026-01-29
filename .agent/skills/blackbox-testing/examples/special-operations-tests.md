# Special Operations Test Scenarios

## Test Environment
- Base URL: `http://localhost:8080/api`
- File Uploads: `multipart/form-data`

---

## 1. Employee Eligibility Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ELIG-R01** | Refresh All | Admin Login | POST `/api/employee-eligibility/refresh` | - | 200 OK, Stats Returned | - | - |
| **TC-ELIG-R02** | Refresh Employee | Emp Exists | POST `/api/employee-eligibility/refresh/{id}` | `id` | 200 OK, Updated | - | - |
| **TC-ELIG-D01** | Dashboard Count | Admin Login | GET `/api/employee-eligibility/dashboard/count` | - | 200 OK, Counts | - | - |
| **TC-ELIG-E01** | Export Excel | Admin Login | GET `/api/employee-eligibility/export/excel` | - | 200 OK, File | - | - |

---

## 2. Employee Import Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-IMP-T01** | Download Template | Admin Login | GET `/api/employees/import/template` | - | 200 OK, File | - | - |
| **TC-IMP-D01** | Dry Run Valid | Valid File | POST `/api/employees/import/dry-run` | `file.xlsx` | 200 OK, Preview | - | - |
| **TC-IMP-D02** | Dry Run Invalid | Invalid File | POST `/api/employees/import/dry-run` | `file.txt` | 400 Bad Request | - | - |
| **TC-IMP-C01** | Confirm Import | Dry Run OK | POST `/api/employees/import/confirm` | `file.xlsx` | 200 OK, Imported | - | - |

---

## 3. Job Certification Mapping Import

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-JCI-T01** | Download Template | Admin Login | GET `/job-certification-mappings/import/template` | - | 200 OK, File | - | - |
| **TC-JCI-D01** | Dry Run | Valid File | POST `/job-certification-mappings/import/dry-run` | `file.xlsx` | 200 OK, Preview | - | - |
| **TC-JCI-C01** | Confirm | Dry Run OK | POST `/job-certification-mappings/import/confirm` | `file.xlsx` | 200 OK, Imported | - | - |

---

## 4. Notification Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-NOT-S01** | Send Batch Notif | Batch has Users | POST `/api/notifications/batch/{id}/send` | `id` | 200 OK, Sent | - | - |
| **TC-NOT-G01** | My Notifications | User Login | GET `/api/notifications/me` | - | 200 OK, List | - | - |
| **TC-NOT-M01** | Mark Read | Notif Exists | PATCH `/api/notifications/{id}/read` | `id` | 200 OK, Read | - | - |

---

## UI Flows (Summary)

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-UI-IMP** | Import UI | Admin Login | 1. Page<br>2. Upload<br>3. Confirm | File Input | Success Msg | - | - |
| **TC-UI-EXP** | Export UI | Admin Login | 1. Page<br>2. Filter<br>3. Download | Filters | File Downloaded | - | - |
