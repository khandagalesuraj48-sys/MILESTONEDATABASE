package com.interview.tracker.util

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.interview.tracker.data.api.models.FilePayload

object FileUtil {

    /**
     * Reads a URI content into a Base64-encoded [FilePayload].
     * Validates PDF MIME type and 20MB size limit.
     */
    fun uriToFilePayload(context: Context, uri: Uri): Result<FilePayload> = runCatching {
        val contentResolver = context.contentResolver

        // Determine MIME type
        val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
        if (mimeType != Constants.PDF_MIME_TYPE) {
            throw IllegalArgumentException("Only PDF files are supported.")
        }

        // Determine file name and size
        var fileName = "resume.pdf"
        var fileSize = 0L
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (cursor.moveToFirst()) {
                if (nameIndex >= 0) fileName = cursor.getString(nameIndex) ?: "resume.pdf"
                if (sizeIndex >= 0) fileSize = cursor.getLong(sizeIndex)
            }
        }

        if (fileSize > Constants.MAX_PDF_SIZE_BYTES) {
            throw IllegalArgumentException("File is too large. Maximum size is 20MB.")
        }

        // Read bytes and encode to Base64
        val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("Cannot read file.")

        // Double-check size from actual bytes if query returned 0
        if (bytes.size.toLong() > Constants.MAX_PDF_SIZE_BYTES) {
            throw IllegalArgumentException("File is too large. Maximum size is 20MB.")
        }

        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

        FilePayload(
            fileName = fileName,
            mimeType = mimeType,
            base64 = base64
        )
    }

    /**
     * Returns a human-readable file size string.
     */
    fun formatFileSize(bytes: Long): String {
        return when {
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
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (cursor.moveToFirst() && sizeIndex >= 0) {
                size = cursor.getLong(sizeIndex)
            }
        }
        return size
    }

    /**
     * Returns the display name of a URI.
     */
    fun getFileName(context: Context, uri: Uri): String {
        var name = "resume.pdf"
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex >= 0) {
                name = cursor.getString(nameIndex) ?: "resume.pdf"
            }
        }
        return name
    }
}
