package com.interview.tracker.domain.model

data class PlatformModule(
    val id: String,
    val name: String,
    val icon: String,
    val description: String,
    val route: String,
    val status: String, // "active" | "coming_soon"
    val order: Int,
    val category: String,
    val version: String
)

