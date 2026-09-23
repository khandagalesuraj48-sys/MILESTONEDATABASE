/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * SheetService.gs
 *
 * All Google Sheet read/write operations.
 * Preserves existing data. Never deletes or resets rows.
 ************************************************************/


/************************************************************
 * EXPECTED COLUMN HEADERS
 ************************************************************/

const EXPECTED_HEADERS = [
  "Interview ID",           // 1
  "Interview Date",         // 2
  "Candidate Name",         // 3
  "Mobile No.",             // 4
  "Position Applied For",   // 5
  "Department",             // 6
  "Education / Qualification", // 7
  "Total Experience (Years)",  // 8
  "Current Location",       // 9
  "Current Salary",         // 10
  "Expected Salary",        // 11
  "Notice Period",          // 12
  "Joining Availability",   // 13
  "Technical Knowledge (10)", // 14
  "Recommendation",         // 15
  "Final Status",           // 16
  "Joining Date",           // 17
  "Interviewer",            // 18
  "Resume Link",            // 19
  "Remarks"                 // 20
];


/************************************************************
 * GET TARGET SHEET
 ************************************************************/

function getTargetSheet() {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );

  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === Number(CONFIG.SHEET_GID)) {
      return sheets[i];
    }
  }

  throw new Error(
    "Target sheet not found. Sheet GID: " + CONFIG.SHEET_GID
  );

}


/************************************************************
 * ENSURE REQUIRED COLUMNS EXIST
 ************************************************************/

function ensureRequiredColumns(sheet) {

  const requiredIndexes = {
    "Resume Link": 19,
    "Remarks": 20
  };

  const lastColumn = Math.max(sheet.getLastColumn(), 1);

  const headers = sheet
    .getRange(1, 1, 1, Math.max(lastColumn, 20))
    .getDisplayValues()[0]
    .map(v => String(v || "").trim());

  Object.keys(requiredIndexes).forEach(header => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, requiredIndexes[header]).setValue(header);
    }
  });

}


/************************************************************
 * GET SHEET HEADERS
 ************************************************************/

function getSheetHeaders(sheet) {

  const lastColumn = Math.max(sheet.getLastColumn(), 20);
  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(v => String(v || "").trim());

}


/************************************************************
 * NEXT INTERVIEW ID
 ************************************************************/

function getNextInterviewId() {

  const sheet = getTargetSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return 1;

  const values = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues();

  let maxId = 0;

  values.forEach(row => {
    const value = String(row[0] || "").trim();
    if (!value) return;
    const number = parseInt(value.replace(/[^\d]/g, ""), 10);
    if (!isNaN(number) && number > maxId) maxId = number;
  });

  return maxId + 1;

}


/************************************************************
 * CURRENT DATE
 ************************************************************/

function getCurrentInterviewDate() {

  return Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "yyyy-MM-dd"
  );

}


/************************************************************
 * BUILD CANDIDATE ROW ARRAY
 ************************************************************/

function buildCandidateRow(
  interviewId,
  interviewDate,
  candidate,
  resumeUrl,
  remarks
) {

  return [
    interviewId,
    interviewDate,
    candidate.candidateName || "",
    candidate.mobileNo || "",
    candidate.positionAppliedFor || "",
    candidate.department || "",
    candidate.educationQualification || "",
    candidate.totalExperienceYears || "",
    candidate.currentLocation || "",
    candidate.currentSalary || "",
    candidate.expectedSalary || "",
    candidate.noticePeriod || "",
    candidate.joiningAvailability || "",
    candidate.technicalKnowledge || "",
    candidate.recommendation || "",
    candidate.finalStatus || "",
    candidate.joiningDate || "",
    candidate.interviewer || "",
    resumeUrl || "",
    remarks || ""
  ];

}


/************************************************************
 * SET RESUME LINK CELL (Rich Text Hyperlink)
 ************************************************************/

function setResumeLinkCell(sheet, rowNumber, url) {

  const cell = sheet.getRange(rowNumber, 19);
  cell.clearContent();

  if (!url) return;

  const richText = SpreadsheetApp
    .newRichTextValue()
    .setText("📄 Open Resume")
    .setLinkUrl(url)
    .build();

  cell.setRichTextValue(richText);

}


