package com.interview.tracker.ui.candidatedetail

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.interview.tracker.domain.model.PhoneNumber
import com.interview.tracker.ui.components.*
import com.interview.tracker.util.Constants
import com.interview.tracker.util.toDisplayDate
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CandidateDetailScreen(
    candidateId: Int,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    viewModel: CandidateDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var showCallPicker by remember { mutableStateOf(false) }

    LaunchedEffect(candidateId) {
        viewModel.loadCandidate(candidateId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.candidate?.candidateName ?: "Candidate Detail") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    if (uiState.candidate != null) {
                        IconButton(onClick = onEdit) {
                            Icon(Icons.Filled.Edit, contentDescription = "Edit")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        when {
            uiState.isLoading -> {
                InlineLoader(
                    message = "Loading…",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(32.dp)
                )
            }
            uiState.errorMessage != null && uiState.candidate == null -> {
                EmptyState(
                    title = "Could not load candidate",
                    subtitle = uiState.errorMessage ?: "",
                    icon = Icons.Outlined.ErrorOutline,
                    actionLabel = "Retry",
                    onAction = { viewModel.loadCandidate(candidateId) },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            uiState.candidate != null -> {
                val candidate = uiState.candidate!!
                val phones = candidate.allPhones

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    // Header card with status badge
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = candidate.displayId,
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                    color = MaterialTheme.colorScheme.primary
                                )
                                StatusBadge(status = candidate.finalStatus.ifBlank { "Scheduled" })
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = candidate.candidateName.ifBlank { "—" },
                                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                text = "${candidate.positionApplied} • ${candidate.department}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f)
                            )
                            if (candidate.interviewDate.isNotBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Interview: ${candidate.interviewDate.toDisplayDate()}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // ACTION BUTTONS: CALL | WHATSAPP | RESUME
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // 1. CALL BUTTON (Handles single or multiple phone numbers)
                        Button(
                            onClick = {
                                when {
                                    phones.isEmpty() -> {
                                        Toast.makeText(context, "No phone number recorded for this candidate.", Toast.LENGTH_SHORT).show()
                                    }
                                    phones.size == 1 -> {
                                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${phones[0].number}"))
                                        context.startActivity(intent)
                                    }
                                    else -> {
                                        showCallPicker = true
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Call")
                        }

                        // 2. WHATSAPP BUTTON (Respects whatsappOptIn consent)
                        Button(
                            onClick = {
                                if (!candidate.whatsappOptIn) {
                                    Toast.makeText(
                                        context,
                                        "Candidate has not consented to WhatsApp communication.",
                                        Toast.LENGTH_LONG
                                    ).show()
                                    return@Button
                                }
                                val targetPhone = phones.find { it.isPrimary } ?: phones.firstOrNull()
                                if (targetPhone == null || targetPhone.number.isBlank()) {
                                    Toast.makeText(context, "No phone number available for WhatsApp.", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                val cleanNumber = targetPhone.number.replace(Regex("[^0-9]"), "")
                                val text = "Hello ${candidate.candidateName},\nThis is from the Milestone Database team regarding your interview for ${candidate.positionApplied} (Ref: ${candidate.displayId})."
                                val encoded = URLEncoder.encode(text, StandardCharsets.UTF_8.toString())
                                val url = "https://wa.me/$cleanNumber?text=$encoded"
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Could not launch WhatsApp.", Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                        ) {
                            Text("WhatsApp", color = Color.White)
                        }

                        // 3. RESUME PDF BUTTON (Streams from GridFS or URL)
                        val hasResume = candidate.resumeDocumentId.isNotBlank() || candidate.resumeUrl.isNotBlank()
                        if (hasResume) {
                            OutlinedButton(
                                onClick = {
                                    val targetUrl = if (candidate.resumeDocumentId.isNotBlank()) {
                                        "${Constants.DEFAULT_BASE_URL}documents/${candidate.resumeDocumentId}/view?view=true"
                                    } else {
                                        candidate.resumeUrl
                                    }
                                    try {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl))
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Cannot open PDF viewer", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Outlined.OpenInNew,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Resume")
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // SECTION 1: PERSONAL INFORMATION
                    SectionHeader(title = "Contact & Personal Information")
                    if (phones.isNotEmpty()) {
                        phones.forEach { p ->
                            DetailRow("Mobile (${p.type}${if (p.isPrimary) " - Primary" else ""})", p.number)
                        }
                    } else {
                        DetailRow("Mobile No.", candidate.mobileNo.ifBlank { "Not provided" })
                    }

                    if (candidate.emails.isNotEmpty()) {
                        candidate.emails.forEach { e ->
                            DetailRow("Email (${e.type})", e.address)
                        }
                    }

                    if (candidate.dob.isNotBlank()) {
                        DetailRow("Date of Birth", "${candidate.dob} ${candidate.age?.let { "($it years old)" } ?: ""}")
                    }

                    DetailRow(
                        "WhatsApp Consent",
                        if (candidate.whatsappOptIn) "Consented (Yes)" else "Not Opted-in"
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // SECTION 2: RESIDENTIAL ADDRESS
                    SectionHeader(title = "Residential Address")
                    if (candidate.currentAddress.street.isNotBlank() || candidate.currentAddress.city.isNotBlank()) {
                        val addr = candidate.currentAddress
                        DetailRow("Current Address", "${addr.street}, ${addr.city}, ${addr.state} ${addr.pincode}".trim())
                    }
                    if (candidate.isPermanentSameAsCurrent) {
                        DetailRow("Permanent Address", "Same as current address")
                    } else if (candidate.permanentAddress.street.isNotBlank() || candidate.permanentAddress.city.isNotBlank()) {
                        val perm = candidate.permanentAddress
                        DetailRow("Permanent Address", "${perm.street}, ${perm.city}, ${perm.state} ${perm.pincode}".trim())
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // SECTION 3: EDUCATION HISTORY
                    if (candidate.educationList.isNotEmpty()) {
                        SectionHeader(title = "Education History")
                        candidate.educationList.forEach { edu ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(
                                        text = "${edu.qualification} - ${edu.course} (${edu.passingYear})",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                    )
                                    if (edu.institute.isNotBlank()) {
                                        Text(
                                            text = edu.institute,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    } else if (candidate.education.isNotBlank()) {
                        SectionHeader(title = "Education")
                        DetailRow("Qualification", candidate.education)
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // SECTION 4: WORK EXPERIENCE
                    if (candidate.experienceList.isNotEmpty()) {
                        SectionHeader(title = "Work Experience History")
                        candidate.experienceList.forEach { exp ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(
                                        text = "${exp.company} — ${exp.designation}",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                    )
                                    Text(
                                        text = "${exp.fromYear} to ${exp.toYear}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    if (exp.roleSummary.isNotBlank()) {
                                        Text(
                                            text = exp.roleSummary,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // SECTION 5: JOB DETAILS
                    SectionHeader(title = "Job & Experience Details")
                    DetailRow("Position Applied For", candidate.positionApplied)
                    DetailRow("Department", candidate.department)
                    DetailRow("Total Experience", "${candidate.totalExperience} years")
                    if (candidate.currentCompany.isNotBlank()) DetailRow("Current Company", candidate.currentCompany)
                    if (candidate.currentDesignation.isNotBlank()) DetailRow("Current Designation", candidate.currentDesignation)
                    if (candidate.currentSalary.isNotBlank()) DetailRow("Current CTC", candidate.currentSalary)
                    if (candidate.expectedSalary.isNotBlank()) DetailRow("Expected CTC", candidate.expectedSalary)
                    if (candidate.noticePeriod.isNotBlank()) DetailRow("Notice Period", candidate.noticePeriod)

                    if (candidate.skills.isNotEmpty()) {
                        DetailRow("Skills", candidate.skills.joinToString(", "))
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    SectionHeader(title = "Interview Assessment")
                    DetailRow("Status", candidate.finalStatus.ifBlank { "Scheduled" })
                    DetailRow("Interview Date", candidate.interviewDate.toDisplayDate())
                    if (candidate.interviewer.isNotBlank()) DetailRow("Interviewer", candidate.interviewer)

                    if (candidate.remarks.isNotBlank()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        SectionHeader(title = "Remarks & Feedback")
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Text(
                                text = candidate.remarks,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(28.dp))
                }

                // DIALOG: SELECT PHONE NUMBER TO CALL (FOR MULTIPLE NUMBERS)
                if (showCallPicker) {
                    AlertDialog(
                        onDismissRequest = { showCallPicker = false },
                        title = { Text("Select Phone Number to Call") },
                        text = {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                phones.forEach { p ->
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                showCallPicker = false
                                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${p.number}"))
                                                context.startActivity(intent)
                                            }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(12.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text(
                                                    text = p.number,
                                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                                                )
                                                Text(
                                                    text = "${p.type.replaceFirstChar { it.uppercase() }}${if (p.isPrimary) " (Primary)" else ""}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.primary
                                                )
                                            }
                                            Icon(
                                                imageVector = Icons.Default.Call,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.primary
                                            )
                                        }
                                    }
                                }
                            }
                        },
                        confirmButton = {
                            TextButton(onClick = { showCallPicker = false }) {
                                Text("Cancel")
                            }
                        }
                    )
                }
            }
        }
    }
}
