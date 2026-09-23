package com.interview.tracker.data.api.models

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

data class DropdownsData(
    @SerializedName("joiningAvailability", alternate = ["interview_modes"]) val joiningAvailability: List<String> = emptyList(),
    @SerializedName("recommendation") val recommendation: List<String> = emptyList(),
    @SerializedName("finalStatus", alternate = ["statuses"]) val finalStatus: List<String> = emptyList(),
    @SerializedName("department", alternate = ["departments"]) val department: List<String> = emptyList(),
    @SerializedName("position", alternate = ["roles"]) val position: List<String> = emptyList()
)

data class DropdownsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: DropdownsData? = null,
    @SerializedName("error") val error: JsonElement? = null,
    @SerializedName("message") val message: String? = null
) {
    val errorMessage: String?
        get() = when {
            error == null || error.isJsonNull -> message
            error.isJsonPrimitive -> error.asString
            error.isJsonObject && error.asJsonObject.has("message") -> error.asJsonObject.get("message").asString
            else -> error.toString()
        }
}
