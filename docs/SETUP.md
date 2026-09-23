# Setup Guide — AI Resume Interview System

## Overview

This system consists of:
1. **Google Apps Script Backend** — existing web app + new REST API layer
2. **Android App** — Kotlin + Jetpack Compose
3. **Windows App** — C# + WinUI 3

---

## Step 1: Set Up the Apps Script Backend

### 1.1 Open your existing Apps Script project

Go to [script.google.com](https://script.google.com) and open your existing project, OR create a new one linked to your Spreadsheet.

### 1.2 Add the new files

In the Apps Script editor, add these files from the `backend/` folder:

| File | Type | Action |
|---|---|---|
| `Config.gs` | Script | Add new file |
| `SheetService.gs` | Script | Add new file |
| `DriveService.gs` | Script | Add new file |
| `GeminiService.gs` | Script | Add new file |
| `CandidateService.gs` | Script | Add new file |
| `DashboardService.gs` | Script | Add new file |
| `WhatsAppService.gs` | Script | Add new file |
| `API.gs` | Script | Add new file |
| `Code.gs` | Script | Replace existing Code.gs |
| `Index.html` | HTML | Replace existing Index.html |

> **Important:** The old `Code.gs` is replaced by the new modular structure. All functions are preserved in the service files.

### 1.3 Set the Gemini API Key

1. In Apps Script, go to **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Click **Add script property**
4. Set:
   - Property name: `GEMINI_API_KEY`
   - Value: Your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
5. Click **Save script properties**

> **Critical:** The Gemini API key must NEVER be put in any source code file. Only in Script Properties.

### 1.4 Verify Config.gs

Open `Config.gs` and confirm:
- `SPREADSHEET_ID` = `1oFCdVS50HLpAbj19Utl7Df9ct-SUdWf2eDuUyedAghg`
- `SHEET_GID` = `1604294621`
- `RESUME_FOLDER_ID` = `1GNRuCR122lHaxkx_Yty4OUKf0dX1vyqH`
- `WHATSAPP_NUMBER` = `918452845537`

### 1.5 Run the System Test

In Apps Script editor:
1. Select function `testSystem` from the dropdown
2. Click **Run**
3. Check the Execution Log

Expected output:
```json
{
  "sheet": true,
  "gemini": true,
  "drive": true,
  "driveWrite": true,
  ...
}
```

Fix any `false` values before proceeding.

### 1.6 Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon next to **Select type** → Choose **Web app**
3. Configure:
   - **Description:** AI Resume Interview System v2.0
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. **Copy the Web App URL** — you will need this for the Android and Windows apps

> The URL looks like:
> `https://script.google.com/macros/s/AKfycb...LONG_ID.../exec`

### 1.7 Test the API

Open your browser and visit:
```
https://script.google.com/macros/s/YOUR_ID/exec?action=bootstrap
```

Expected response:
```json
{
  "success": true,
  "data": {
    "version": "2.0.0",
    "date": "2026-09-23"
  }
}
```

Test candidates endpoint:
```
https://script.google.com/macros/s/YOUR_ID/exec?action=dashboard
```

---

## Step 2: Configure the Android App

### 2.1 Prerequisites

- Android Studio (latest stable version)
- JDK 17+
- Android SDK (API 34)

### 2.2 Open the Project

Open `android/` folder in Android Studio.

### 2.3 Configure API URL

Create/edit `android/app/local.properties`:
```properties
# Do NOT commit this file to git
API_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Replace `YOUR_DEPLOYMENT_ID` with the actual ID from Step 1.6.

### 2.4 Build and Run

```bash
cd android
./gradlew assembleDebug
```

Install on device:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or use Android Studio → Run button.

---

## Step 3: Configure the Windows App

### 3.1 Prerequisites

- Visual Studio 2022 (with Windows App SDK workload)
- Windows App SDK 1.5+
- .NET 8 SDK
- Windows 10 version 1903 or later

### 3.2 Open the Project

Open `windows/InterviewTracker/InterviewTracker.sln` in Visual Studio 2022.

### 3.3 Configure API URL

Edit `windows/InterviewTracker/InterviewTracker/appsettings.json`:
```json
{
  "ApiBaseUrl": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  "WhatsAppNumber": "918452845537",
  "MaxFileSizeMb": 20
}
```

### 3.4 Build and Run

In Visual Studio:
1. Set the target to `x64`
2. Press **F5** or click **Debug → Start Debugging**

Or from command line:
```bash
cd windows/InterviewTracker
dotnet build
dotnet run --project InterviewTracker
```

---

## Step 4: Verify the System

### 4.1 Test from the Web App

Open the Apps Script web app URL in browser. Verify all existing functionality works.

### 4.2 Test from Android App

1. Open app → Dashboard should load
2. Tap "New Interview" → upload a PDF
3. Wait for AI extraction
4. Fill in Position, submit
5. Check Google Sheet for the new row
6. Check Google Drive resume folder for the PDF

### 4.3 Test from Windows App

Same workflow as Android.

---

## Troubleshooting

### "GEMINI_API_KEY is missing"
→ Add it to Script Properties (Step 1.3)

### "Cannot access Resume Folder"
→ Make sure the Google account running the Apps Script has Edit access to the Drive folder with ID `1GNRuCR122lHaxkx_Yty4OUKf0dX1vyqH`

### "Target sheet not found"
→ Verify SPREADSHEET_ID and SHEET_GID in Config.gs match your actual sheet

### Android: "Network Error"
→ Check API_BASE_URL in local.properties. Make sure the deployment URL is correct and the web app is deployed as "Anyone" access.

### Windows: App won't start
→ Ensure Windows App SDK runtime is installed. Download from [GitHub releases](https://github.com/microsoft/WindowsAppSDK/releases)

### API returns HTML instead of JSON
→ Your Apps Script is not deployed, or the URL is wrong. Re-deploy and get the new URL.

### "Could not save PDF to Resume folder"
→ The Apps Script account doesn't have edit access to the Drive folder. Share the folder with the account shown in `testDriveIdentity()`.

---

## Security Notes

- **Gemini API key:** Only in Script Properties. Never in source code.
- **local.properties:** Never commit to git. Add to `.gitignore`.
- **appsettings.json:** Contains only the public web app URL (not a secret), but keep it out of public repositories.
- **Drive credentials:** Handled by Apps Script internally. Never exposed to clients.
- **Interview ID:** Always generated server-side with LockService. Client preview is not authoritative.

---

## Data Safety

The backend is designed to **never** delete or modify existing data:
- Only appends new rows
- Only updates specific fields in existing rows
- Never deletes rows or sheets
- Never resets IDs
- Existing Resume Links in the Sheet are preserved unless explicitly replaced

---

## Redeployment

When you update the Apps Script code, you must create a new deployment:

1. **Deploy** → **Manage deployments**
2. Edit the existing deployment → click pencil icon
3. Under **Version**: select **New version**
4. Click **Deploy**
5. The URL remains the same — no need to update Android/Windows apps.

> If you create a *new* deployment (instead of updating existing), the URL changes and you must update `local.properties` and `appsettings.json`.

