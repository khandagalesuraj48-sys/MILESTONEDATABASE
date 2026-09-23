/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * WhatsAppService.gs
 *
 * Generates WhatsApp share message and URL for a candidate.
 ************************************************************/


function getWhatsAppShareData(interviewId) {

  const candidate = getCandidateById(interviewId);
  if (!candidate) throw new Error("Candidate not found.");

  const name       = candidate["Candidate Name"]         || "";
  const position   = candidate["Position Applied For"]   || "";
  const education  = candidate["Education / Qualification"] || "";
  const experience = candidate["Total Experience (Years)"]  || "";
  const currSal    = candidate["Current Salary"]           || "";
  const expSal     = candidate["Expected Salary"]          || "";
  const joining    = candidate["Joining Availability"]     || "";
  const resumeUrl  = candidate["Resume URL"]               || "";

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
    success:         true,
    whatsappNumber:  CONFIG.WHATSAPP_NUMBER,
    message:         message,
    whatsappUrl:     whatsappUrl,
    resumeUrl:       resumeUrl
  };

}

