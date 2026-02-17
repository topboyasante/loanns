# API Reference (Frontend)

This document describes all loan-application endpoints: request bodies, response shapes, and error formats.

## Base URL and versioning

- **Base URL:** `http://localhost:3000` (or your deployed origin; configurable via `PORT` and host).
- **API prefix:** `api/v1`
- **Full base for loan endpoints:** `http://localhost:3000/api/v1`

All loan endpoints live under: `http://localhost:3000/api/v1/loan-applications`

---

## Standard success response envelope

Every successful response is wrapped in this structure:

```json
{
  "success": true,
  "message": "Request successful",
  "data": <payload>,
  "request_id": "<string>"
}
```

- **data** — The actual payload: either a single object (e.g. one loan application) or an array (e.g. list of loan applications).
- **Money fields** in `data` (`monthlyIncome`, `requestedLoanAmount`, `monthlyInstallment`) are **strings** representing amounts in the smallest currency unit (e.g. cents).

---

## Standard error response

Error responses use this shape (no top-level `success`/`message`; the body is the `error` object as below):

```json
{
  "error": {
    "code": "<string>",
    "message": "<string>",
    "request_id": "<string>",
    "details": { "<field>": "<message>" }
  }
}
```

- **code** — Error code. Common values: `VALIDATION_FAILED` (400), `BAD_REQUEST` (400), `NOT_FOUND` (404).
- **message** — Human-readable message.
- **details** — Optional; present for validation errors (field → message).

---

## Data shapes

### Loan application (object in `data`)

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| applicantName | string | Applicant name |
| monthlyIncome | string | Monthly income in cents |
| requestedLoanAmount | string | Requested loan amount in cents |
| tenorInMonths | number | Loan term in months |
| state | string | One of: `DRAFT`, `CREDIT_PASSED`, `APPROVED`, `REJECTED` |
| createdAt | string (ISO 8601) | Creation timestamp |
| updatedAt | string (ISO 8601) | Last update timestamp |
| creditAssessment | object \| undefined | Present after credit assessment has been run (see below) |

### Credit assessment (nested in `creditAssessment`)

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| result | string | `PASS` or `FAIL` |
| monthlyInstallment | string | Monthly installment in cents |
| rejectionReason | string \| null | Reason when result is `FAIL` |
| createdAt | string (ISO 8601) | Creation timestamp |

---

## Endpoints

### 1. Create loan application

Creates a new loan application in **DRAFT** state.

- **Method:** `POST`
- **Path:** `/api/v1/loan-applications`
- **Headers:** `Content-Type: application/json`

**Request body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| applicantName | string | yes | Max 255 characters |
| monthlyIncome | number (integer) | yes | ≥ 0 (cents) |
| requestedLoanAmount | number (integer) | yes | ≥ 1 (cents) |
| tenorInMonths | number (integer) | yes | ≥ 1 |

**Success response:** `201 Created`  
- **data:** Single loan application (no `creditAssessment` yet).

**Error responses**
- `400` — Validation failed (`error.code` may be `VALIDATION_FAILED`; `error.details` has field-level messages).

**Example request**

```bash
curl -X POST http://localhost:3000/api/v1/loan-applications \
  -H "Content-Type: application/json" \
  -d '{"applicantName":"Jane Doe","monthlyIncome":300000,"requestedLoanAmount":1000000,"tenorInMonths":12}'
```

