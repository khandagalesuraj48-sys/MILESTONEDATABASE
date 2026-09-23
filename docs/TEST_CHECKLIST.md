# Functional Test Checklist — AI Resume Interview System

**Version:** 2.0.0  
**Date:** 2026-09-23  
**Platforms:** Web App (Apps Script) | Android App | Windows App

Use this checklist to validate a complete deployment before going live.

---

## Pre-Test Setup

- [ ] Apps Script backend deployed with `testSystem()` returning all `true`
- [ ] Gemini API key set in Script Properties
- [ ] Android `local.properties` configured with deployment URL
- [ ] Windows `appsettings.json` configured with deployment URL
- [ ] Test PDF ready (valid PDF, under 20 MB, with candidate info)

---

## Test Checklist

### TC-01: App Launch

| # | Test | Expected |
|---|---|---|
| 1a | Open Android app | Splash → Dashboard loads within 5 seconds |
| 1b | Open Windows app | Main window opens, NavigationView visible |
| 1c | Open Apps Script web app URL | HTML web app loads, date shown in topbar |

---

### TC-02: Dashboard

| # | Test | Expected |
|---|---|---|
| 2a | View Dashboard | Total, Selected, Rejected, Pending counters shown |
| 2b | Verify counts | Counts match what is visible in Google Sheet |
| 2c | View recent candidates | Last 8 candidates listed in reverse order |
| 2d | Pull-to-refresh (Android) | Counters and list refresh |
| 2e | Click Refresh (Windows) | Data reloads |

---

### TC-03: New Interview — PDF Selection

| # | Test | Expected |
|---|---|---|
| 3a | Tap upload area / click file button | OS file picker opens |
| 3b | Select a valid PDF | File name and size displayed below picker |
| 3c | Select a non-PDF file (e.g. .docx) | Error: "Only PDF resume files are allowed" |
| 3d | Select PDF > 20 MB | Error: "PDF must be 20 MB or less" |
| 3e | Verify Submit button state | Submit button is DISABLED at this stage |

---

### TC-04: Gemini AI Extraction

| # | Test | Expected |
|---|---|---|
| 4a | Wait for AI processing | Stage text progresses (not fake %) |
| 4b | Stage 1 text | "Reading PDF..." or equivalent |
| 4c | Stage 2 text | "Sending to AI..." or equivalent |
| 4d | Stage 3 text | "Extracting candidate details..." or equivalent |
| 4e | Stage 4 text | "Preparing form..." or equivalent |
| 4f | Form populated after AI | Candidate Name, Mobile, Education, Experience filled in |
| 4g | AI fields are editable | User can modify any AI-extracted field |
| 4h | Submit button enabled | After AI extraction completes |
| 4i | AI fields with no data | Show empty — never show invented data |

---

### TC-05: Manual Fields

| # | Test | Expected |
|---|---|---|
| 5a | Enter Position Applied For | Required field accepts text |
| 5b | Select Joining Availability | Dropdown shows values from Sheet data validation |
| 5c | Select Recommendation | Dropdown shows values |
| 5d | Select Final Status | Dropdown shows values |
| 5e | Enter Technical Knowledge | Number 0–10 accepted |
| 5f | Submit without Position | Error: "Position Applied For is required" |

---

### TC-06: Submit New Interview

| # | Test | Expected |
|---|---|---|
| 6a | Fill form and tap Submit | Loading overlay appears |
| 6b | Loading stages | "Saving PDF to Resume folder...", "Adding candidate..." |
| 6c | Success state | Success message with Interview ID shown |
| 6d | Google Sheet row | New row created in Sheet at correct position |
| 6e | Interview ID | ID is correct sequential number |
| 6f | Interview Date | Today's date in YYYY-MM-DD format |
| 6g | Resume Link in Sheet | Cell 19 contains rich text "📄 Open Resume" with hyperlink |
| 6h | PDF in Drive | File appears in Resume folder as `INT-{ID}_{original}.pdf` |
| 6i | PDF is accessible | Drive link opens the PDF |
| 6j | Form reset after submit | All fields cleared, new ID/date shown |

---

### TC-07: Drive Rollback (negative test)

| # | Test | Procedure | Expected |
|---|---|---|---|
| 7a | Simulate Sheet write failure | Temporarily set wrong SHEET_GID in Config.gs | Drive PDF is trashed; no orphan file in Drive |

> Restore SHEET_GID after this test.

---

### TC-08: Candidates Screen

| # | Test | Expected |
|---|---|---|
| 8a | Navigate to Candidates | All candidate records loaded |
| 8b | Total count shown | Matches number of rows in Sheet |
| 8c | Search by name | List filters correctly |
| 8d | Search by mobile | List filters correctly |
| 8e | Filter by Final Status | Only matching candidates shown |
| 8f | Filter by Position | Only matching candidates shown |
| 8g | Clear filters | All candidates visible again |
| 8h | Candidates in reverse order | Most recent at top |

---

### TC-09: View Candidate

| # | Test | Expected |
|---|---|---|
| 9a | Tap View on any candidate | Candidate detail opens |
| 9b | All fields visible | Name, Mobile, Position, Department, Education, Experience, Location, Salaries, Notice, Joining, Tech, Rec, Status, Date, Interviewer |
| 9c | Resume button | "View Resume" button visible if Resume URL exists |
| 9d | Open Resume | Drive URL opens in browser/external app |
| 9e | Candidate with no resume | Resume section shows "Not available" |
| 9f | Remarks visible | Any entered remarks displayed |

---

### TC-10: Edit Candidate

