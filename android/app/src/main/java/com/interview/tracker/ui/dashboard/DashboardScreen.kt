package com.interview.tracker.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import com.interview.tracker.ui.components.*
import com.interview.tracker.ui.theme.*

import androidx.compose.material.icons.automirrored.filled.ArrowBack

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onCandidateClick: (Int) -> Unit,
    onBackToHome: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("INTERVIEW MASTER", style = MaterialTheme.typography.titleMedium)
                        Text("Dashboard", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackToHome) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Platform Home"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        SwipeRefresh(
            state = rememberSwipeRefreshState(uiState.isRefreshing),
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                uiState.isLoading && uiState.dashboard == null -> {
                    Box(modifier = Modifier.fillMaxSize()) {
                        InlineLoader(
                            message = "Loading dashboard…",
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
                uiState.errorMessage != null -> {
                    EmptyState(
                        title = "Could not load dashboard",
                        subtitle = uiState.errorMessage ?: "",
                        icon = Icons.Outlined.ErrorOutline,
                        actionLabel = "Retry",
                        onAction = { viewModel.refresh() }
                    )
                }
                uiState.dashboard != null -> {
                    val dashboard = uiState.dashboard!!
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Text(
                                text = "Overview",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                StatCard(
                                    label = "Total",
                                    value = dashboard.total,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.weight(1f)
                                )
                                StatCard(
                                    label = "Selected",
                                    value = dashboard.selected,
                                    color = StatusSelectedText,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                StatCard(
                                    label = "Rejected",
                                    value = dashboard.rejected,
                                    color = StatusRejectedText,
                                    modifier = Modifier.weight(1f)
                                )
                                StatCard(
                                    label = "Pending",
                                    value = dashboard.pending,
                                    color = StatusPendingText,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            SectionHeader(title = "Recent Candidates")
                        }
                        if (dashboard.recentCandidates.isEmpty()) {
                            item {
                                EmptyState(
                                    title = "No candidates yet",
                                    subtitle = "Add a new interview to get started.",
                                    modifier = Modifier.height(200.dp)
                                )
                            }
                        } else {
                            items(
                                items = dashboard.recentCandidates,
                                key = { it.interviewId }
                            ) { candidate ->
                                CandidateCard(
                                    candidate = candidate,
                                    onClick = { onCandidateClick(candidate.interviewId) }
                                )
                            }
                        }
                        item { Spacer(modifier = Modifier.height(8.dp)) }
                    }
                }
            }
        }
    }
}
