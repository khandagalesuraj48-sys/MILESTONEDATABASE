package com.interview.tracker.data.api.models

import com.google.gson.annotations.SerializedName

/**
 * Generic API response wrapper used for all backend responses.
 */
data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T? = null,
    @SerializedName("error") val error: String? = null
)

data class BootstrapData(
    @SerializedName("version") val version: String,
    @SerializedName("date") val date: String,
    @SerializedName("serverTime") val serverTime: String
)

data class NextIdData(
    @SerializedName("nextId") val nextId: Int,
    @SerializedName("date") val date: String
)

data class WhatsAppData(
    @SerializedName("whatsappNumber") val whatsappNumber: String,
    @SerializedName("message") val message: String,
    @SerializedName("whatsappUrl") val whatsappUrl: String,
    @SerializedName("resumeUrl") val resumeUrl: String
)
