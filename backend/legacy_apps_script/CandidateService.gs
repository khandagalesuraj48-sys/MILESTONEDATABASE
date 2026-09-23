/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * CandidateService.gs
 *
 * Business logic for creating and updating candidates.
 * Uses LockService to prevent duplicate IDs.
 * PDF saved only on confirmed submission.
 ************************************************************/


/************************************************************
 * SAVE NEW CANDIDATE
 *
 * Workflow:
 * 1. Validate PDF
 * 2. Acquire script lock
 * 3. Generate Interview ID (server-side, authoritative)
 * 4. Save PDF to Drive
 * 5. Write row to Sheet
 * 6. Set Resume Link (Rich Text)
 * 7. Release lock
 * 8. Rollback Drive file if Sheet write fails
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

    // Save PDF only on Submit
    const resume        = saveResumePDF(payload.file, interviewId);
    savedDriveFileId    = resume.fileId;

    // Write row
    const row     = buildCandidateRow(interviewId, interviewDate, candidate, "", remarks);
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, 20).setValues([row]);
    setResumeLinkCell(sheet, nextRow, resume.url);

    return {
      success:        true,
      interviewId:    interviewId,
      interviewDate:  interviewDate,
      resumeFileId:   resume.fileId,
      resumeFileName: resume.fileName,
      resumeUrl:      resume.url,
      remarks:        remarks,
      rowNumber:      nextRow
    };

  } catch (error) {
    // Rollback: trash the Drive file if Sheet write failed
    trashDriveFile(savedDriveFileId);
    throw new Error(error.message || "Candidate save failed.");

  } finally {
    lock.releaseLock();
  }

}


/************************************************************
 * UPDATE EXISTING CANDIDATE
 *
 * Existing resume preserved unless replaceResume === true
 * and a valid new file is provided.
 ************************************************************/

function updateCandidate(payload) {

  if (!payload)              throw new Error("Update data is missing.");
  if (!payload.interviewId)  throw new Error("Interview ID is required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let newResumeFileId = null;

  try {

    const sheet = getTargetSheet();
    ensureRequiredColumns(sheet);

    const rowNumber = findCandidateRowById(sheet, payload.interviewId);
    if (rowNumber === -1) throw new Error("Candidate not found.");

    const existing  = getCandidateById(payload.interviewId);
    const candidate = payload.candidate || {};

    const interviewId   = existing["Interview ID"] || payload.interviewId;
    const interviewDate = existing["Interview Date"] || "";

    let resumeUrl = existing["Resume URL"] || "";

    const remarks = Object.prototype.hasOwnProperty.call(candidate, "remarks")
      ? String(candidate.remarks || "")
      : String(existing["Remarks"] || "");

    // Replace resume only when explicitly requested and a new PDF was sent
    if (payload.replaceResume === true && payload.file && payload.file.base64) {
      validatePDF(payload.file);
      const newResume  = saveResumePDF(payload.file, interviewId);
      newResumeFileId  = newResume.fileId;
      resumeUrl        = newResume.url;
    }

    const row = buildCandidateRow(
      interviewId, interviewDate, candidate, "", remarks
    );
    sheet.getRange(rowNumber, 1, 1, 20).setValues([row]);
    setResumeLinkCell(sheet, rowNumber, resumeUrl);

    return {
      success:    true,
      interviewId: interviewId,
      rowNumber:  rowNumber,
      resumeUrl:  resumeUrl,
      remarks:    remarks
    };

  } catch (error) {
    trashDriveFile(newResumeFileId);
    throw new Error(error.message || "Candidate update failed.");

  } finally {
    lock.releaseLock();
  }

}

