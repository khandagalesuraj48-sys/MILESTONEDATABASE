/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * Code.gs — COMPLETE UNIFIED BACKEND & API LAYER
 *
 * Google Apps Script + Google Sheet + Google Drive + Gemini
 *
 * Supports:
 * 1. Web App frontend (Index.html via HtmlService)
 * 2. Native Android & Windows Apps (REST JSON API via doGet / doPost)
 *
 * GEMINI API KEY SECURITY:
 * Stored ONLY in Script Properties: GEMINI_API_KEY
 * Never hardcoded in this script or returned to clients.
 ************************************************************/


/************************************************************
 * CONFIG
 ************************************************************/

const CONFIG = {

  SPREADSHEET_ID:
    "1oFCdVS50HLpAbj19Utl7Df9ct-SUdWf2eDuUyedAghg",

  SHEET_GID:
    1604294621,

  RESUME_FOLDER_ID:
    "1GNRuCR122lHaxkx_Yty4OUKf0dX1vyqH",

  RESUME_FOLDER_NAME:
    "resume",

  GEMINI_MODEL:
    "gemini-3.5-flash-lite",

  GEMINI_FALLBACK_MODEL:
    "gemini-3.6-flash",

  GEMINI_MAX_RETRIES:
    1,

  GEMINI_FALLBACK_RETRIES:
    1,

  GEMINI_RETRY_BASE_MS:
    1000,

  MAX_FILE_SIZE_MB:
    20,

  TIMEZONE:
    "Asia/Kolkata",

  WHATSAPP_NUMBER:
    "918452845537",

  APP_VERSION:
    "2.0.0"

};


/************************************************************
 * SHEET HEADERS
 ************************************************************/

const EXPECTED_HEADERS = [

  "Interview ID",              // 1
  "Interview Date",            // 2
  "Candidate Name",            // 3
  "Mobile No.",                // 4
  "Position Applied For",      // 5
  "Department",                // 6
  "Education / Qualification", // 7
  "Total Experience (Years)",  // 8
  "Current Location",          // 9
  "Current Salary",            // 10
  "Expected Salary",           // 11
  "Notice Period",             // 12
  "Joining Availability",      // 13
  "Technical Knowledge (10)",  // 14
  "Recommendation",            // 15
  "Final Status",              // 16
  "Joining Date",              // 17
  "Interviewer",               // 18
  "Resume Link",               // 19
  "Remarks"                    // 20

];


/************************************************************
 * API RESPONSE HELPERS
 ************************************************************/

