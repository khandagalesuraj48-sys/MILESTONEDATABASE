/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * DriveService.gs
 *
 * Google Drive resume folder access and PDF storage.
 * PDF is saved ONLY after a successful candidate submission.
 ************************************************************/


/************************************************************
 * GET RESUME FOLDER URL (public display)
 ************************************************************/

function getResumeFolderUrl() {
  return "https://drive.google.com/drive/folders/" + CONFIG.RESUME_FOLDER_ID;
}


/************************************************************
 * GET RESUME FOLDER (with fallback by name)
 ************************************************************/

function getResumeFolder() {

  const folderId   = String(CONFIG.RESUME_FOLDER_ID || "").trim();
  const folderName = String(CONFIG.RESUME_FOLDER_NAME || "").trim();

  // Attempt 1: exact ID
  try {
    const folder = DriveApp.getFolderById(folderId);
    if (folder) return folder;
  } catch (e) {
    console.log("Exact folder lookup failed: " + e.message);
  }

  // Attempt 2: name + ID cross-check
  if (folderName) {
    try {
      const folders = DriveApp.getFoldersByName(folderName);
      while (folders.hasNext()) {
        const folder = folders.next();
        if (folder.getId() === folderId) return folder;
      }
    } catch (e) {
      console.log("Folder name lookup failed: " + e.message);
    }
  }

  throw new Error(
    "Cannot access Resume Folder.\n" +
    "Folder ID: " + folderId + "\n" +
    "Folder URL: " + getResumeFolderUrl() + "\n" +
    "Make sure the Apps Script account has access."
  );

}


/************************************************************
 * VALIDATE PDF FILE OBJECT
 * file = { fileName, mimeType, base64 }
 ************************************************************/

function validatePDF(file) {

  if (!file) throw new Error("Resume PDF is required.");

  const mime = String(file.mimeType || "").toLowerCase();
  const name = String(file.fileName || "").toLowerCase();

  if (mime !== "application/pdf" && !name.endsWith(".pdf")) {
    throw new Error("Only PDF resume files are allowed.");
  }

  if (!file.base64) throw new Error("PDF data is missing.");

  const estimatedBytes = Math.ceil(String(file.base64).length * 0.75);
  const maxBytes       = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;

  if (estimatedBytes > maxBytes) {
    throw new Error(
      "PDF is too large. Maximum size is " + CONFIG.MAX_FILE_SIZE_MB + " MB."
    );
  }

}


/************************************************************
 * SAVE RESUME PDF TO DRIVE
 *
 * IMPORTANT: Called ONLY inside saveCandidate / updateCandidate
 * after form submission is confirmed. NOT called during
 * Gemini extraction / processResume.
 ************************************************************/

function saveResumePDF(file, interviewId) {

  validatePDF(file);

  const folder = getResumeFolder();

  const originalName = String(file.fileName || "Resume.pdf")
    .replace(/[\\\/:*?"<>|#%]/g, "_");

  const safeId = String(interviewId).replace(/[^\w-]/g, "_");

  const finalName = "INT-" + safeId + "_" + originalName;

  const cleanBase64 = String(file.base64)
    .replace(/^data:application\/pdf;base64,/i, "")
    .replace(/\s/g, "");

  let bytes;
  try {
    bytes = Utilities.base64Decode(cleanBase64);
  } catch (e) {
    throw new Error("PDF decoding failed.");
  }

  const blob = Utilities.newBlob(bytes, "application/pdf", finalName);

  let driveFile;
  try {
    driveFile = folder.createFile(blob);
  } catch (e) {
    throw new Error("Could not save PDF to Resume folder.\n" + e.message);
  }

  // Make viewable by anyone with link
  try {
    driveFile.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
  } catch (sharingError) {
    console.log("Public link sharing failed: " + sharingError.message);
  }

  return {
    fileId:   driveFile.getId(),
    fileName: driveFile.getName(),
    url:      "https://drive.google.com/file/d/" + driveFile.getId() + "/view"
  };

}


/************************************************************
 * TRASH A DRIVE FILE (rollback on failure)
 ************************************************************/

function trashDriveFile(fileId) {
  if (!fileId) return;
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (e) {
    console.log("Could not trash file " + fileId + ": " + e.message);
  }
}


/************************************************************
 * TEST DRIVE ACCESS (for testSystem)
 ************************************************************/

function testResumeFolderWriteAccess() {

  const folder = getResumeFolder();

  const testFile = folder.createFile(
    "__AI_RESUME_SYSTEM_TEST__.txt",
    "Temporary test file."
  );

  const result = {
    success:    true,
    folderName: folder.getName(),
    folderId:   folder.getId(),
    testFileId: testFile.getId(),
    message:    "Drive WRITE permission is working."
  };

  testFile.setTrashed(true);
  return result;

}

