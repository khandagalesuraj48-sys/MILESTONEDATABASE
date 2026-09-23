package com.interview.tracker.ui.newinterview

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.interview.tracker.data.api.models.FilePayload
import com.interview.tracker.data.repository.CandidateRepository
import com.interview.tracker.domain.model.Candidate
import com.interview.tracker.domain.model.Dropdowns
import com.interview.tracker.util.FileUtil
import com.interview.tracker.util.NetworkUtil
import com.interview.tracker.util.PerfLogger
import com.interview.tracker.util.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

enum class ExtractionStage {
    IDLE,
    SELECTING,
    FILE_SELECTED,
    UPLOADING,
    ANALYZING,
    EXTRACTION_COMPLETE,
    ERROR
}

enum class SubmitStage {
    IDLE,
    SAVING,
    MONGODB_CONFIRMED,
    SUCCESS,
    FAILED
}

data class NewInterviewUiState(
    // PDF selection
    val selectedPdfUri: Uri? = null,
    val selectedPdfName: String = "",
    val selectedPdfSize: Long = 0L,
    val pdfError: String? = null,

    // AI extraction
    val extractionStage: ExtractionStage = ExtractionStage.IDLE,
    val extractionError: String? = null,

    // Form fields
    val candidateName: String = "",
    val mobileNo: String = "",
    val positionApplied: String = "",
    val department: String = "",
    val education: String = "",
    val totalExperience: String = "",
    val currentLocation: String = "",
    val currentSalary: String = "",
    val expectedSalary: String = "",
    val noticePeriod: String = "",
    val joiningAvailability: String = "",
    val technicalKnowledge: String = "",
    val recommendation: String = "",
    val finalStatus: String = "Scheduled",
    val joiningDate: String = "",
    val interviewer: String = "",
    val remarks: String = "",

    // Dropdowns
    val dropdowns: Dropdowns = Dropdowns(),
    val isLoadingDropdowns: Boolean = false,

    // Submission
    val isSubmitting: Boolean = false,
    val submitStage: SubmitStage = SubmitStage.IDLE,
    val submitError: String? = null,
    val submitSuccess: Boolean = false,
    val submittedInterviewId: String = "",

    // Form visibility
    val showForm: Boolean = false,

    // Cached payload to avoid re-reading on submit
    val cachedFilePayload: FilePayload? = null
)

