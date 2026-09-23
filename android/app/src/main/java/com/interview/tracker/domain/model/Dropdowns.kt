package com.interview.tracker.domain.model

/**
 * Domain model for dropdown options loaded from backend.
 */
data class Dropdowns(
    val joiningAvailability: List<String> = emptyList(),
    val recommendation: List<String> = emptyList(),
    val finalStatus: List<String> = emptyList(),
    val department: List<String> = emptyList(),
    val position: List<String> = emptyList()
)