function apiSuccess(data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data:    data || null,
      message: message || "OK"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiError(code, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: {
        code:    String(code    || "ERROR"),
        message: String(message || "An error occurred.")
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeRun(fn, name) {
  const start = new Date().getTime();
  try {
    const result = fn();
    const durationMs = new Date().getTime() - start;
    return ContentService
      .createTextOutput(JSON.stringify({
        success:    true,
        data:       result || null,
        message:    "OK",
        durationMs: durationMs
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    const durationMs = new Date().getTime() - start;
    console.error("[API Error] " + (name || "") + ": " + e.message);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: {
          code:       "SERVER_ERROR",
          message:    String(e.message || "An error occurred."),
          durationMs: durationMs
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/************************************************************
 * WEB APP & REST API ROUTER (doGet)
 ************************************************************/

function doGet(e) {

  // If no action parameter → serve HTML web app
  if (!e || !e.parameter || !e.parameter.action) {
    return HtmlService
      .createTemplateFromFile("Index")
      .evaluate()
      .setTitle("AI Resume Interview System")
      .setXFrameOptionsMode(
        HtmlService.XFrameOptionsMode.ALLOWALL
      );
  }

  const action = String(e.parameter.action || "").trim().toLowerCase();
  const id     = String(e.parameter.id     || "").trim();

  switch (action) {

    case "bootstrap":
      return safeRun(() => ({
        version:       CONFIG.APP_VERSION,
        date:          getCurrentInterviewDate(),
        serverTime:    new Date().toISOString(),
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        sheetGid:      CONFIG.SHEET_GID
      }));

    case "dashboard":
      return safeRun(() => getDashboardData());

    case "candidates":
      return safeRun(() => getAllInterviewData());

    case "candidate":
      if (!id) return apiError("MISSING_PARAM", "id parameter is required.");
      return safeRun(() => {
        const candidate = getCandidateById(id);
        if (!candidate) throw new Error("Candidate not found: " + id);
        return candidate;
      });

    case "dropdowns":
      return safeRun(() => getFormDropdowns());

    case "nextid":
      return safeRun(() => ({
        nextId: getNextInterviewId(),
        date:   getCurrentInterviewDate()
      }));

    case "whatsapp":
      if (!id) return apiError("MISSING_PARAM", "id parameter is required.");
      return safeRun(() => getWhatsAppShareData(id));

    default:
      return apiError("UNKNOWN_ACTION", "Unknown action: " + action);

  }

}


/************************************************************
 * REST API ROUTER (doPost)
 ************************************************************/

function doPost(e) {

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return apiError("INVALID_JSON", "Request body must be valid JSON.");
  }

  const action = String(payload.action || "").trim().toLowerCase();

  switch (action) {

    // -------------------------------------------------------
    // PROCESS RESUME — Gemini extraction only, NO Drive save
    // -------------------------------------------------------
    case "processresume":
      return safeRun(() => {
        if (!payload.file) throw new Error("file is required.");
        return processResume(payload.file);
      });

    // -------------------------------------------------------
    // SAVE CANDIDATE — Drive save + Sheet row + LockService
    // -------------------------------------------------------
    case "savecandidate":
      return safeRun(() => {
        if (!payload.file)      throw new Error("file is required.");
        if (!payload.candidate) throw new Error("candidate is required.");
        return saveCandidate({
          file:      payload.file,
          candidate: payload.candidate,
          remarks:   payload.remarks || ""
        });
      });

    // -------------------------------------------------------
    // UPDATE CANDIDATE — edit details / optionally replace PDF
    // -------------------------------------------------------
    case "updatecandidate":
      return safeRun(() => {
        if (!payload.interviewId) throw new Error("interviewId is required.");
        if (!payload.candidate)   throw new Error("candidate is required.");
        return updateCandidate({
          interviewId:   payload.interviewId,
          candidate:     payload.candidate,
          replaceResume: payload.replaceResume === true,
          file:          payload.file || null
        });
      });

    default:
      return apiError("UNKNOWN_ACTION", "Unknown action: " + action);

  }

}


/************************************************************
 * TARGET SHEET
 ************************************************************/

function getTargetSheet() {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );

  const sheets =
    ss.getSheets();

  for (
    let i = 0;
    i < sheets.length;
    i++
  ) {

    if (
      sheets[i].getSheetId() ===
      Number(CONFIG.SHEET_GID)
    ) {

      return sheets[i];

    }

  }

  throw new Error(
    "Target sheet not found. Sheet GID: " +
    CONFIG.SHEET_GID
  );

}


/************************************************************
 * REQUIRED COLUMNS
 ************************************************************/

function ensureRequiredColumns(sheet) {

  const requiredIndexes = {
    "Resume Link": 19,
    "Remarks": 20
  };

  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );

  const headers =
    sheet
      .getRange(1, 1, 1, Math.max(lastColumn, 20))
      .getDisplayValues()[0]
      .map(v => String(v || "").trim());

  Object.keys(requiredIndexes).forEach(header => {
    if (headers.indexOf(header) === -1) {
      sheet
        .getRange(1, requiredIndexes[header])
        .setValue(header);
    }
  });

}


/************************************************************
 * SHEET HEADERS
 ************************************************************/

function getSheetHeaders(sheet) {

  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      20
    );

  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(v => String(v || "").trim());

}


/************************************************************
 * NEXT INTERVIEW ID (server-side authoritative)
 ************************************************************/

function getNextInterviewId() {

  const sheet =
    getTargetSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const values =
    sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getDisplayValues();

  let maxId = 0;

  values.forEach(row => {

    const value =
      String(row[0] || "").trim();

    if (!value) return;

    const number =
      parseInt(
        value.replace(/[^\d]/g, ""),
        10
      );

    if (
      !isNaN(number) &&
      number > maxId
    ) {
      maxId = number;
    }

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
 * GEMINI API KEY
 ************************************************************/

function getGeminiKey() {

  const key =
    PropertiesService
      .getScriptProperties()
      .getProperty("GEMINI_API_KEY");

  if (!key) {

    throw new Error(
      "GEMINI_API_KEY is missing in Script Properties."
    );

  }

  return key.trim();

}


/************************************************************
 * DRIVE RESUME FOLDER
 ************************************************************/

function getResumeFolderUrl() {

  return (
    "https://drive.google.com/drive/folders/" +
    CONFIG.RESUME_FOLDER_ID
  );

}

function getResumeFolder() {

  const folderId =
    String(CONFIG.RESUME_FOLDER_ID || "").trim();

  const folderName =
    String(CONFIG.RESUME_FOLDER_NAME || "").trim();

  try {
    const folder =
      DriveApp.getFolderById(folderId);
    if (folder) return folder;
  } catch (e) {
    console.log("Folder lookup by ID failed: " + e.message);
  }

  if (folderName) {
    try {
      const folders =
        DriveApp.getFoldersByName(folderName);
      while (folders.hasNext()) {
        const folder = folders.next();
        if (folder.getId() === folderId) {
          return folder;
        }
      }
    } catch (e) {
      console.log("Folder lookup by name failed: " + e.message);
    }
  }

  throw new Error(
    "Cannot access Resume Folder ID: " + folderId
  );

}


/************************************************************
 * VALIDATE PDF
 ************************************************************/

function validatePDF(file) {

  if (!file) {
    throw new Error("No file uploaded.");
  }

  if (
    !file.fileName ||
    !file.base64
  ) {
    throw new Error("Invalid file upload payload.");
  }

  const isPdf =
    String(file.fileName).toLowerCase().endsWith(".pdf") ||
    String(file.mimeType || "").toLowerCase() === "application/pdf";

  if (!isPdf) {
    throw new Error("Only PDF files are supported.");
  }

  const approximateBytes =
    (file.base64.length * 3) / 4;

  const maxBytes =
    CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;

  if (approximateBytes > maxBytes) {
    throw new Error(
      `File exceeds ${CONFIG.MAX_FILE_SIZE_MB}MB limit.`
    );
  }

}


/************************************************************
 * GEMINI RETRY & CALL HELPERS
 ************************************************************/

function isTransientGeminiError(code) {
  return [408, 409, 425, 429, 500, 502, 503, 504].indexOf(Number(code)) !== -1;
}

function getGeminiErrorMessage(code, body) {
  let message = body;
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed.error && parsed.error.message) {
      message = parsed.error.message;
    }
  } catch (e) {}
  return "Gemini API Error (" + code + "): " + message;
}

function getRetryDelay(attempt) {
  return CONFIG.GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
}

function callGeminiWithRetry(endpoint, payload, maxRetries) {

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {

    try {

      const response =
        UrlFetchApp.fetch(endpoint, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });

      const code = response.getResponseCode();
      const text = response.getContentText();

      if (code >= 200 && code < 300) {
        return text;
      }

      const msg = getGeminiErrorMessage(code, text);
      lastError = new Error(msg);

      if (attempt < maxRetries && isTransientGeminiError(code)) {
        Utilities.sleep(getRetryDelay(attempt));
        continue;
      }

      throw lastError;

    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        Utilities.sleep(getRetryDelay(attempt));
        continue;
      }
      throw lastError;
    }

  }

  throw lastError || new Error("Gemini call failed.");

}

function getGeminiResponseText(file) {

  const key = getGeminiKey();

  const prompt =
    `You are an expert HR resume parser. Extract candidate details from this resume.\n` +
    `Return ONLY a raw valid JSON object with EXACTLY these string keys:\n` +
    `{\n` +
    `  "Candidate Name": "",\n` +
    `  "Mobile No.": "",\n` +
    `  "Position Applied For": "",\n` +
    `  "Department": "",\n` +
    `  "Education / Qualification": "",\n` +
    `  "Total Experience (Years)": "",\n` +
    `  "Current Location": "",\n` +
    `  "Current Salary": "",\n` +
    `  "Expected Salary": "",\n` +
    `  "Notice Period": ""\n` +
    `}\n` +
    `Extract only facts from the document. Do not invent. Use empty string for missing fields.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "application/pdf",
              data: file.base64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1
    }
  };

  // Try primary model
  const primaryEndpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${key}`;

  try {
    return callGeminiWithRetry(primaryEndpoint, payload, CONFIG.GEMINI_MAX_RETRIES);
  } catch (primaryError) {

    console.warn("Primary Gemini model failed, trying fallback: " + primaryError.message);

    const fallbackEndpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_FALLBACK_MODEL}:generateContent?key=${key}`;

    return callGeminiWithRetry(fallbackEndpoint, payload, CONFIG.GEMINI_FALLBACK_RETRIES);

  }

}

function cleanJsonText(raw) {

  let clean = raw.trim();

  clean = clean.replace(/^```json\s*/i, "");
  clean = clean.replace(/^```\s*/i, "");
  clean = clean.replace(/\s*```$/i, "");

  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    clean = clean.substring(start, end + 1);
  }

  return clean.trim();

}

function extractCandidateData(file) {

  const responseText =
    getGeminiResponseText(file);

  const responseJson =
    JSON.parse(responseText);

  const candidatePart =
    responseJson.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidatePart) {
    throw new Error("Empty response received from Gemini.");
  }

  const cleanedJson =
    cleanJsonText(candidatePart);

  return JSON.parse(cleanedJson);

}


/************************************************************
 * PROCESS RESUME (Gemini only, NO Drive save)
 ************************************************************/

function processResume(file) {

  validatePDF(file);

  const extracted =
    extractCandidateData(file);

  return {
    success:   true,
    candidate: extracted
  };

}


/************************************************************
 * SAVE RESUME PDF TO DRIVE
 ************************************************************/

function saveResumePDF(file, interviewId) {

  const folder =
    getResumeFolder();

  const bytes =
    Utilities.base64Decode(file.base64);

  const blob =
    Utilities.newBlob(
      bytes,
      "application/pdf",
      `Resume_${interviewId}_${file.fileName}`
    );

  const driveFile =
    folder.createFile(blob);

  driveFile.setDescription(
    `Resume for Interview ID ${interviewId}`
  );

  return {
    fileId: driveFile.getId(),
    url:    driveFile.getUrl()
  };

}


/************************************************************
 * EXTRACT URL FROM CELL (Rich Text / Hyperlink / Plain)
 ************************************************************/

function extractUrlFromCell(range) {

  if (!range) return "";

  // 1. Rich Text
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
    if (formula && /^=HYPERLINK/i.test(formula)) {
      const match = formula.match(/=HYPERLINK\(\s*\"([^\"]+)\"/i);
      if (match && match[1]) return match[1];
    }
  } catch (e) {}

  // 3. Plain text URL
  try {
    const val = String(range.getDisplayValue() || "").trim();
    if (/^https?:\/\//i.test(val)) return val;
    if (/^[a-zA-Z0-9_-]{25,}$/.test(val)) {
      return "https://drive.google.com/file/d/" + val + "/view";
    }
  } catch (e) {}

  return "";

}


/************************************************************
 * SET RESUME LINK CELL
 ************************************************************/

function setResumeLinkCell(sheet, rowNumber, url) {

  const cell = sheet.getRange(rowNumber, 19);
  cell.clearContent();

  if (!url) return;

  const richText =
    SpreadsheetApp
      .newRichTextValue()
      .setText("📄 Open Resume")
      .setLinkUrl(url)
      .build();

  cell.setRichTextValue(richText);

}


/************************************************************
 * BUILD ROW ARRAY
 ************************************************************/

function buildCandidateRow(interviewId, interviewDate, candidate, resumeUrl, remarks) {

  return [
    interviewId,
    interviewDate,
    candidate["Candidate Name"]            || candidate.candidateName            || "",
    candidate["Mobile No."]                || candidate.mobileNo                || "",
    candidate["Position Applied For"]      || candidate.positionApplied         || "",
    candidate["Department"]                || candidate.department              || "",
    candidate["Education / Qualification"] || candidate.education               || "",
    candidate["Total Experience (Years)"]  || candidate.totalExperience         || "",
    candidate["Current Location"]          || candidate.currentLocation         || "",
    candidate["Current Salary"]            || candidate.currentSalary           || "",
    candidate["Expected Salary"]           || candidate.expectedSalary          || "",
    candidate["Notice Period"]             || candidate.noticePeriod            || "",
    candidate["Joining Availability"]      || candidate.joiningAvailability     || "",
    candidate["Technical Knowledge (10)"]  || candidate.technicalKnowledge      || "",
    candidate["Recommendation"]            || candidate.recommendation          || "",
    candidate["Final Status"]              || candidate.finalStatus             || "Pending",
    candidate["Joining Date"]              || candidate.joiningDate             || "",
    candidate["Interviewer"]               || candidate.interviewer             || "",
    resumeUrl                              || "",
    remarks                                || ""
  ];

}


/************************************************************
 * SAVE NEW CANDIDATE (Atomic LockService)
 ************************************************************/

function saveCandidate(payload) {

  if (!payload)       throw new Error("Candidate data is missing.");
  if (!payload.file)  throw new Error("Resume PDF is required.");

  validatePDF(payload.file);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let savedDriveFileId = null;

  try {

    const sheet         = getTargetSheet();
    ensureRequiredColumns(sheet);

    const interviewId   = getNextInterviewId();
    const interviewDate = getCurrentInterviewDate();
    const candidate     = payload.candidate || {};
    const remarks       = String(candidate.remarks || payload.remarks || "").trim();

    // 1. Save PDF to Drive only after submission
    const driveStart    = new Date().getTime();
    const resume        = saveResumePDF(payload.file, interviewId);
    const driveSaveMs   = new Date().getTime() - driveStart;
    savedDriveFileId    = resume.fileId;

    // 2. Append row to Sheet
    const sheetStart    = new Date().getTime();
    const row     = buildCandidateRow(interviewId, interviewDate, candidate, "", remarks);
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, 20).setValues([row]);

    // 3. Set Rich Text Resume Link
    setResumeLinkCell(sheet, nextRow, resume.url);
    const sheetWriteMs  = new Date().getTime() - sheetStart;

    return {
      success:        true,
      interviewId:    interviewId,
      interviewDate:  interviewDate,
      resumeUrl:      resume.url,
      driveFileId:    resume.fileId,
      message:        "Candidate saved successfully with Interview ID: " + interviewId,
      _perf: {
        driveSaveMs:  driveSaveMs,
        sheetWriteMs: sheetWriteMs
      }
    };

  } catch (error) {

    // Rollback Drive file if Sheet append failed
    if (savedDriveFileId) {
      try {
        DriveApp.getFileById(savedDriveFileId).setTrashed(true);
      } catch (e) {}
    }
    throw error;

  } finally {
    lock.releaseLock();
  }

}


/************************************************************
 * FIND CANDIDATE ROW BY ID
 ************************************************************/

function findCandidateRowById(sheet, interviewId) {

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const ids =
    sheet
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
 * GET CANDIDATE BY ID
 ************************************************************/

function getCandidateById(interviewId) {

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const rowNumber = findCandidateRowById(sheet, interviewId);
  if (rowNumber === -1) return null;

  const headers = getSheetHeaders(sheet);
  const row = sheet.getRange(rowNumber, 1, 1, 20).getDisplayValues()[0];

  const candidate = {};
  headers.forEach((header, index) => {
    if (header) candidate[header] = row[index] || "";
  });

  const parsedId = parseInt(String(row[0] || "").replace(/[^\d]/g, ""), 10);
  candidate["Interview ID"] = !isNaN(parsedId) && parsedId > 0 ? parsedId : row[0];

  candidate["Resume URL"] = extractUrlFromCell(sheet.getRange(rowNumber, 19));
  candidate["Remarks"]    = row[19] || "";

  return candidate;

}


/************************************************************
 * UPDATE CANDIDATE
 ************************************************************/

function updateCandidate(payload) {

  if (!payload || !payload.interviewId) {
    throw new Error("interviewId is required.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {

    const sheet = getTargetSheet();
    ensureRequiredColumns(sheet);

    const rowNumber = findCandidateRowById(sheet, payload.interviewId);
    if (rowNumber === -1) {
      throw new Error("Candidate not found: " + payload.interviewId);
    }

    const candidate     = payload.candidate || {};
    const existingDate  = sheet.getRange(rowNumber, 2).getDisplayValue();
    const existingUrl   = extractUrlFromCell(sheet.getRange(rowNumber, 19));
    const remarks       = String(candidate.remarks || payload.remarks || "").trim();

    let newResumeUrl = existingUrl;

    if (payload.replaceResume === true && payload.file) {
      validatePDF(payload.file);
      const resume = saveResumePDF(payload.file, payload.interviewId);
      newResumeUrl = resume.url;
      setResumeLinkCell(sheet, rowNumber, newResumeUrl);
    }

    const updatedRow = buildCandidateRow(
      payload.interviewId,
      existingDate,
      candidate,
      "",
      remarks
    );

    sheet.getRange(rowNumber, 1, 1, 18).setValues([updatedRow.slice(0, 18)]);
    sheet.getRange(rowNumber, 20).setValue(remarks);

    return {
      success:     true,
      interviewId: payload.interviewId,
      resumeUrl:   newResumeUrl,
      message:     "Candidate updated successfully."
    };

  } finally {
    lock.releaseLock();
  }

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
    candidate["Remarks"]    = remarksColumnIndex !== -1
      ? row[remarksColumnIndex] || "" : "";

    result.push(candidate);

  }

  return result;

}


/************************************************************
 * DASHBOARD DATA
 ************************************************************/

function getDashboardData() {

  const candidates = getAllInterviewData();

  let selected = 0;
  let rejected = 0;
  let pending  = 0;

  candidates.forEach(c => {
    const status = String(c["Final Status"] || "").trim().toLowerCase();
    if (status === "selected" || status === "select") {
      selected++;
    } else if (status === "rejected" || status === "reject") {
      rejected++;
    } else {
      pending++;
    }
  });

  return {
    total:      candidates.length,
    selected:   selected,
    rejected:   rejected,
    pending:    pending,
    candidates: candidates
  };

}


/************************************************************
 * FORM DROPDOWNS
 ************************************************************/

function getDataValidationValues(sheet, columnNumber) {

  const rule =
    sheet
      .getRange(2, columnNumber)
      .getDataValidation();

  if (!rule) return [];

  const criteria = rule.getCriteriaType();
  const args     = rule.getCriteriaValues();

  if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    if (args && args[0]) {
      return args[0].map(v => String(v || "").trim()).filter(Boolean);
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

function getUniqueColumnValues(sheet, columnNumber) {

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values =
    sheet
      .getRange(2, columnNumber, lastRow - 1, 1)
      .getDisplayValues()
      .flat()
      .map(v => String(v || "").trim())
      .filter(Boolean);

  return Array.from(new Set(values));

}

function getFormDropdowns() {

  const cache = CacheService.getScriptCache();
  const cached = cache.get("DROPDOWNS_CACHE_V2");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);

  const joiningAvailability = getDataValidationValues(sheet, 13);
  const recommendation      = getDataValidationValues(sheet, 15);
  const finalStatus         = getDataValidationValues(sheet, 16);

  const result = {
    joiningAvailability: joiningAvailability.length ? joiningAvailability : getUniqueColumnValues(sheet, 13),
    recommendation:      recommendation.length      ? recommendation      : getUniqueColumnValues(sheet, 15),
    finalStatus:         finalStatus.length         ? finalStatus         : getUniqueColumnValues(sheet, 16),
    department:          getUniqueColumnValues(sheet, 6),
    position:            getUniqueColumnValues(sheet, 5)
  };

  try {
    cache.put("DROPDOWNS_CACHE_V2", JSON.stringify(result), 21600); // 6 hours
  } catch (e) {}

  return result;

}


/************************************************************
 * WHATSAPP SHARE
 ************************************************************/

function getWhatsAppShareData(interviewId) {

  const candidate = getCandidateById(interviewId);
  if (!candidate) throw new Error("Candidate not found: " + interviewId);

  const name       = candidate["Candidate Name"]            || "";
  const position   = candidate["Position Applied For"]      || "";
  const education  = candidate["Education / Qualification"] || "";
  const experience = candidate["Total Experience (Years)"]  || "";
  const currSal    = candidate["Current Salary"]            || "";
  const expSal     = candidate["Expected Salary"]           || "";
  const joining    = candidate["Joining Availability"]      || "";
  const resumeUrl  = candidate["Resume URL"]                || "";

  const message =
    `Candidate Interview Details\n\n` +
    `Interview ID: ${interviewId}\n` +
    `Candidate Name: ${name}\n` +
    `Position Applied For: ${position}\n` +
    `Education / Qualification: ${education}\n` +
    `Total Experience (Years): ${experience}\n` +
    `Current Salary: ${currSal}\n` +
    `Expected Salary: ${expSal}\n` +
    `Joining Availability: ${joining}\n` +
    (resumeUrl ? `\nResume: ${resumeUrl}` : "\nResume: Not available");

  const whatsappUrl =
    "https://wa.me/" +
    CONFIG.WHATSAPP_NUMBER +
    "?text=" +
    encodeURIComponent(message);

  return {
    success:        true,
    whatsappNumber: CONFIG.WHATSAPP_NUMBER,
    message:        message,
    whatsappUrl:    whatsappUrl,
    resumeUrl:      resumeUrl
  };

}


/************************************************************
 * BACKWARD COMPATIBILITY — functions called by Index.html
 ************************************************************/

function getInterviewData()          { return getAllInterviewData(); }
function getNextInterviewIdForForm() { return getNextInterviewId(); }
function testGeminiKey()             { return !!getGeminiKey(); }
function testResumeFolder()          { return !!getResumeFolder(); }
function testResumeFolderWriteAccess() {
  const f = getResumeFolder();
  const file = f.createFile("test.tmp", "test");
  file.setTrashed(true);
  return true;
}
function testSystem() {
  return {
    sheet:  true,
    drive:  true,
    gemini: !!getGeminiKey()
  };
}
