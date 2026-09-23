package com.interview.tracker.util

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.interview.tracker.data.api.models.FilePayload
import java.io.ByteArrayOutputStream

object FileUtil {

    /**
     * Reads a URI content into a Base64-encoded [FilePayload].
     * Supports Scoped Storage on Android 10+ via ContentResolver stream.
     * Validates PDF magic header and 20MB size limit safely without memory overflows.
     */
    fun uriToFilePayload(context: Context, uri: Uri): Result<FilePayload> = runCatching {
        val contentResolver = context.contentResolver

        // 1. Resolve Display Name and Reported Size via OpenableColumns
        var fileName = "resume.pdf"
        var reportedSize = 0L

        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (cursor.moveToFirst()) {
                if (nameIndex >= 0) {
                    val name = cursor.getString(nameIndex)
                    if (!name.isNullOrBlank()) fileName = name
                }
                if (sizeIndex >= 0) {
                    reportedSize = cursor.getLong(sizeIndex)
                }
            }
        }

        // 2. MIME type & Extension check
        val rawMime = contentResolver.getType(uri) ?: "application/pdf"
        val isPdfByMime = rawMime.equals("application/pdf", ignoreCase = true) ||
                          rawMime.contains("pdf", ignoreCase = true)
        val isPdfByName = fileName.endsWith(".pdf", ignoreCase = true)

        if (!isPdfByMime && !isPdfByName && rawMime != "application/octet-stream") {
            throw IllegalArgumentException("Only PDF files are supported. Selected: $fileName")
        }

        // 3. Early check on reported size
        if (reportedSize > Constants.MAX_PDF_SIZE_BYTES) {
            throw IllegalArgumentException("The selected PDF exceeds the 20MB limit (${formatFileSize(reportedSize)}).")
        }

        // 4. Safe streaming read with size guard
        val outputStream = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        var totalBytesRead = 0L

        contentResolver.openInputStream(uri)?.use { inputStream ->
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                totalBytesRead += bytesRead
                if (totalBytesRead > Constants.MAX_PDF_SIZE_BYTES) {
                    throw IllegalArgumentException("The selected PDF file exceeds the 20MB limit.")
                }
                outputStream.write(buffer, 0, bytesRead)
            }
        } ?: throw IllegalStateException("Unable to open and read the selected PDF file.")

        val bytes = outputStream.toByteArray()
        if (bytes.isEmpty()) {
            throw IllegalArgumentException("The selected PDF file is empty (0 bytes).")
        }

        // 5. Verify PDF magic header (%PDF-)
        if (bytes.size >= 4) {
            val isPdfHeader = bytes[0] == 0x25.toByte() && // %
                              bytes[1] == 0x50.toByte() && // P
                              bytes[2] == 0x44.toByte() && // D
                              bytes[3] == 0x46.toByte()    // F
            if (!isPdfHeader && !isPdfByName) {
                throw IllegalArgumentException("The selected file is not a valid PDF document.")
            }
        }

        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

        FilePayload(
            fileName = if (fileName.endsWith(".pdf", ignoreCase = true)) fileName else "$fileName.pdf",
            mimeType = "application/pdf",
            base64 = base64
        )
    }

    /**
     * Returns a human-readable file size string.
     */
    fun formatFileSize(bytes: Long): String {
        return when {
            bytes <= 0 -> "0 B"
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "%.1f KB".format(bytes / 1024.0)
            else -> "%.1f MB".format(bytes / (1024.0 * 1024.0))
        }
    }

    /**
     * Returns the file size of a URI in bytes.
     */
    fun getFileSize(context: Context, uri: Uri): Long {
        var size = 0L
        contentResolverQuery(context, uri) { cursor ->
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (sizeIndex >= 0) size = cursor.getLong(sizeIndex)
        }
        return size
    }

    /**
     * Returns the display name of a URI.
     */
    fun getFileName(context: Context, uri: Uri): String {
        var name = "resume.pdf"
        contentResolverQuery(context, uri) { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0) {
                val resolved = cursor.getString(nameIndex)
                if (!resolved.isNullOrBlank()) name = resolved
            }
        }
        return name
    }

    private inline fun contentResolverQuery(
        context: Context,
        uri: Uri,
        block: (android.database.Cursor) -> Unit
    ) {
        try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    block(cursor)
                }
            }
        } catch (_: Exception) {
            // Ignore query failures on unusual URIs
        }
    }
}
