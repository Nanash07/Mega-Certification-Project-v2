# CRUD Test Scenarios

## Test Environment
- Base URL: `http://localhost:8080/api`
- Frontend URL: `http://localhost:3000`

---

## 1. Employee CRUD Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-EMP-C01** | Create Valid | Admin Login | POST `/api/employees` | Valid Employee Data | 200 OK, Created | - | - |
| **TC-EMP-C02** | Create Invalid | Admin Login | POST `/api/employees` | Missing required fields | 400 Bad Request | - | - |
| **TC-EMP-R01** | Read All (Paged) | Admin Login | GET `/api/employees/paged` | `page=0, size=10` | 200 OK, List Returned | - | - |
| **TC-EMP-R02** | Read By ID | Emp Exists | GET `/api/employees/{id}` | `id` | 200 OK, Object Returned | - | - |
| **TC-EMP-U01** | Update Valid | Emp Exists | PUT `/api/employees/{id}` | Valid Updates | 200 OK, Updated | - | - |
| **TC-EMP-D01** | Soft Delete | Emp Exists | DELETE `/api/employees/{id}` | `id` | 204 No Content | - | - |

---

## 2. Batch CRUD Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BAT-C01** | Create Batch | Admin Login | POST `/api/batches` | Valid Batch Data | 200 OK, Created | - | - |
| **TC-BAT-R01** | Read Search | Admin Login | GET `/api/batches/search` | `status=ONGOING` | 200 OK, List Returned | - | - |
| **TC-BAT-U01** | Update Batch | Batch Exists | PUT `/api/batches/{id}` | Valid Updates | 200 OK, Updated | - | - |
| **TC-BAT-D01** | Delete Draft | Batch is DRAFT | DELETE `/api/batches/{id}` | `id` | 200 OK, Deleted | - | - |

---

## 3. Certification CRUD Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CERT-C01** | Create Cert | Admin Login | POST `/api/certifications` | Valid Data | 200 OK, Created | - | - |
| **TC-CERT-R01** | Read All | Admin Login | GET `/api/certifications` | - | 200 OK, List | - | - |
| **TC-CERT-U01** | Update Cert | Cert Exists | PUT `/api/certifications/{id}` | Valid Updates | 200 OK, Updated | - | - |
| **TC-CERT-D01** | Delete Cert | Unused Cert | DELETE `/api/certifications/{id}` | `id` | 204 No Content | - | - |

---

## 4. User CRUD Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-USER-C01** | Create User | Admin Login | POST `/api/users` | Valid User Data | 200 OK, Created | - | - |
| **TC-USER-R01** | Read Users | Admin Login | GET `/api/users` | - | 200 OK, List | - | - |
| **TC-USER-U01** | Update User | User Exists | PUT `/api/users/{id}` | Role/Status Update | 200 OK, Updated | - | - |
| **TC-USER-D01** | Delete User | User Exists | DELETE `/api/users/{id}` | `id` | 204 No Content | - | - |

---

## UI CRUD Flows (Summary)

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-UI-EMP** | Employee UI | Admin Login | 1. List<br>2. Add<br>3. Edit<br>4. Delete | Form Inputs | CRUD Successful | - | - |
| **TC-UI-BAT** | Batch UI | Admin Login | 1. List<br>2. Add<br>3. Edit<br>4. Status | Form Inputs | CRUD Successful | - | - |
