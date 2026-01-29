# Authentication Test Scenarios

## Test Environment
- Base URL: `http://localhost:8080/api/auth`
- Frontend URL: `http://localhost:3000`

---

## 1. Login Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-001** | Login Valid | User exists | POST `/login` | `u:admin`, `p:correct` | 200 OK, Token returned | - | - |
| **TC-AUTH-002** | Login Invalid Pass | User exists | POST `/login` | `u:admin`, `p:wrong` | 401 Unauthorized | - | - |
| **TC-AUTH-003** | Login Unknown User | None | POST `/login` | `u:unknown` | 401 Unauthorized | - | - |
| **TC-AUTH-004** | Login Empty | None | POST `/login` | `u:""` | 400 Bad Request | - | - |
| **TC-AUTH-005** | Login Missing Field | None | POST `/login` | `{}` | 400 Bad Request | - | - |

---

## 2. Forgot Password Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-010** | Forgot Pass Valid | User email exists | POST `/forgot-password` | `valid@example.com` | 200 OK, Email sent | - | - |
| **TC-AUTH-011** | Forgot Pass Unknown | None | POST `/forgot-password` | `unknown@example.com` | 200 OK (Security) | - | - |
| **TC-AUTH-012** | Forgot Pass Invalid | None | POST `/forgot-password` | `invalid-email` | 400 Bad Request | - | - |

---

## 3. Reset Password Tests

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-020** | Validate Token Valid | Token generated | GET `/validate` | `token=valid` | 200 OK, Valid: true | - | - |
| **TC-AUTH-021** | Validate Token Invalid | None | GET `/validate` | `token=invalid` | 200 OK, Valid: false | - | - |
| **TC-AUTH-022** | Validate Token Expired | Token expired | GET `/validate` | `token=expired` | 200 OK, Valid: false | - | - |
| **TC-AUTH-023** | Reset Pass Valid | Valid Token | POST `/reset-password` | `token=valid`, `newPass` | 200 OK, Success | - | - |
| **TC-AUTH-024** | Reset Pass Invalid | None | POST `/reset-password` | `token=invalid` | 400/401 Error | - | - |

---

## 4. UI Test Scenarios

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji (Input) | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-UI-001** | Login Flow UI | Browser open | 1. Go to Login<br>2. Input Creds<br>3. Submit | `u:admin`, `p:pass` | Redirect to Dashboard | - | - |
| **TC-AUTH-UI-002** | Forgot Pass UI | Browser open | 1. Click Forgot<br>2. Input Email<br>3. Submit | `email` | Success message | - | - |
| **TC-AUTH-UI-003** | Logout UI | Logged in | 1. Click Logout | - | Redirect to Login | - | - |