**Example success response**

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicantName": "Jane Doe",
    "monthlyIncome": "300000",
    "requestedLoanAmount": "1000000",
    "tenorInMonths": 12,
    "state": "DRAFT",
    "createdAt": "2025-02-17T12:00:00.000Z",
    "updatedAt": "2025-02-17T12:00:00.000Z"
  },
  "request_id": "req_abc123"
}
```

---

### 2. List loan applications

Returns loan applications with pagination, optionally filtered by state.

- **Method:** `GET`
- **Path:** `/api/v1/loan-applications`

**Query parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| state | string | no | — | One of: `DRAFT`, `CREDIT_PASSED`, `APPROVED`, `REJECTED` |
| page | number | no | 1 | Page number (1-based) |
| limit | number | no | 20 | Items per page (max 100) |

**Success response:** `200 OK`  
- **data:** Array of loan applications (each may include `creditAssessment`).
- **meta:** Pagination metadata: `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrevious`.

**Error responses:** None (always 200; data may be empty array).

**Example request**

```bash
curl "http://localhost:3000/api/v1/loan-applications?state=DRAFT&page=1&limit=20"
```

**Example success response**

```json
{
  "success": true,
  "message": "Request successful",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "applicantName": "Jane Doe",
      "monthlyIncome": "300000",
      "requestedLoanAmount": "1000000",
      "tenorInMonths": 12,
      "state": "DRAFT",
      "createdAt": "2025-02-17T12:00:00.000Z",
      "updatedAt": "2025-02-17T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "request_id": "req_def456"
}
```

---

### 3. Get loan application by ID

Returns a single loan application by UUID.

- **Method:** `GET`
- **Path:** `/api/v1/loan-applications/:id`

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| id | string (UUID) | Loan application ID |

**Success response:** `200 OK`  
- **data:** Single loan application with optional `creditAssessment`.

**Error responses**
- `404` — Loan application not found (`error.code`: `NOT_FOUND`).

**Example request**

```bash
curl "http://localhost:3000/api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000"
```

**Example success response**

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicantName": "Jane Doe",
    "monthlyIncome": "300000",
    "requestedLoanAmount": "1000000",
    "tenorInMonths": 12,
    "state": "DRAFT",
    "createdAt": "2025-02-17T12:00:00.000Z",
    "updatedAt": "2025-02-17T12:00:00.000Z"
  },
  "request_id": "req_ghi789"
}
```

---

### 4. Run credit assessment

Runs the credit assessment (3× income rule): monthly income must be at least 3× the monthly installment. Updates the application state to **CREDIT_PASSED** or **REJECTED** and creates a `creditAssessment` record.

- **Method:** `POST`
- **Path:** `/api/v1/loan-applications/:id/credit-assessment`
- **Body:** None

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| id | string (UUID) | Loan application ID |

**Success response:** `200 OK`  
- **data:** Updated loan application including `creditAssessment` and new `state` (`CREDIT_PASSED` or `REJECTED`).

**Error responses**
- `400` — Application already assessed (`error.message` e.g. "Application already assessed").
- `404` — Loan application not found.

**Example request**

```bash
curl -X POST "http://localhost:3000/api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/credit-assessment"
```

**Example success response (pass)**

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicantName": "Jane Doe",
    "monthlyIncome": "300000",
    "requestedLoanAmount": "1000000",
    "tenorInMonths": 12,
    "state": "CREDIT_PASSED",
    "createdAt": "2025-02-17T12:00:00.000Z",
    "updatedAt": "2025-02-17T12:01:00.000Z",
    "creditAssessment": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "result": "PASS",
      "monthlyInstallment": "83333",
      "rejectionReason": null,
      "createdAt": "2025-02-17T12:01:00.000Z"
    }
  },
  "request_id": "req_jkl012"
}
```

---

### 5. Approve application

Marks the application as **APPROVED**. Only allowed when state is **CREDIT_PASSED**.

- **Method:** `POST`
- **Path:** `/api/v1/loan-applications/:id/approve`
- **Body:** None

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| id | string (UUID) | Loan application ID |

**Success response:** `200 OK`  
- **data:** Updated loan application with `state`: `APPROVED`.

**Error responses**
- `400` — Invalid state for approval (e.g. "Only loan applications that have passed credit assessment can be approved").
- `404` — Loan application not found.

**Example request**

```bash
curl -X POST "http://localhost:3000/api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/approve"
```

---

### 6. Reject application

Marks the application as **REJECTED**. Allowed only when state is **DRAFT** or **CREDIT_PASSED**. Rejection is final and cannot be reversed.

- **Method:** `POST`
- **Path:** `/api/v1/loan-applications/:id/reject`
- **Headers:** `Content-Type: application/json` (when body is sent)

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| id | string (UUID) | Loan application ID |

**Request body (optional)**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| reason | string | no | Max 500 characters |

**Success response:** `200 OK`  
- **data:** Updated loan application with `state`: `REJECTED`.

**Error responses**
- `400` — Application already in a final state (e.g. "Rejection is final and cannot be reversed").
- `404` — Loan application not found.

**Example request (with reason)**

```bash
curl -X POST "http://localhost:3000/api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/reject" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Applicant did not meet criteria"}'
```

**Example request (no body)**

```bash
curl -X POST "http://localhost:3000/api/v1/loan-applications/550e8400-e29b-41d4-a716-446655440000/reject"
```

---

## Interactive API docs

When the server is running, interactive OpenAPI (Swagger) documentation is available at:

**`http://localhost:3000/swagger`**

Use it to try endpoints and see the same request/response shapes.
