package com.interview.tracker.util

import com.google.gson.JsonSyntaxException
import com.google.gson.stream.MalformedJsonException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

object ErrorMapper {

    fun map(throwable: Throwable?): String {
        if (throwable == null) return "An unexpected error occurred. Please try again."
        val message = throwable.message.orEmpty()

        return when {
            throwable is UnknownHostException || message.contains("Unable to resolve host", ignoreCase = true) ||
            message.contains("No address associated", ignoreCase = true) ->
                "No internet connection. Please verify your network and retry."

            throwable is SocketTimeoutException || message.contains("timeout", ignoreCase = true) ->
                "Connection timed out. The server might be busy, please retry."

            throwable is ConnectException || message.contains("Connection refused", ignoreCase = true) ->
                "Unable to connect to the server. Please check your network and retry."

            throwable is SSLException || message.contains("SSL", ignoreCase = true) ->
                "Secure connection failed. Please check date/time settings on your device."

            throwable is JsonSyntaxException || throwable is MalformedJsonException ||
            message.contains("Expected BEGIN_OBJECT", ignoreCase = true) ->
                "Server returned an unreadable response. Please retry in a moment."

            message.contains("HTTP 404", ignoreCase = true) ->
                "Backend endpoint not found. Please verify deployment URL."

            message.contains("HTTP 500", ignoreCase = true) || message.contains("Internal Server Error", ignoreCase = true) ->
                "Backend server error occurred. Please check Google Sheet or retry."

            message.contains("HTTP 503", ignoreCase = true) || message.contains("Service Unavailable", ignoreCase = true) ->
                "Backend is temporarily busy. Please wait a moment and try again."

            message.isNotBlank() && !message.contains("Exception:", ignoreCase = true) ->
                message

            else ->
                "Operation failed. Please try again."
        }
    }
}

