package com.interview.tracker.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
) {
    object Dashboard : BottomNavItem(
        route = "dashboard",
        label = "Dashboard",
        icon = Icons.Filled.Dashboard
    )
    object NewInterview : BottomNavItem(
        route = "new_interview",
        label = "New Interview",
        icon = Icons.Filled.PersonAdd
    )
    object Candidates : BottomNavItem(
        route = "candidates",
        label = "Candidates",
        icon = Icons.Filled.Group
    )
}

// Non-tab routes
object AppRoutes {
    const val PLATFORM_HOME    = "platform_home"
    const val CANDIDATE_DETAIL = "candidate_detail/{candidateId}"
    const val EDIT_CANDIDATE   = "edit_candidate/{candidateId}"

    fun candidateDetail(id: Int) = "candidate_detail/$id"
    fun editCandidate(id: Int)   = "edit_candidate/$id"
}

val bottomNavItems = listOf(
    BottomNavItem.Dashboard,
    BottomNavItem.NewInterview,
    BottomNavItem.Candidates
)
