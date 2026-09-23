package com.interview.tracker.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.interview.tracker.ui.candidatedetail.CandidateDetailScreen
import com.interview.tracker.ui.candidates.CandidatesScreen
import com.interview.tracker.ui.dashboard.DashboardScreen
import com.interview.tracker.ui.edit.EditCandidateScreen
import com.interview.tracker.ui.newinterview.NewInterviewScreen

import com.interview.tracker.ui.platform.PlatformHomeScreen

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Determine whether bottom bar should be visible (only inside Interview Master tabs)
    val showBottomBar = currentDestination?.route in bottomNavItems.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = item.label
                                )
                            },
                            label = { Text(item.label) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(BottomNavItem.Dashboard.route) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = AppRoutes.PLATFORM_HOME,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(AppRoutes.PLATFORM_HOME) {
                PlatformHomeScreen(
                    onOpenInterviewMaster = {
                        navController.navigate(BottomNavItem.Dashboard.route)
                    }
                )
            }
            composable(BottomNavItem.Dashboard.route) {
                DashboardScreen(
                    onCandidateClick = { candidateId ->
                        navController.navigate(AppRoutes.candidateDetail(candidateId))
                    },
                    onBackToHome = {
                        navController.navigate(AppRoutes.PLATFORM_HOME) {
                            popUpTo(AppRoutes.PLATFORM_HOME) { inclusive = false }
                        }
                    }
                )
            }
            composable(BottomNavItem.NewInterview.route) {
                NewInterviewScreen(
                    onSubmitSuccess = {
                        navController.navigate(BottomNavItem.Candidates.route) {
                            popUpTo(BottomNavItem.Dashboard.route)
                        }
                    },
                    onBackToHome = {
                        navController.navigate(AppRoutes.PLATFORM_HOME) {
                            popUpTo(AppRoutes.PLATFORM_HOME) { inclusive = false }
                        }
                    }
                )
            }
            composable(BottomNavItem.Candidates.route) {
                CandidatesScreen(
                    onCandidateClick = { candidateId ->
                        navController.navigate(AppRoutes.candidateDetail(candidateId))
                    },
                    onNewInterview = {
                        navController.navigate(BottomNavItem.NewInterview.route)
                    },
                    onBackToHome = {
                        navController.navigate(AppRoutes.PLATFORM_HOME) {
                            popUpTo(AppRoutes.PLATFORM_HOME) { inclusive = false }
                        }
                    }
                )
            }
            composable(
                route = AppRoutes.CANDIDATE_DETAIL,
                arguments = listOf(navArgument("candidateId") { type = NavType.IntType })
            ) { backStackEntry ->
                val candidateId = backStackEntry.arguments?.getInt("candidateId") ?: return@composable
                CandidateDetailScreen(
                    candidateId = candidateId,
                    onBack = { navController.popBackStack() },
                    onEdit = { navController.navigate(AppRoutes.editCandidate(candidateId)) }
                )
            }
            composable(
                route = AppRoutes.EDIT_CANDIDATE,
                arguments = listOf(navArgument("candidateId") { type = NavType.IntType })
            ) { backStackEntry ->
                val candidateId = backStackEntry.arguments?.getInt("candidateId") ?: return@composable
                EditCandidateScreen(
                    candidateId = candidateId,
                    onBack = { navController.popBackStack() },
                    onSaveSuccess = {
                        navController.popBackStack()
                        navController.popBackStack()
                        navController.navigate(AppRoutes.candidateDetail(candidateId))
                    }
                )
            }
        }
    }
}
