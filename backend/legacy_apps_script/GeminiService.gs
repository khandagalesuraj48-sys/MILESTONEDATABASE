/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * GeminiService.gs
 *
 * Gemini API calls for PDF resume extraction.
 *
 * CRITICAL SECURITY:
 * The Gemini API key is read from Script Properties only.
 * It is NEVER returned to clients and NEVER logged.
 ************************************************************/


/************************************************************
 * GET GEMINI API KEY
 ************************************************************/

function getGeminiKey() {

  const key = PropertiesService
    .getScriptProperties()
    .getProperty("GEMINI_API_KEY");

  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing in Script Properties. " +
      "Go to Apps Script → Project Settings → Script Properties and add it."
    );
  }

  return key.trim();

}


/************************************************************
 * TRANSIENT ERROR DETECTION
 ************************************************************/

function isTransientGeminiError(code) {
  return [408, 409, 425, 429, 500, 502, 503, 504].indexOf(Number(code)) !== -1;
}


/************************************************************
 * ERROR MESSAGE EXTRACTION
 ************************************************************/

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


/************************************************************
 * RETRY DELAY
 ************************************************************/

function getRetryDelay(attempt) {
  return CONFIG.GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
}


/************************************************************
 * CALL GEMINI WITH RETRY
 ************************************************************/

function callGeminiWithRetry(model, payload, maxRetries) {

  const apiKey = getGeminiKey();

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method:            "post",
        contentType:       "application/json",
        payload:           JSON.stringify(payload),
        muteHttpExceptions: true,
        headers:           { Accept: "application/json" }
      });

      const code = response.getResponseCode();
      const body = response.getContentText();

      if (code >= 200 && code < 300) {
        return JSON.parse(body);
      }

      lastError = new Error(getGeminiErrorMessage(code, body));

      if (!isTransientGeminiError(code) || attempt >= maxRetries) {
        throw lastError;
      }

      Utilities.sleep(getRetryDelay(attempt));

    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) throw error;
      Utilities.sleep(getRetryDelay(attempt));
    }
  }

  throw lastError || new Error("Gemini request failed.");

}


/************************************************************
 * EXTRACT TEXT FROM GEMINI RESPONSE
 ************************************************************/

function getGeminiResponseText(response) {

  if (!response || !response.candidates || !response.candidates.length) {
    throw new Error("Gemini returned empty response.");
  }

  const candidate = response.candidates[0];

  if (!candidate.content || !candidate.content.parts) {
    throw new Error("Gemini response did not contain content.");
  }

  let text = "";
  candidate.content.parts.forEach(part => {
    if (part.text) text += part.text;
  });

  if (!text.trim()) {
    throw new Error("Gemini returned empty text.");
  }

  return text.trim();

}


/************************************************************
 * CLEAN JSON FROM GEMINI RESPONSE
 ************************************************************/

function cleanJsonText(text) {

  let result = String(text || "").trim();

  result = result
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const first = result.indexOf("{");
  const last  = result.lastIndexOf("}");

  if (first !== -1 && last !== -1 && last > first) {
    result = result.substring(first, last + 1);
  }

  return result;

}


/************************************************************
 * EXTRACT CANDIDATE DATA FROM PDF BASE64
 *
 * AI RULES (must not be bypassed):
 * - Never invent information
 * - Return "" for missing/unclear fields
 * - Calculate experience only when employment dates are clear
 ************************************************************/

function extractCandidateDataFromPDF(base64) {

  const cleanBase64 = String(base64)
    .replace(/^data:application\/pdf;base64,/i, "")
    .replace(/\s/g, "");

  const prompt = `
You are an expert recruitment resume parser.

Read the attached PDF resume carefully.

Extract ONLY information explicitly available in the resume.

STRICT RULES:
1. Never invent information.
2. Never guess missing information.
3. If information is missing or unclear, return "".
4. Do not infer salary.
5. Do not infer notice period.
6. Do not infer location.
7. Do not invent mobile number.
8. Education should be extracted as written in the resume.
9. Calculate total experience ONLY when employment dates are sufficiently clear.
10. If experience cannot be safely calculated, return "".
11. Return valid JSON only. No markdown. No explanation.

Return exactly this JSON:
{
  "candidateName": "",
  "mobileNo": "",
  "educationQualification": "",
  "totalExperienceYears": ""
}
`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "application/pdf", data: cleanBase64 } }
      ]
    }],
    generationConfig: {
      temperature:      0,
      maxOutputTokens:  300,
      responseMimeType: "application/json"
    }
  };

  let response;

  try {
    response = callGeminiWithRetry(
      CONFIG.GEMINI_MODEL,
      payload,
      CONFIG.GEMINI_MAX_RETRIES
    );
  } catch (primaryError) {
    console.log("Primary Gemini model failed: " + primaryError.message);
    response = callGeminiWithRetry(
      CONFIG.GEMINI_FALLBACK_MODEL,
      payload,
      CONFIG.GEMINI_FALLBACK_RETRIES
    );
  }

  const text    = getGeminiResponseText(response);
  const cleaned = cleanJsonText(text);

  let data;
  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Gemini returned invalid JSON. Raw: " + cleaned.substring(0, 200));
  }

  return {
    candidateName:          data.candidateName          || "",
    mobileNo:               data.mobileNo               || "",
    educationQualification: data.educationQualification || "",
    totalExperienceYears:   data.totalExperienceYears   || ""
  };

}


/************************************************************
 * PROCESS RESUME (extraction only — does NOT save PDF)
 ************************************************************/

function processResume(file) {

  validatePDF(file);

  const extracted = extractCandidateDataFromPDF(file.base64);

  return {
    success:   true,
    fileName:  file.fileName,
    candidate: extracted
  };

}


/************************************************************
 * TEST GEMINI KEY
 ************************************************************/

function testGeminiKey() {

  const payload = {
    contents: [{
      parts: [{ text: "Reply with exactly: Gemini API is working." }]
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 30 }
  };

  let response;
  try {
    response = callGeminiWithRetry(
      CONFIG.GEMINI_MODEL, payload, CONFIG.GEMINI_MAX_RETRIES
    );
  } catch (primaryError) {
    response = callGeminiWithRetry(
      CONFIG.GEMINI_FALLBACK_MODEL, payload, CONFIG.GEMINI_FALLBACK_RETRIES
    );
  }

  return getGeminiResponseText(response);

}