/************************************************************
 * EXTRACT URL FROM CELL
 * Supports: Rich text, HYPERLINK formula, plain URL, Drive ID
 ************************************************************/

function extractUrlFromCell(range) {

  if (!range) return "";

  // 1. Rich text link
  try {
    const richText = range.getRichTextValue();
    if (richText) {
      const direct = richText.getLinkUrl();
      if (direct) return direct;
      const runs = richText.getRuns();
      if (runs && runs.length) {
        for (let i = 0; i < runs.length; i++) {
          const runUrl = runs[i].getLinkUrl();
          if (runUrl) return runUrl;
        }
      }
    }
  } catch (e) {}

  // 2. HYPERLINK formula
  try {
    const formula = range.getFormula();
    if (formula) {
      const match = formula.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
      if (match && match[1]) return match[1];
    }
  } catch (e) {}

  // 3. Display value
  try {
    const display = String(range.getDisplayValue() || "").trim();
    if (/^https?:\/\//i.test(display)) return display;
    if (/^[a-zA-Z0-9_-]{20,}$/.test(display)) {
      return "https://drive.google.com/file/d/" + display + "/view";
    }
  } catch (e) {}

  return "";

}


/************************************************************
 * GET DATA VALIDATION VALUES FOR DROPDOWNS
 ************************************************************/

function getDataValidationValues(sheet, columnNumber) {

  let rule = null;
  try {
    rule = sheet.getRange(2, columnNumber).getDataValidation();
  } catch (e) {}

  if (!rule) return [];

  const criteria = rule.getCriteriaType();
  const args = rule.getCriteriaValues();

  if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    if (args && args[0] && Array.isArray(args[0])) {
      return args[0].map(v => String(v).trim()).filter(Boolean);
    }
  }

  if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    if (args && args[0]) {
      return args[0]
        .getDisplayValues()
        .flat()
        .map(v => String(v || "").trim())
        .filter(Boolean);
    }
  }

  return [];

}


/************************************************************
 * GET UNIQUE COLUMN VALUES (fallback for dropdowns)
 ************************************************************/

function getUniqueColumnValues(sheet, columnNumber) {

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet
    .getRange(2, columnNumber, lastRow - 1, 1)
    .getDisplayValues()
    .flat()
    .map(v => String(v || "").trim())
    .filter(Boolean);

  return Array.from(new Set(values));

}


/************************************************************
 * GET FORM DROPDOWNS
 ************************************************************/

function getFormDropdowns() {

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const joiningAvailability = getDataValidationValues(sheet, 13);
  const recommendation      = getDataValidationValues(sheet, 15);
  const finalStatus         = getDataValidationValues(sheet, 16);

  return {
    joiningAvailability: joiningAvailability.length ? joiningAvailability : getUniqueColumnValues(sheet, 13),
    recommendation:      recommendation.length      ? recommendation      : getUniqueColumnValues(sheet, 15),
    finalStatus:         finalStatus.length         ? finalStatus         : getUniqueColumnValues(sheet, 16),
    department:          getUniqueColumnValues(sheet, 6),
    position:            getUniqueColumnValues(sheet, 5)
  };

}


/************************************************************
 * FIND CANDIDATE ROW BY ID
 ************************************************************/

function findCandidateRowById(sheet, interviewId) {

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(interviewId).trim()) {
      return i + 2;
    }
  }

  return -1;

}


/************************************************************
 * GET ALL INTERVIEW DATA
 ************************************************************/

