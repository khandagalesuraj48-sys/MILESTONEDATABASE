package com.interview.tracker.util

object Constants {
    const val DEFAULT_BASE_URL        = "http://127.0.0.1:3000/api/v1/"
    const val CONNECT_TIMEOUT_SECONDS = 60L
    const val READ_TIMEOUT_SECONDS    = 180L  // AI processing & large payloads
    const val WRITE_TIMEOUT_SECONDS   = 120L

    const val MAX_PDF_SIZE_BYTES      = 20 * 1024 * 1024L  // 20MB
    const val PDF_MIME_TYPE           = "application/pdf"

    const val DATASTORE_PREFS_NAME    = "interview_tracker_prefs"

    // Status values
    const val STATUS_SELECTED  = "Selected"
    const val STATUS_REJECTED  = "Rejected"
    const val STATUS_PENDING   = "Pending"

    // WhatsApp
    const val WHATSAPP_BASE_URL = "https://wa.me/"
}
