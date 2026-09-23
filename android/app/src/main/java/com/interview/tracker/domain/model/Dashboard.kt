package com.interview.tracker.domain.model

/**
 * Domain model for dashboard statistics.
 */
data class Dashboard(
    val total: Int = 0,
    val todayInterviews: Int = 0,
    val selected: Int = 0,
    val rejected: Int = 0,
    val pending: Int = 0,
    val recentCandidates: List<Candidate> = emptyList()
)
