package com.interview.tracker.ui.edit

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.interview.tracker.ui.components.EmptyState
import com.interview.tracker.ui.components.LoadingOverlay
import com.interview.tracker.ui.components.SectionHeader

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditCandidateScreen(
    candidateId: Int,
    onBack: () -> Unit,
    onSaveSuccess: () -> Unit,
    viewModel: EditCandidateViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    LaunchedEffect(candidateId) {
        viewModel.loadCandidate(candidateId)
    }

    val pdfPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.onResumeSelected(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Candidate #${candidateId}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Button(
                        onClick = { viewModel.saveCandidate(onSaveSuccess) },
                        enabled = !uiState.isSaving && !uiState.isLoading,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text("Save")
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                uiState.candidate == null && uiState.errorMessage != null -> {
                    EmptyState(
                        title = "Could not load candidate",
                        subtitle = uiState.errorMessage ?: "",
                        actionLabel = "Retry",
                        onAction = { viewModel.loadCandidate(candidateId) }
                    )
                }
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding()
                            .verticalScroll(scrollState)
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Error banner if any
                        uiState.errorMessage?.let { error ->
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = error,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }

                        // Section 1: Candidate Basic Information
                        SectionHeader(title = "Candidate Information")

                        OutlinedTextField(
                            value = uiState.candidateName,
                            onValueChange = { viewModel.onCandidateNameChange(it) },
                            label = { Text("Candidate Name *") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.mobileNo,
                            onValueChange = { viewModel.onMobileNoChange(it) },
                            label = { Text("Mobile No. *") },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.positionApplied,
                            onValueChange = { viewModel.onPositionChange(it) },
                            label = { Text("Position Applied For *") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.department,
                            onValueChange = { viewModel.onDepartmentChange(it) },
                            label = { Text("Department") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.education,
                            onValueChange = { viewModel.onEducationChange(it) },
                            label = { Text("Education / Qualification") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = uiState.totalExperience,
                            onValueChange = { viewModel.onExperienceChange(it) },
                            label = { Text("Total Experience (Years)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.currentLocation,
                            onValueChange = { viewModel.onLocationChange(it) },
                            label = { Text("Current Location") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        // Section 2: Compensation & Availability
                        SectionHeader(title = "Compensation & Notice")

                        OutlinedTextField(
                            value = uiState.currentSalary,
                            onValueChange = { viewModel.onCurrentSalaryChange(it) },
                            label = { Text("Current Salary") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.expectedSalary,
                            onValueChange = { viewModel.onExpectedSalaryChange(it) },
                            label = { Text("Expected Salary") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.noticePeriod,
                            onValueChange = { viewModel.onNoticePeriodChange(it) },
                            label = { Text("Notice Period") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        DropdownField(
                            label = "Joining Availability",
                            options = uiState.dropdowns.joiningAvailability,
                            selected = uiState.joiningAvailability,
                            onSelect = { viewModel.onJoiningAvailabilityChange(it) }
                        )

                        // Section 3: Assessment & Decision
                        SectionHeader(title = "Assessment & Status")

                        OutlinedTextField(
                            value = uiState.technicalKnowledge,
                            onValueChange = { viewModel.onTechnicalKnowledgeChange(it) },
                            label = { Text("Technical Knowledge (10)") },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true
                        )

                        DropdownField(
                            label = "Recommendation",
                            options = uiState.dropdowns.recommendation,
                            selected = uiState.recommendation,
                            onSelect = { viewModel.onRecommendationChange(it) }
                        )

                        DropdownField(
                            label = "Final Status",
                            options = uiState.dropdowns.finalStatus,
                            selected = uiState.finalStatus,
                            onSelect = { viewModel.onFinalStatusChange(it) }
                        )

                        OutlinedTextField(
                            value = uiState.joiningDate,
                            onValueChange = { viewModel.onJoiningDateChange(it) },
                            label = { Text("Joining Date (YYYY-MM-DD)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.interviewer,
                            onValueChange = { viewModel.onInterviewerChange(it) },
                            label = { Text("Interviewer") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.remarks,
                            onValueChange = { viewModel.onRemarksChange(it) },
                            label = { Text("Remarks") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2
                        )

                        // Section 4: Resume
                        SectionHeader(title = "Resume")

                        if (uiState.existingResumeUrl.isNotBlank()) {
                            OutlinedButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uiState.existingResumeUrl))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Open Current Resume")
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Checkbox(
                                checked = uiState.replaceResume,
                                onCheckedChange = { viewModel.onReplaceResumeToggle(it) }
                            )
                            Text("Replace resume with new PDF")
                        }

                        if (uiState.replaceResume) {
                            if (uiState.newResumeName != null) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.AttachFile, contentDescription = null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = uiState.newResumeName ?: "",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            modifier = Modifier.weight(1f)
                                        )
                                        IconButton(onClick = { viewModel.removeNewResume() }) {
                                            Icon(Icons.Default.Close, contentDescription = "Remove")
                                        }
                                    }
                                }
                            } else {
                                OutlinedButton(
                                    onClick = { pdfPickerLauncher.launch("application/pdf") },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.AttachFile, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Select New PDF Resume")
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = { viewModel.saveCandidate(onSaveSuccess) },
                            enabled = !uiState.isSaving,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                        ) {
                            Text("Save Changes", style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }

            if (uiState.isSaving) {
                LoadingOverlay(message = "Saving candidate changes...")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    options: List<String>,
    selected: String,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded },
        modifier = Modifier.fillMaxWidth()
    ) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onSelect(option)
                        expanded = false
                    }
                )
            }
        }
    }
}