@HiltViewModel
class NewInterviewViewModel @Inject constructor(
    private val repository: CandidateRepository,
    private val networkUtil: NetworkUtil
) : ViewModel() {

    private val isSubmittingGuard = AtomicBoolean(false)

    private val _uiState = MutableStateFlow(
        NewInterviewUiState(
            dropdowns = repository.getCachedDropdowns() ?: Dropdowns()
        )
    )
    val uiState: StateFlow<NewInterviewUiState> = _uiState.asStateFlow()

    init {
        loadDropdowns()
    }

    private fun loadDropdowns() {
        viewModelScope.launch {
            if (_uiState.value.dropdowns.department.isEmpty()) {
                _uiState.update { it.copy(isLoadingDropdowns = true) }
            }
            repository.getDropdowns()
                .onSuccess { dropdowns ->
                    _uiState.update { it.copy(dropdowns = dropdowns, isLoadingDropdowns = false) }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoadingDropdowns = false) }
                }
        }
    }

    fun onPdfSelected(context: Context, uri: Uri) {
        viewModelScope.launch {
            // Stage: Reading file safely via Scoped Storage
            _uiState.update {
                it.copy(
                    extractionStage = ExtractionStage.SELECTING,
                    pdfError = null,
                    extractionError = null,
                    showForm = false
                )
            }

            val fileResult = withContext(Dispatchers.IO) {
                PerfLogger.measure("PDF_Local_Read") {
                    FileUtil.uriToFilePayload(context, uri)
                }
            }

            if (fileResult.isFailure) {
                val errorMsg = fileResult.exceptionOrNull()?.message ?: "Could not read PDF file."
                _uiState.update {
                    it.copy(
                        extractionStage = ExtractionStage.IDLE,
                        pdfError = errorMsg
                    )
                }
                return@launch
            }

            val filePayload = fileResult.getOrThrow()
            val fileName = FileUtil.getFileName(context, uri)
            val fileSize = FileUtil.getFileSize(context, uri)

            _uiState.update {
                it.copy(
                    selectedPdfUri = uri,
                    selectedPdfName = fileName,
                    selectedPdfSize = fileSize,
                    cachedFilePayload = filePayload,
                    extractionStage = ExtractionStage.FILE_SELECTED
                )
            }

            if (!networkUtil.isConnected()) {
                _uiState.update {
                    it.copy(
                        extractionStage = ExtractionStage.ERROR,
                        extractionError = "No internet connection. Please check your network and retry.",
                        showForm = true
                    )
                }
                return@launch
            }

            // Stage: Uploading to Vercel API
            _uiState.update { it.copy(extractionStage = ExtractionStage.UPLOADING) }

            // Stage: Analyzing with Gemini AI
            _uiState.update { it.copy(extractionStage = ExtractionStage.ANALYZING) }

            repository.processResume(filePayload)
                .onSuccess { extracted ->
                    // Stage: Preparing form
                    _uiState.update { it.copy(extractionStage = ExtractionStage.EXTRACTION_COMPLETE) }

                    _uiState.update { state ->
                        state.copy(
                            extractionStage = ExtractionStage.IDLE,
                            showForm = true,
                            candidateName = extracted.candidateName.orEmpty(),
                            mobileNo = extracted.effectiveMobile,
                            positionApplied = extracted.positionApplied.orEmpty().ifEmpty { state.positionApplied },
                            department = extracted.department.orEmpty().ifEmpty { state.department },
                            education = extracted.effectiveEducation,
                            totalExperience = extracted.effectiveTotalExperience,
                            currentLocation = extracted.effectiveLocation,
                            currentSalary = extracted.currentSalary.orEmpty(),
                            expectedSalary = extracted.expectedSalary.orEmpty(),
                            noticePeriod = extracted.noticePeriod.orEmpty(),
                            joiningAvailability = extracted.joiningAvailability.orEmpty(),
                            technicalKnowledge = extracted.technicalKnowledge.orEmpty(),
                            recommendation = extracted.recommendation.orEmpty(),
                            finalStatus = extracted.finalStatus.orEmpty().ifEmpty { "Scheduled" },
                            joiningDate = extracted.joiningDate.orEmpty(),
                            interviewer = extracted.interviewer.orEmpty(),
                            remarks = extracted.remarks.orEmpty()
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            extractionStage = ExtractionStage.ERROR,
                            extractionError = (error as? Exception)?.toUserMessage()
                                ?: "AI extraction encountered an issue. You can complete candidate details manually.",
                            showForm = true
                        )
                    }
                }
        }
    }

    // Form field updates (User can edit EVERY field freely)
    fun onCandidateNameChange(v: String) = _uiState.update { it.copy(candidateName = v) }
    fun onMobileNoChange(v: String) = _uiState.update { it.copy(mobileNo = v) }
    fun onPositionAppliedChange(v: String) = _uiState.update { it.copy(positionApplied = v) }
    fun onDepartmentChange(v: String) = _uiState.update { it.copy(department = v) }
    fun onEducationChange(v: String) = _uiState.update { it.copy(education = v) }
    fun onTotalExperienceChange(v: String) = _uiState.update { it.copy(totalExperience = v) }
    fun onCurrentLocationChange(v: String) = _uiState.update { it.copy(currentLocation = v) }
    fun onCurrentSalaryChange(v: String) = _uiState.update { it.copy(currentSalary = v) }
    fun onExpectedSalaryChange(v: String) = _uiState.update { it.copy(expectedSalary = v) }
    fun onNoticePeriodChange(v: String) = _uiState.update { it.copy(noticePeriod = v) }
    fun onJoiningAvailabilityChange(v: String) = _uiState.update { it.copy(joiningAvailability = v) }
    fun onTechnicalKnowledgeChange(v: String) = _uiState.update { it.copy(technicalKnowledge = v) }
    fun onRecommendationChange(v: String) = _uiState.update { it.copy(recommendation = v) }
    fun onFinalStatusChange(v: String) = _uiState.update { it.copy(finalStatus = v) }
    fun onJoiningDateChange(v: String) = _uiState.update { it.copy(joiningDate = v) }
    fun onInterviewerChange(v: String) = _uiState.update { it.copy(interviewer = v) }
    fun onRemarksChange(v: String) = _uiState.update { it.copy(remarks = v) }

    fun submitInterview() {
        // Prevent concurrent double-clicks atomically
        if (!isSubmittingGuard.compareAndSet(false, true)) {
            return
        }

        val state = _uiState.value
        val filePayload = state.cachedFilePayload
        if (filePayload == null) {
            isSubmittingGuard.set(false)
            _uiState.update { it.copy(submitError = "Please select a resume PDF first.") }
            return
        }

        if (state.candidateName.isBlank()) {
            isSubmittingGuard.set(false)
            _uiState.update { it.copy(submitError = "Candidate Name is required.") }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSubmitting = true,
                    submitStage = SubmitStage.SAVING,
                    submitError = null
                )
            }

            if (!networkUtil.isConnected()) {
                isSubmittingGuard.set(false)
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        submitStage = SubmitStage.FAILED,
                        submitError = "No internet connection. Please check and try again."
                    )
                }
                return@launch
            }

            val candidate = Candidate(
                candidateName = state.candidateName,
                mobileNo = state.mobileNo,
                positionApplied = state.positionApplied,
                department = state.department,
                education = state.education,
                totalExperience = state.totalExperience,
                currentLocation = state.currentLocation,
                currentSalary = state.currentSalary,
                expectedSalary = state.expectedSalary,
                noticePeriod = state.noticePeriod,
                joiningAvailability = state.joiningAvailability,
                technicalKnowledge = state.technicalKnowledge,
                recommendation = state.recommendation,
                finalStatus = state.finalStatus,
                joiningDate = state.joiningDate,
                interviewer = state.interviewer,
                remarks = state.remarks
            )

            repository.saveCandidate(filePayload, candidate, state.remarks)
                .onSuccess { response ->
                    isSubmittingGuard.set(false)
                    val confirmedId = response.interviewIdString.ifBlank {
                        if (response.interviewId > 0) response.interviewId.toString() else "SAVED"
                    }
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            submitStage = SubmitStage.SUCCESS,
                            submitSuccess = true,
                            submittedInterviewId = confirmedId
                        )
                    }
                }
                .onFailure { error ->
                    isSubmittingGuard.set(false)
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            submitStage = SubmitStage.FAILED,
                            submitError = (error as? Exception)?.toUserMessage()
                                ?: "Failed to save candidate to MongoDB. Please retry."
                        )
                    }
                }
        }
    }

    fun retryExtraction(context: Context) {
        val uri = _uiState.value.selectedPdfUri ?: return
        onPdfSelected(context, uri)
    }

    fun clearSubmitError() {
        _uiState.update { it.copy(submitError = null) }
    }
}
