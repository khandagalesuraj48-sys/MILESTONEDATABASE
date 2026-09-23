package com.interview.tracker.util

import android.util.Log

/**
 * Diagnostic performance logger measuring operation start, end, and duration in milliseconds.
 * Logs with tag [PERF] for easy logcat filtering.
 */
object PerfLogger {

    @PublishedApi
    internal const val TAG = "PERF"

    inline fun <T> measure(operationName: String, block: () -> T): T {
        val start = System.currentTimeMillis()
        Log.d(TAG, "[$operationName] STARTED at ${start}ms")
        try {
            val result = block()
            val end = System.currentTimeMillis()
            val duration = end - start
            Log.i(TAG, "[$operationName] COMPLETED in ${duration}ms (${duration / 1000.0}s)")
            return result
        } catch (e: Exception) {
            val end = System.currentTimeMillis()
            val duration = end - start
            Log.e(TAG, "[$operationName] FAILED after ${duration}ms with: ${e.message}")
            throw e
        }
    }

    suspend inline fun <T> measureSuspend(operationName: String, crossinline block: suspend () -> T): T {
        val start = System.currentTimeMillis()
        Log.d(TAG, "[$operationName] STARTED at ${start}ms")
        try {
            val result = block()
            val end = System.currentTimeMillis()
            val duration = end - start
            Log.i(TAG, "[$operationName] COMPLETED in ${duration}ms (${duration / 1000.0}s)")
            return result
        } catch (e: Exception) {
            val end = System.currentTimeMillis()
            val duration = end - start
            Log.e(TAG, "[$operationName] FAILED after ${duration}ms with: ${e.message}")
            throw e
        }
    }
}

