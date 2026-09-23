package com.interview.tracker.ui.newinterview

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
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
import com.interview.tracker.util.FileUtil

import androidx.compose.material.icons.automirrored.filled.ArrowBack

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewInterviewScreen(
    onSubmitSuccess: () -> Unit,
    onBackToHome: () -> Unit = {},
    viewModel: NewInterviewViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Navigate on success
    LaunchedEffect(uiState.submitSuccess) {
        if (uiState.submitSuccess) {
            onSubmitSuccess()
        }
    }

    // PDF picker launcher
    val pdfPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { viewModel.onPdfSelected(context, it) }
    }

    // Submit error snackbar host
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.submitError) {
        uiState.submitError?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearSubmitError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("INTERVIEW MASTER", style = MaterialTheme.typography.titleMedium)
                        Text("New Interview", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
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
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {

            // ---- PDF PICKER ----
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Resume PDF",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.selectedPdfName.isNotBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Filled.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = uiState.selectedPdfName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = FileUtil.formatFileSize(uiState.selectedPdfSize),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    OutlinedButton(
                        onClick = { pdfPickerLauncher.launch("application/pdf") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = uiState.extractionStage !in listOf(
                            ExtractionStage.SELECTING,
                            ExtractionStage.UPLOADING,
                            ExtractionStage.ANALYZING,
                            ExtractionStage.EXTRACTION_COMPLETE
                        ) && !uiState.isSubmitting
                    ) {
                        Icon(Icons.Filled.AttachFile, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (uiState.selectedPdfName.isBlank()) "Pick PDF Resume"
                            else "Change PDF"
                        )
                    }

                    // PDF validation error
                    uiState.pdfError?.let { error ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            // ---- AI EXTRACTION STAGES ----
            when (uiState.extractionStage) {
                ExtractionStage.SELECTING,
                ExtractionStage.FILE_SELECTED,
                ExtractionStage.UPLOADING,
                ExtractionStage.ANALYZING,
                ExtractionStage.EXTRACTION_COMPLETE -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.5.dp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = when (uiState.extractionStage) {
                                    ExtractionStage.SELECTING           -> "Reading PDF resume…"
                                    ExtractionStage.FILE_SELECTED       -> "PDF selected. Connecting…"
                                    ExtractionStage.UPLOADING           -> "Uploading resume…"
                                    ExtractionStage.ANALYZING           -> "Analyzing resume with Gemini AI…"
                                    ExtractionStage.EXTRACTION_COMPLETE -> "Preparing candidate details…"
                                    else                                -> ""
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
                ExtractionStage.ERROR -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Outlined.ErrorOutline,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = uiState.extractionError ?: "AI extraction failed.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(
                                onClick = { viewModel.retryExtraction(context) },
                                colors = ButtonDefaults.textButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Text("Retry")
                            }
                        }
                    }
                }
                else -> { /* IDLE or DONE - nothing extra shown */ }
            }

            // ---- EDITABLE FORM (shown after successful extraction) ----
            if (uiState.showForm) {
                HorizontalDivider()
                Text(
                    text = "Candidate Details",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Review and complete the details extracted from the resume.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Basic info
                InterviewTextField(
                    label = "Candidate Name *",
                    value = uiState.candidateName,
                    onValueChange = viewModel::onCandidateNameChange
                )
                InterviewTextField(
                    label = "Mobile No. *",
                    value = uiState.mobileNo,
                    onValueChange = viewModel::onMobileNoChange,
                    keyboardType = KeyboardType.Phone
                )
                InterviewTextField(
                    label = "Education / Qualification",
                    value = uiState.education,
                    onValueChange = viewModel::onEducationChange
                )
                InterviewTextField(
                    label = "Total Experience (Years)",
                    value = uiState.totalExperience,
                    onValueChange = viewModel::onTotalExperienceChange,
                    keyboardType = KeyboardType.Decimal
                )
                InterviewTextField(
                    label = "Current Location",
                    value = uiState.currentLocation,
                    onValueChange = viewModel::onCurrentLocationChange
                )

                // Job details
                Text(
                    text = "Job Details",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp)
                )

                // Position dropdown
                DropdownField(
                    label = "Position Applied For *",
                    value = uiState.positionApplied,
                    options = uiState.dropdowns.position,
                    onValueChange = viewModel::onPositionAppliedChange
                )
                // Department dropdown
                DropdownField(
                    label = "Department",
                    value = uiState.department,
                    options = uiState.dropdowns.department,
                    onValueChange = viewModel::onDepartmentChange
                )
                InterviewTextField(
                    label = "Current Salary",
                    value = uiState.currentSalary,
                    onValueChange = viewModel::onCurrentSalaryChange,
                    keyboardType = KeyboardType.Number
                )
                InterviewTextField(
                    label = "Expected Salary",
                    value = uiState.expectedSalary,
                    onValueChange = viewModel::onExpectedSalaryChange,
                    keyboardType = KeyboardType.Number
                )
                InterviewTextField(
                    label = "Notice Period",
                    value = uiState.noticePeriod,
                    onValueChange = viewModel::onNoticePeriodChange
                )
                DropdownField(
                    label = "Joining Availability",
                    value = uiState.joiningAvailability,
                    options = uiState.dropdowns.joiningAvailability,
                    onValueChange = viewModel::onJoiningAvailabilityChange
                )

                // Assessment
                Text(
                    text = "Interview Assessment",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp)
                )
                InterviewTextField(
                    label = "Technical Knowledge (0-10)",
                    value = uiState.technicalKnowledge,
                    onValueChange = viewModel::onTechnicalKnowledgeChange,
                    keyboardType = KeyboardType.Number
                )
                DropdownField(
                    label = "Recommendation",
                    value = uiState.recommendation,
                    options = uiState.dropdowns.recommendation,
                    onValueChange = viewModel::onRecommendationChange
                )
                DropdownField(
                    label = "Final Status",
                    value = uiState.finalStatus,
                    options = uiState.dropdowns.finalStatus,
                    onValueChange = viewModel::onFinalStatusChange
                )
                InterviewTextField(
                    label = "Interviewer",
                    value = uiState.interviewer,
                    onValueChange = viewModel::onInterviewerChange
                )
                InterviewTextField(
                    label = "Joining Date (dd/MM/yyyy)",
                    value = uiState.joiningDate,
                    onValueChange = viewModel::onJoiningDateChange
                )
                InterviewTextField(
                    label = "Remarks",
                    value = uiState.remarks,
                    onValueChange = viewModel::onRemarksChange,
                    singleLine = false,
                    minLines = 3
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Submit button
                Button(
                    onClick = { viewModel.submitInterview() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    enabled = !uiState.isSubmitting && uiState.candidateName.isNotBlank()
                ) {
                    if (uiState.isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Saving to MongoDB & GridFS…")
                    } else {
                        Text("Submit Interview")
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun InterviewTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    minLines: Int = 1,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = singleLine,
        minLines = minLines,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier = modifier.fillMaxWidth()
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    value: String,
    options: List<String>,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier.fillMaxWidth()
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,  // Allow free text too
            label = { Text(label) },
            trailingIcon = {
                if (options.isNotEmpty()) ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth(),
            singleLine = true
        )
        if (options.isNotEmpty()) {
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            onValueChange(option)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}
