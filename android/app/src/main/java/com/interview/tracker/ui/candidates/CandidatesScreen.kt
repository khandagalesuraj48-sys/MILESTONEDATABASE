package com.interview.tracker.ui.candidates

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.FilterAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import com.interview.tracker.ui.components.*

import androidx.compose.material.icons.automirrored.filled.ArrowBack

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CandidatesScreen(
    onCandidateClick: (Int) -> Unit,
    onNewInterview: () -> Unit,
    onBackToHome: () -> Unit = {},
    viewModel: CandidatesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("INTERVIEW MASTER", style = MaterialTheme.typography.titleMedium)
                        Text("Candidates", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
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
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNewInterview,
                icon = { Icon(Icons.Filled.Add, contentDescription = "New Interview") },
                text = { Text("New Interview") }
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
            Column(modifier = Modifier.fillMaxSize()) {
                // Search bar
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchQueryChange,
                    placeholder = { Text("Search candidates…") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    singleLine = true,
                    shape = MaterialTheme.shapes.medium
                )

                // Filter row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Status filter
                    var statusExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = statusExpanded,
                        onExpandedChange = { statusExpanded = it },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = uiState.selectedStatus.ifBlank { "All Statuses" },
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = statusExpanded) },
                            modifier = Modifier.menuAnchor(),
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodySmall
                        )
                        ExposedDropdownMenu(
                            expanded = statusExpanded,
                            onDismissRequest = { statusExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("All Statuses") },
                                onClick = {
                                    viewModel.onStatusFilterChange("")
                                    statusExpanded = false
                                }
                            )
                            uiState.availableStatuses.forEach { status ->
                                DropdownMenuItem(
                                    text = { Text(status) },
                                    onClick = {
                                        viewModel.onStatusFilterChange(status)
                                        statusExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Position filter
                    var positionExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = positionExpanded,
                        onExpandedChange = { positionExpanded = it },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = uiState.selectedPosition.ifBlank { "All Positions" },
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = positionExpanded) },
                            modifier = Modifier.menuAnchor(),
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodySmall
                        )
                        ExposedDropdownMenu(
                            expanded = positionExpanded,
                            onDismissRequest = { positionExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("All Positions") },
                                onClick = {
                                    viewModel.onPositionFilterChange("")
                                    positionExpanded = false
                                }
                            )
                            uiState.availablePositions.forEach { position ->
                                DropdownMenuItem(
                                    text = { Text(position) },
                                    onClick = {
                                        viewModel.onPositionFilterChange(position)
                                        positionExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Content
                when {
                    uiState.isLoading && uiState.allCandidates.isEmpty() -> {
                        InlineLoader(
                            message = "Loading candidates…",
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp)
                        )
                    }
                    uiState.errorMessage != null -> {
                        EmptyState(
                            title = "Could not load candidates",
                            subtitle = uiState.errorMessage ?: "",
                            icon = Icons.Outlined.ErrorOutline,
                            actionLabel = "Retry",
                            onAction = { viewModel.refresh() }
                        )
                    }
                    uiState.filteredCandidates.isEmpty() -> {
                        EmptyState(
                            title = "No candidates found",
                            subtitle = if (uiState.searchQuery.isNotBlank() || uiState.selectedStatus.isNotBlank() || uiState.selectedPosition.isNotBlank())
                                "Try adjusting your search or filters."
                            else
                                "Add a new interview to get started."
                        )
                    }
                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 8.dp,
                                bottom = 88.dp  // FAB clearance
                            ),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(
                                items = uiState.filteredCandidates,
                                key = { it.interviewId }
                            ) { candidate ->
                                CandidateCard(
                                    candidate = candidate,
                                    onClick = { onCandidateClick(candidate.interviewId) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