| # | Test | Expected |
|---|---|---|
| 10a | Tap Edit on a candidate | Edit form opens pre-filled with all data |
| 10b | Modify Final Status | Change to "Selected" or "Rejected" |
| 10c | Save changes | Loading overlay, then success |
| 10d | Sheet updated | Correct cell updated in Google Sheet |
| 10e | Resume link preserved | Existing resume URL not changed |
| 10f | Edit without changing resume | Resume URL stays the same in Sheet |

---

### TC-11: Resume Replacement

| # | Test | Expected |
|---|---|---|
| 11a | In Edit screen, select new PDF | File name shown under "Replace Resume" |
| 11b | Save with new PDF | New PDF uploaded to Drive |
| 11c | Old resume URL replaced | New Drive URL saved in Resume Link cell |
| 11d | Rich text updated | "📄 Open Resume" links to new file |

---

### TC-12: WhatsApp Sharing

| # | Test | Expected |
|---|---|---|
| 12a | Tap WhatsApp on a candidate | WhatsApp opens (or browser with wa.me link) |
| 12b | Phone number | Target: +91 8452845537 |
| 12c | Message includes Interview ID | ✓ |
| 12d | Message includes Name | ✓ |
| 12e | Message includes Position | ✓ |
| 12f | Message includes Education | ✓ |
| 12g | Message includes Experience | ✓ |
| 12h | Message includes Salaries | ✓ |
| 12i | Message includes Joining Availability | ✓ |
| 12j | Message includes Resume URL | ✓ (if available) |

---

### TC-13: Network Failure Handling

| # | Test | Procedure | Expected |
|---|---|---|---|
| 13a | Disconnect internet, open app | Turn off WiFi/mobile data | Error message shown, not crash |
| 13b | Dashboard load failure | Offline + refresh | "No internet connection" or API error message |
| 13c | Submit while offline | Offline + submit | Error message with "network" or "internet" |
| 13d | Reconnect | Turn on internet + refresh | Data loads successfully |

---

### TC-14: Invalid PDF

| # | Test | Expected |
|---|---|---|
| 14a | Upload corrupted PDF | Error from backend: PDF decoding failed |
| 14b | Upload password-protected PDF | Gemini may return empty fields — no crash |
| 14c | Upload scanned image PDF | Gemini extracts what it can; empty fields are blank |

---

### TC-15: Duplicate Protection

| # | Test | Expected |
|---|---|---|
| 15a | Submit two candidates simultaneously | LockService prevents duplicate IDs |
| 15b | Interview IDs are sequential | No gaps, no duplicates in Sheet |

---

### TC-16: Existing Data Preservation

| # | Test | Expected |
|---|---|---|
| 16a | Check existing rows after deployment | All pre-existing rows untouched |
| 16b | Existing Resume Links | Still functional (not broken by update) |
| 16c | Existing custom formulas | Not overwritten |

---

### TC-17: Web App Backward Compatibility

| # | Test | Expected |
|---|---|---|
| 17a | Open Apps Script web app URL | HTML page loads (not JSON) |
| 17b | Web app New Interview | Works exactly as before |
| 17c | Web app Dashboard | Works exactly as before |
| 17d | Web app Candidates view/edit | Works exactly as before |
| 17e | Web app WhatsApp | Opens wa.me correctly |

---

### TC-18: API Endpoint Tests

| # | Test | Method |
|---|---|---|
| 18a | `?action=bootstrap` | GET → 200 with version |
| 18b | `?action=dashboard` | GET → 200 with stats |
| 18c | `?action=candidates` | GET → 200 with array |
| 18d | `?action=candidate&id=1` | GET → 200 with single candidate |
| 18e | `?action=candidate&id=9999` | GET → 200 with error block (candidate not found) |
| 18f | `?action=dropdowns` | GET → 200 with dropdown arrays |
| 18g | `?action=nextId` | GET → 200 with next ID number |
| 18h | `?action=whatsapp&id=1` | GET → 200 with whatsapp URL |
| 18i | `?action=unknown` | GET → 200 with UNKNOWN_ACTION error |
| 18j | POST `processResume` | POST → 200 with extracted fields |
| 18k | POST `saveCandidate` | POST → 200 with interviewId + resumeUrl |
| 18l | POST `updateCandidate` | POST → 200 with updated interviewId |

---

### TC-19: Empty States

| # | Test | Expected |
|---|---|---|
| 19a | Search with no results | "No matching candidates" empty state |
| 19b | Filter with no matches | Empty state (not crash) |
| 19c | Fresh Sheet (0 rows) | Dashboard shows 0 counts, empty list |

---

### TC-20: End-to-End Full Workflow

| # | Test | Expected |
|---|---|---|
| 20a | Open app → Dashboard loads | ✓ |
| 20b | Navigate to New Interview | ✓ |
| 20c | Pick PDF → AI extracts | ✓ |
| 20d | Review/edit extracted fields | ✓ |
| 20e | Fill manual fields | ✓ |
| 20f | Submit → ID assigned | ✓ |
| 20g | Sheet row created | ✓ |
| 20h | Drive PDF saved | ✓ |
| 20i | Resume Link in Sheet | ✓ |
| 20j | Navigate to Candidates | ✓ |
| 20k | Find new candidate | ✓ |
| 20l | View candidate detail | ✓ |
| 20m | Edit candidate → change status | ✓ |
| 20n | Dashboard reflects update | ✓ |
| 20o | Share via WhatsApp | ✓ |

---

## Sign-Off

| Tester | Date | Platform | All TCs Pass |
|---|---|---|---|
| | | Android | ☐ |
| | | Windows | ☐ |
| | | Web App | ☐ |
| | | Backend API | ☐ |

