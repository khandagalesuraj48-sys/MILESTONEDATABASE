# AI Resume Interview System

## Overview

Production-ready recruitment interview management system with:

- **Google Apps Script Backend** — PDF processing, Gemini AI extraction, Google Sheet storage, Google Drive PDF storage
- **Android App** — Kotlin + Jetpack Compose + Material 3
- **Windows App** — C# + WinUI 3

## Features

- 📄 Upload candidate PDF resumes
- 🤖 AI extracts: Name, Mobile, Education, Experience (via Gemini)
- ✏️ Review and edit AI-extracted fields before saving
- 💾 PDF saved to Google Drive only on confirmed Submit
- 📊 Dashboard with Total / Selected / Rejected / Pending stats
- 👥 Candidates list with search and filters
- 👁️ View candidate details
- ✏️ Edit candidate with optional resume replacement
- 💬 WhatsApp sharing (+91 8452845537)
- 🔒 Gemini API key server-side only (Script Properties)
- 🔢 Interview IDs generated server-side with LockService

## Project Structure

```
Interview tracker/
├── backend/              ← Google Apps Script files
│   ├── Config.gs
│   ├── SheetService.gs
│   ├── DriveService.gs
│   ├── GeminiService.gs
│   ├── CandidateService.gs
│   ├── DashboardService.gs
│   ├── WhatsAppService.gs
│   ├── API.gs
│   ├── Code.gs
│   └── Index.html
├── android/              ← Android app (Kotlin + Compose)
├── windows/              ← Windows app (C# + WinUI 3)
└── docs/
    ├── API_DOCUMENTATION.md
    ├── SETUP.md
    ├── BUILD_ANDROID.md
    ├── BUILD_WINDOWS.md
    └── TEST_CHECKLIST.md
```

## Quick Start

1. Read `docs/SETUP.md` to deploy the Apps Script backend
2. Read `docs/BUILD_ANDROID.md` to build the Android app
3. Read `docs/BUILD_WINDOWS.md` to build the Windows app

## Security

- Gemini API key: **ONLY** in Apps Script Script Properties as `GEMINI_API_KEY`
- Never put the Gemini key in: Android source, Windows source, APK, AAB, EXE, MSIX, or git

## Sheet Columns

| # | Column | Source |
|---|---|---|
| 1 | Interview ID | Server-generated |
| 2 | Interview Date | Server-generated |
| 3 | Candidate Name | AI-extracted (editable) |
| 4 | Mobile No. | AI-extracted (editable) |
| 5 | Position Applied For | Manual |
| 6 | Department | Manual |
| 7 | Education / Qualification | AI-extracted (editable) |
| 8 | Total Experience (Years) | AI-extracted (editable) |
| 9 | Current Location | Manual |
| 10 | Current Salary | Manual |
| 11 | Expected Salary | Manual |
| 12 | Notice Period | Manual |
| 13 | Joining Availability | Manual (dropdown) |
| 14 | Technical Knowledge (10) | Manual |
| 15 | Recommendation | Manual (dropdown) |
| 16 | Final Status | Manual (dropdown) |
| 17 | Joining Date | Manual |
| 18 | Interviewer | Manual |
| 19 | Resume Link | Server-set (Rich Text) |
| 20 | Remarks | Manual |

