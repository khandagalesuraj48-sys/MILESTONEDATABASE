package com.interview.tracker.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for locally storing interview drafts before submission.
 * The candidateJson field holds a JSON-serialized map of all candidate fields.
 */
@Entity(tableName = "drafts")
data class DraftEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val candidateJson: String = "{}",
    val pdfFileName: String? = null,
    val pdfBase64: String? = null,
    val pdfMimeType: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