function getAllInterviewData() {

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const numRows    = lastRow - 1;
  const lastColumn = Math.max(sheet.getLastColumn(), 20);
  const headers    = getSheetHeaders(sheet);
  const values     = sheet
    .getRange(2, 1, numRows, lastColumn)
    .getDisplayValues();

  const resumeColumnIndex  = headers.indexOf("Resume Link");
  const remarksColumnIndex = headers.indexOf("Remarks");

  // Single batch read of rich text and formulas (NO per-row getRange calls)
  const richTexts = resumeColumnIndex !== -1
    ? sheet.getRange(2, resumeColumnIndex + 1, numRows, 1).getRichTextValues()
    : null;
  const formulas = resumeColumnIndex !== -1
    ? sheet.getRange(2, resumeColumnIndex + 1, numRows, 1).getFormulas()
    : null;

  const result = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row.join("").trim() === "") continue;

    const candidate = {};
    headers.forEach((header, index) => {
      if (header) candidate[header] = row[index] || "";
    });

    // Ensure Interview ID is numeric integer when possible
    const parsedId = parseInt(String(row[0] || "").replace(/[^\d]/g, ""), 10);
    candidate["Interview ID"] = !isNaN(parsedId) && parsedId > 0 ? parsedId : (i + 1);

    // Fast in-memory resume URL extraction
    let resumeUrl = "";
    if (resumeColumnIndex !== -1) {
      if (richTexts && richTexts[i] && richTexts[i][0]) {
        const rt = richTexts[i][0];
        resumeUrl = rt.getLinkUrl() || "";
        if (!resumeUrl) {
          const runs = rt.getRuns();
          if (runs && runs.length) {
            for (let r = 0; r < runs.length; r++) {
              const u = runs[r].getLinkUrl();
              if (u) { resumeUrl = u; break; }
            }
          }
        }
      }
      if (!resumeUrl && formulas && formulas[i] && formulas[i][0]) {
        const formula = formulas[i][0];
        if (/^=HYPERLINK/i.test(formula)) {
          const match = formula.match(/=HYPERLINK\(\s*\"([^\"]+)\"/i);
          if (match && match[1]) resumeUrl = match[1];
        }
      }
      if (!resumeUrl) {
        const display = String(row[resumeColumnIndex] || "").trim();
        if (/^https?:\/\//i.test(display)) {
          resumeUrl = display;
        } else if (/^[a-zA-Z0-9_-]{25,}$/.test(display)) {
          resumeUrl = "https://drive.google.com/file/d/" + display + "/view";
        }
      }
    }

    candidate["Resume URL"] = resumeUrl;
    candidate["Remarks"] = remarksColumnIndex !== -1
      ? row[remarksColumnIndex] || "" : "";

    result.push(candidate);
  }

  return result;

}


/************************************************************
 * GET SINGLE CANDIDATE BY ID
 ************************************************************/

function getCandidateById(interviewId) {

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const rowNumber = findCandidateRowById(sheet, interviewId);
  if (rowNumber === -1) return null;

  const lastColumn = Math.max(sheet.getLastColumn(), 20);
  const headers    = getSheetHeaders(sheet);
  const row        = sheet
    .getRange(rowNumber, 1, 1, lastColumn)
    .getDisplayValues()[0];

  const candidate = {};
  headers.forEach((header, index) => {
    if (header) candidate[header] = row[index] || "";
  });

  const resumeIndex = headers.indexOf("Resume Link");
  let resumeUrl = "";
  if (resumeIndex !== -1) {
    resumeUrl = extractUrlFromCell(sheet.getRange(rowNumber, resumeIndex + 1));
    if (!resumeUrl) {
      const display = String(row[resumeIndex] || "").trim();
      if (/^https?:\/\//i.test(display)) resumeUrl = display;
    }
  }

  candidate["Resume URL"] = resumeUrl;
  return candidate;

}


/************************************************************
 * WRITE NEW CANDIDATE ROW
 ************************************************************/

function writeNewCandidateRow(candidate, resumeUrl, remarks) {

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const interviewId   = getNextInterviewId();
  const interviewDate = getCurrentInterviewDate();

  const row = buildCandidateRow(
    interviewId, interviewDate, candidate, "", remarks
  );

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, 20).setValues([row]);
  setResumeLinkCell(sheet, nextRow, resumeUrl);

  return { interviewId, interviewDate, rowNumber: nextRow };

}


/************************************************************
 * UPDATE EXISTING CANDIDATE ROW
 ************************************************************/

function updateCandidateRow(interviewId, candidate, resumeUrl, remarks) {

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const rowNumber = findCandidateRowById(sheet, interviewId);
  if (rowNumber === -1) throw new Error("Candidate not found.");

  const existing = getCandidateById(interviewId);
  const interviewDate = existing["Interview Date"] || "";

  const row = buildCandidateRow(
    interviewId, interviewDate, candidate, "", remarks
  );

  sheet.getRange(rowNumber, 1, 1, 20).setValues([row]);
  setResumeLinkCell(sheet, rowNumber, resumeUrl);

  return { interviewId, rowNumber };

}

