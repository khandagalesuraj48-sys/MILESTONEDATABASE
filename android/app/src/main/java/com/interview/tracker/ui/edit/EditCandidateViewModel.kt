package com.interview.tracker.ui.edit

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
import com.interview.tracker.util.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditCandidateUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isSavedSuccess: Boolean = false,
    val candidate: Candidate? = null,
    val dropdowns: Dropdowns = Dropdowns(),
    val errorMessage: String? = null,
    val successMessage: String? = null,
    // Editable fields
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
    val finalStatus: String = "",
    val joiningDate: String = "",
    val interviewer: String = "",
    val remarks: String = "",
    val existingResumeUrl: String = "",
    // Resume replacement
    val replaceResume: Boolean = false,
    val newResumeUri: Uri? = null,
    val newResumeName: String? = null,
    val newResumeSize: Long = 0,
    val newResumeBase64: String? = null
)

@HiltViewModel
class EditCandidateViewModel @Inject constructor(
    private val repository: CandidateRepository,
    @ApplicationContext private val context: Context,
    private val networkUtil: NetworkUtil
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditCandidateUiState(isLoading = true))
    val uiState: StateFlow<EditCandidateUiState> = _uiState.asStateFlow()

    fun loadCandidate(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            if (!networkUtil.isConnected()) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "No internet connection. Please check and try again."
                    )
                }
                return@launch
            }

            // Load dropdowns and candidate
            val dropdownsResult = repository.getDropdowns()
            val candidateResult = repository.getCandidate(id)

            val dropdowns = dropdownsResult.getOrDefault(Dropdowns())

            candidateResult
                .onSuccess { c ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            candidate = c,
                            dropdowns = dropdowns,
                            candidateName = c.candidateName,
                            mobileNo = c.mobileNo,
                            positionApplied = c.positionApplied,
                            department = c.department,
                            education = c.education,
                            totalExperience = c.totalExperience,
                            currentLocation = c.currentLocation,
                            currentSalary = c.currentSalary,
                            expectedSalary = c.expectedSalary,
                            noticePeriod = c.noticePeriod,
                            joiningAvailability = c.joiningAvailability,
                            technicalKnowledge = c.technicalKnowledge,
                            recommendation = c.recommendation,
                            finalStatus = c.finalStatus,
                            joiningDate = c.joiningDate,
                            interviewer = c.interviewer,
                            remarks = c.remarks,
                            existingResumeUrl = c.resumeUrl
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = (error as? Exception)?.toUserMessage()
                                ?: "Failed to load candidate."
                        )
                    }
                }
        }
    }

    fun onCandidateNameChange(v: String) = _uiState.update { it.copy(candidateName = v) }
    fun onMobileNoChange(v: String) = _uiState.update { it.copy(mobileNo = v) }
    fun onPositionChange(v: String) = _uiState.update { it.copy(positionApplied = v) }
    fun onDepartmentChange(v: String) = _uiState.update { it.copy(department = v) }
    fun onEducationChange(v: String) = _uiState.update { it.copy(education = v) }
    fun onExperienceChange(v: String) = _uiState.update { it.copy(totalExperience = v) }
    fun onLocationChange(v: String) = _uiState.update { it.copy(currentLocation = v) }
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
    fun onReplaceResumeToggle(v: Boolean) = _uiState.update { it.copy(replaceResume = v) }

    fun onResumeSelected(uri: Uri) {
        val result = FileUtil.uriToFilePayload(context, uri)
        result
            .onSuccess { payload ->
                _uiState.update {
                    it.copy(
                        newResumeUri = uri,
                        newResumeName = payload.fileName,
                        newResumeBase64 = payload.base64,
                        errorMessage = null
                    )
                }
            }
            .onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Failed to process PDF.")
                }
            }
    }

    fun removeNewResume() {
        _uiState.update {
            it.copy(
                newResumeUri = null,
                newResumeName = null,
                newResumeSize = 0,
                newResumeBase64 = null
            )
        }
    }

    fun saveCandidate(onSuccess: () -> Unit) {
        val s = _uiState.value
        val id = s.candidate?.interviewId ?: return

        if (s.candidateName.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Candidate Name is required.") }
            return
        }
        if (s.mobileNo.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Mobile Number is required.") }
            return
        }
        if (s.positionApplied.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Position Applied For is required.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            if (!networkUtil.isConnected()) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        errorMessage = "No internet connection. Please check and try again."
                    )
                }
                return@launch
            }

            val updatedCandidate = s.candidate.copy(
                candidateName = s.candidateName.trim(),
                mobileNo = s.mobileNo.trim(),
                positionApplied = s.positionApplied.trim(),
                department = s.department.trim(),
                education = s.education.trim(),
                totalExperience = s.totalExperience.trim(),
                currentLocation = s.currentLocation.trim(),
                currentSalary = s.currentSalary.trim(),
                expectedSalary = s.expectedSalary.trim(),
                noticePeriod = s.noticePeriod.trim(),
                joiningAvailability = s.joiningAvailability,
                technicalKnowledge = s.technicalKnowledge.trim(),
                recommendation = s.recommendation,
                finalStatus = s.finalStatus,
                joiningDate = s.joiningDate.trim(),
                interviewer = s.interviewer.trim(),
                remarks = s.remarks.trim()
            )

            val filePayload = if (s.replaceResume && s.newResumeBase64 != null && s.newResumeName != null) {
                FilePayload(
                    fileName = s.newResumeName,
                    mimeType = "application/pdf",
                    base64 = s.newResumeBase64
                )
            } else null

            repository.updateCandidate(
                interviewId = id,
                candidate = updatedCandidate,
                replaceResume = s.replaceResume && filePayload != null,
                file = filePayload
            )
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            isSavedSuccess = true,
                            successMessage = "Candidate updated successfully."
                        )
                    }
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            errorMessage = (error as? Exception)?.toUserMessage()
                                ?: "Failed to update candidate."
                        )
                    }
                }
        }
    }
}

