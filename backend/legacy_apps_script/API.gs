/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * API.gs
 *
 * REST-style JSON API layer for native Android / Windows clients.
 *
 * Routing:
 *   GET  ?action=bootstrap          → version, date
 *   GET  ?action=dashboard          → stats + all candidates
 *   GET  ?action=candidates         → all candidates
 *   GET  ?action=candidate&id=X     → single candidate
 *   GET  ?action=dropdowns          → form dropdown values
 *   GET  ?action=nextId             → next Interview ID preview
 *   GET  ?action=whatsapp&id=X      → WhatsApp share data
 *   POST action=processResume       → Gemini extraction (no Drive save)
 *   POST action=saveCandidate       → full save (Drive + Sheet)
 *   POST action=updateCandidate     → update (optionally replace PDF)
 *
 * All responses: { success, data, message } or { success, error: { code, message } }
 *
 * SECURITY:
 * - Gemini key never returned to clients
 * - No internal secrets exposed
 * - All inputs validated server-side
 ************************************************************/


/************************************************************
 * RESPONSE HELPERS
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

function apiError(code, message, httpCode) {
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

function safeRun(fn) {
  try {
    const result = fn();
    return apiSuccess(result);
  } catch (e) {
    console.error("[API Error] " + e.message);
    return apiError("SERVER_ERROR", e.message);
  }
}


/************************************************************
 * doGet — handles HTML web app + GET API requests
 ************************************************************/

function doGet(e) {

  // If no action parameter → serve existing web UI
  if (!e || !e.parameter || !e.parameter.action) {
    return HtmlService
      .createTemplateFromFile("Index")
      .evaluate()
      .setTitle("AI Resume Interview System")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const action = String(e.parameter.action || "").trim().toLowerCase();
  const id     = String(e.parameter.id     || "").trim();

  switch (action) {

    case "bootstrap":
      return safeRun(() => ({
        version:      CONFIG.APP_VERSION,
        date:         getCurrentInterviewDate(),
        serverTime:   new Date().toISOString(),
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        sheetGid:     CONFIG.SHEET_GID
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
 * doPost — handles POST API requests from native clients
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
    // SAVE NEW CANDIDATE — Drive save + Sheet row + Resume Link
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
    // UPDATE CANDIDATE — optionally replace PDF
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
 * FULL SYSTEM TEST
 ************************************************************/

function testSystem() {

  const result = {
    sheet:              false,
    gemini:             false,
    drive:              false,
    driveWrite:         false,
    driveFolderId:      CONFIG.RESUME_FOLDER_ID,
    driveFolderName:    "",
    driveFolderUrl:     getResumeFolderUrl(),
    nextInterviewId:    null,
    geminiModel:        CONFIG.GEMINI_MODEL,
    geminiFallback:     CONFIG.GEMINI_FALLBACK_MODEL,
    whatsappNumber:     CONFIG.WHATSAPP_NUMBER,
    appVersion:         CONFIG.APP_VERSION
  };

  try {
    const sheet = getTargetSheet();
    ensureRequiredColumns(sheet);
    result.sheet = true;
  } catch (e) { console.log("Sheet error: " + e.message); }

  try {
    const folder = getResumeFolder();
    result.drive = true;
    result.driveFolderName = folder.getName();
  } catch (e) { console.log("Drive error: " + e.message); }

  if (result.drive) {
    try {
      testResumeFolderWriteAccess();
      result.driveWrite = true;
    } catch (e) { console.log("Drive write error: " + e.message); }
  }

  try {
    testGeminiKey();
    result.gemini = true;
  } catch (e) { console.log("Gemini error: " + e.message); }

  try {
    result.nextInterviewId = getNextInterviewId();
  } catch (e) { console.log("ID error: " + e.message); }

  console.log("========================================");
  console.log("AI RESUME INTERVIEW SYSTEM TEST v" + CONFIG.APP_VERSION);
  console.log(JSON.stringify(result, null, 2));
  console.log("========================================");

  return result;

}


/************************************************************
 * CHECK SHEET SETUP
 ************************************************************/

function checkSheetSetup() {
  const sheet = getTargetSheet();
  ensureRequiredColumns(sheet);
  return {
    spreadsheetId:   CONFIG.SPREADSHEET_ID,
    sheetName:       sheet.getName(),
    sheetGid:        sheet.getSheetId(),
    resumeLinkColumn: 19,
    remarksColumn:   20,
    lastRow:         sheet.getLastRow(),
    lastColumn:      sheet.getLastColumn()
  };
}


/************************************************************
 * BACKWARD COMPAT — old web app helpers
 ************************************************************/

function getNextInterviewIdForForm()  { return getNextInterviewId(); }
function ensureResumeLinkColumn(s)    { ensureRequiredColumns(s); return 19; }
function ensureRemarksColumn(s)       { ensureRequiredColumns(s); return 20; }
function getInterviewData()           { return getAllInterviewData(); }

function testDriveIdentity() {
  return {
    effectiveUser: Session.getEffectiveUser().getEmail(),
    folderId:      CONFIG.RESUME_FOLDER_ID,
    folderName:    CONFIG.RESUME_FOLDER_NAME
  };
}

