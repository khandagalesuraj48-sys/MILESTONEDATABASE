package com.interview.tracker.data.api.models

import com.google.gson.annotations.SerializedName

data class DashboardData(
    @SerializedName("total", alternate = ["totalCandidates"]) val total: Int = 0,
    @SerializedName("todayInterviews") val todayInterviews: Int = 0,
    @SerializedName("selected") val selectedRaw: Int? = null,
    @SerializedName("rejected") val rejectedRaw: Int? = null,
    @SerializedName("pending") val pendingRaw: Int? = null,
    @SerializedName("byStatus") val byStatus: Map<String, Int>? = null,
    @SerializedName("candidates", alternate = ["recentCandidates"]) val candidates: List<CandidateDto> = emptyList()
) {
    val selected: Int
        get() = selectedRaw ?: byStatus?.get("Selected") ?: 0
    val rejected: Int
        get() = rejectedRaw ?: byStatus?.get("Rejected") ?: 0
    val pending: Int
        get() = pendingRaw ?: byStatus?.get("Scheduled") ?: byStatus?.get("Interviewed") ?: 0
}

data class DashboardResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: DashboardData? = null,
    @SerializedName("error") val error: String? = null
)
