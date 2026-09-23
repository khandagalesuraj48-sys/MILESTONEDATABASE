# AI Resume Interview System — API Documentation

**Backend:** Google Apps Script  
**Version:** 2.0.0  
**Base URL:** `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

---

## Authentication

The Apps Script Web App is deployed with **"Execute as: Me"** and **"Who has access: Anyone"**.

- No API key is required in client requests.
- The Gemini API key is stored server-side in Script Properties and is **never** returned to clients.

---

## Response Format

All API responses follow this envelope:

### Success
```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message."
  }
}
```

---

## Error Codes

| Code | Meaning |
|---|---|
| `MISSING_PARAM` | Required query parameter is missing |
| `INVALID_JSON` | POST body is not valid JSON |
| `UNKNOWN_ACTION` | The `action` value is not recognized |
| `SERVER_ERROR` | Internal server error (see `message` for detail) |

---

## GET Endpoints

All GET endpoints use the `action` query parameter.

---

### GET `?action=bootstrap`

Returns system version and current date.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "2.0.0",
    "date": "2026-09-23",
    "serverTime": "2026-09-23T15:30:00.000Z",
    "spreadsheetId": "1oFCdVS50HLpAbj19Utl7Df9ct-SUdWf2eDuUyedAghg",
    "sheetGid": 1604294621
  }
}
```

---

### GET `?action=dashboard`

Returns dashboard statistics and all candidate records.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 42,
    "selected": 10,
    "rejected": 8,
    "pending": 24,
    "candidates": [ ...candidate objects... ]
  }
}
```

---

### GET `?action=candidates`

Returns all candidate records.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Interview ID": "1",
      "Interview Date": "2026-09-23",
      "Candidate Name": "Rahul Sharma",
      "Mobile No.": "9876543210",
      "Position Applied For": "Software Engineer",
      "Department": "Engineering",
      "Education / Qualification": "B.Tech Computer Science",
      "Total Experience (Years)": "3",
      "Current Location": "Mumbai",
      "Current Salary": "8,00,000",
      "Expected Salary": "12,00,000",
      "Notice Period": "60 days",
      "Joining Availability": "Immediate",
      "Technical Knowledge (10)": "8",
      "Recommendation": "Strong Hire",
      "Final Status": "Selected",
      "Joining Date": "2026-10-15",
      "Interviewer": "Amit Patel",
      "Resume Link": "📄 Open Resume",
      "Remarks": "Excellent candidate",
      "Resume URL": "https://drive.google.com/file/d/XXXX/view"
    }
  ]
}
```

---

### GET `?action=candidate&id={interviewId}`

Returns a single candidate by Interview ID.

**Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Interview ID (e.g. "1", "42") |

**Response:** Same structure as a single item in the candidates array.

**Error (not found):**
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Candidate not found: 99"
  }
}
```

---

### GET `?action=dropdowns`

Returns dropdown values for form fields.

**Response:**
```json
{
  "success": true,
  "data": {
    "joiningAvailability": ["Immediate", "15 days", "30 days", "60 days", "90 days"],
    "recommendation": ["Strong Hire", "Hire", "No Hire", "Hold"],
    "finalStatus": ["Selected", "Rejected", "On Hold", "Pending"],
    "department": ["Engineering", "HR", "Finance", "Marketing"],
    "position": ["Software Engineer", "Manager", "Analyst"]
  }
}
```

> **Note:** Values come from Google Sheet data validation rules or unique existing values. They are dynamic.

---

### GET `?action=nextId`

Returns the next Interview ID (preview only — authoritative ID assigned server-side during save).

**Response:**
```json
{
  "success": true,
  "data": {
    "nextId": 43,
    "date": "2026-09-23"
  }
}
```

---

### GET `?action=whatsapp&id={interviewId}`

Returns WhatsApp share data for a candidate.

**Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Interview ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "whatsappNumber": "918452845537",
    "message": "Candidate Interview Details\n\nInterview ID: 1\n...",
    "whatsappUrl": "https://wa.me/918452845537?text=...",
    "resumeUrl": "https://drive.google.com/file/d/XXXX/view"
  }
}
```

---

## POST Endpoints

All POST endpoints accept `Content-Type: application/json`.

The `action` field is in the request body.

---

### POST — `processResume`

Sends a PDF resume to Gemini AI for extraction.

> **CRITICAL:** This does NOT save the PDF to Google Drive.
> Drive save happens only in `saveCandidate`.

**Request:**
```json
{
  "action": "processResume",
  "file": {
    "fileName": "john_resume.pdf",
    "mimeType": "application/pdf",
    "base64": "<base64-encoded-PDF-bytes>"
  }
}
```

