/************************************************************
 * AI RESUME INTERVIEW SYSTEM
 * Config.gs
 *
 * Centralised configuration.
 * DO NOT put secrets here — use Script Properties instead.
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

  /**
   * IMPORTANT: The Gemini API key is NEVER stored here.
   * It is stored in Apps Script → Project Settings →
   * Script Properties → GEMINI_API_KEY
   */
  GEMINI_MODEL:
    "gemini-1.5-flash-latest",

  GEMINI_FALLBACK_MODEL:
    "gemini-1.5-pro-latest",

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

