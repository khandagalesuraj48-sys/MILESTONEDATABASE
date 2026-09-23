package com.interview.tracker.util

import java.text.SimpleDateFormat
import java.util.*

/**
 * Extension functions used across the app.
 */

fun String.toDisplayDate(): String {
    return try {
        val inputFormats = listOf(
            SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()),
            SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()),
            SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()),
            SimpleDateFormat("dd-MM-yyyy", Locale.getDefault())
        )
        var parsed: Date? = null
        for (format in inputFormats) {
            parsed = try { format.parse(this) } catch (e: Exception) { null }
            if (parsed != null) break
        }
        if (parsed != null) {
            SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(parsed)
        } else {
            this
        }
    } catch (e: Exception) {
        this
    }
}

fun String.orDash(): String = if (isNullOrBlank()) "—" else this

fun Int.orDash(): String = if (this == 0) "—" else this.toString()

fun Exception.toUserMessage(): String = ErrorMapper.map(this)
fun Throwable.toUserMessage(): String = ErrorMapper.map(this)