**File object:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `fileName` | string | Yes | Original filename |
| `mimeType` | string | Yes | Must be `"application/pdf"` |
| `base64` | string | Yes | Raw base64, no data URL prefix |

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "fileName": "john_resume.pdf",
    "candidate": {
      "candidateName": "John Smith",
      "mobileNo": "9876543210",
      "educationQualification": "B.E. Computer Engineering, Mumbai University (2021)",
      "totalExperienceYears": "3"
    }
  }
}
```

> **AI Rules:** Fields are blank (`""`) if not found or unclear. AI never invents data.

**Errors:**
- File too large → `"PDF is too large. Maximum size is 20 MB."`
- Not PDF → `"Only PDF resume files are allowed."`
- Gemini failure → `"Gemini API Error (429): ..."`

---

### POST — `saveCandidate`

Saves a new candidate. Uploads PDF to Drive, creates Sheet row, sets Resume Link.

> This is protected by `LockService` to prevent duplicate IDs.

**Request:**
```json
{
  "action": "saveCandidate",
  "file": {
    "fileName": "john_resume.pdf",
    "mimeType": "application/pdf",
    "base64": "<base64>"
  },
  "candidate": {
    "candidateName": "John Smith",
    "mobileNo": "9876543210",
    "positionAppliedFor": "Software Engineer",
    "department": "Engineering",
    "educationQualification": "B.E. Computer Engineering",
    "totalExperienceYears": "3",
    "currentLocation": "Mumbai",
    "currentSalary": "8,00,000",
    "expectedSalary": "12,00,000",
    "noticePeriod": "30 days",
    "joiningAvailability": "30 days",
    "technicalKnowledge": "8",
    "recommendation": "Strong Hire",
    "finalStatus": "Selected",
    "joiningDate": "2026-10-15",
    "interviewer": "Amit Patel",
    "remarks": "Excellent candidate"
  },
  "remarks": ""
}
```

> `remarks` can be in either `candidate.remarks` or top-level `remarks`. Both are checked.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "interviewId": 43,
    "interviewDate": "2026-09-23",
    "resumeFileId": "1AbCdEfGhIjKlMnOpQrStUv",
    "resumeFileName": "INT-43_john_resume.pdf",
    "resumeUrl": "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view",
    "remarks": "Excellent candidate",
    "rowNumber": 45
  }
}
```

**Rollback:** If Sheet write fails after Drive upload, the Drive file is automatically moved to trash.

---

### POST — `updateCandidate`

Updates an existing candidate. Optionally replaces the resume PDF.

**Request (without resume replacement):**
```json
{
  "action": "updateCandidate",
  "interviewId": "43",
  "candidate": {
    "candidateName": "John Smith",
    "positionAppliedFor": "Senior Software Engineer",
    "finalStatus": "Selected",
    "...": "...all other fields..."
  },
  "replaceResume": false
}
```

**Request (with resume replacement):**
```json
{
  "action": "updateCandidate",
  "interviewId": "43",
  "candidate": { "...": "..." },
  "replaceResume": true,
  "file": {
    "fileName": "john_resume_v2.pdf",
    "mimeType": "application/pdf",
    "base64": "<base64>"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "interviewId": "43",
    "rowNumber": 45,
    "resumeUrl": "https://drive.google.com/file/d/XXXX/view",
    "remarks": ""
  }
}
```

> **Resume preservation:** If `replaceResume` is `false` or not set, the existing Resume URL from the Sheet is preserved.

---

## Candidate Object Fields Reference

| Sheet Column | JSON Key | Type | Source |
|---|---|---|---|
| Interview ID | `"Interview ID"` | string | Server-generated |
| Interview Date | `"Interview Date"` | string (YYYY-MM-DD) | Server-generated |
| Candidate Name | `"Candidate Name"` | string | AI-extracted (editable) |
| Mobile No. | `"Mobile No."` | string | AI-extracted (editable) |
| Position Applied For | `"Position Applied For"` | string | Manual |
| Department | `"Department"` | string | Manual |
| Education / Qualification | `"Education / Qualification"` | string | AI-extracted (editable) |
| Total Experience (Years) | `"Total Experience (Years)"` | string | AI-extracted (editable) |
| Current Location | `"Current Location"` | string | Manual |
| Current Salary | `"Current Salary"` | string | Manual |
| Expected Salary | `"Expected Salary"` | string | Manual |
| Notice Period | `"Notice Period"` | string | Manual |
| Joining Availability | `"Joining Availability"` | string | Manual (dropdown) |
| Technical Knowledge (10) | `"Technical Knowledge (10)"` | string | Manual |
| Recommendation | `"Recommendation"` | string | Manual (dropdown) |
| Final Status | `"Final Status"` | string | Manual (dropdown) |
| Joining Date | `"Joining Date"` | string | Manual |
| Interviewer | `"Interviewer"` | string | Manual |
| Resume Link | `"Resume Link"` | string | Display only (Rich Text in Sheet) |
| Remarks | `"Remarks"` | string | Manual |
| Resume URL | `"Resume URL"` | string | Extracted from Rich Text cell |

---

## PDF File Size Limits

- Maximum: **20 MB**
- Format: **PDF only**
- Base64: Send raw base64 bytes (no `data:application/pdf;base64,` prefix needed — backend strips it)

---

## WhatsApp Integration

Target number: `918452845537` (country code 91 + number 8452845537)

Client-side URL: `https://wa.me/918452845537?text=<url-encoded-message>`

Open with native browser/intent. The backend `whatsapp` endpoint returns a pre-built URL.

---

## Data Preservation Guarantee

The backend **never**:
- Deletes existing rows
- Resets Interview IDs
- Modifies existing columns beyond the 20 defined columns
- Changes column meanings

Existing Google Sheet data is always preserved.

