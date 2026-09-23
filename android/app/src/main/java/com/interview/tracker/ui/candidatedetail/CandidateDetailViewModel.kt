package com.interview.tracker.ui.candidatedetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.interview.tracker.data.api.models.WhatsAppData
import com.interview.tracker.data.repository.CandidateRepository
import com.interview.tracker.domain.model.Candidate
import com.interview.tracker.util.NetworkUtil
import com.interview.tracker.util.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CandidateDetailUiState(
    val isLoading: Boolean = false,
    val candidate: Candidate? = null,
    val errorMessage: String? = null,
    val whatsAppData: WhatsAppData? = null,
    val isLoadingWhatsApp: Boolean = false
)

@HiltViewModel
class CandidateDetailViewModel @Inject constructor(
    private val repository: CandidateRepository,
    private val networkUtil: NetworkUtil
) : ViewModel() {

    private val _uiState = MutableStateFlow(CandidateDetailUiState(isLoading = true))
    val uiState: StateFlow<CandidateDetailUiState> = _uiState.asStateFlow()

    fun loadCandidate(id: Int) {
        viewModelScope.launch {
            val cached = repository.getCachedCandidates()?.find { it.interviewId == id }
            if (cached != null) {
                // Instant 0ms render from cache!
                _uiState.update { it.copy(isLoading = false, candidate = cached, errorMessage = null) }
            } else {
                _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            }

            if (!networkUtil.isConnected()) {
                if (cached == null) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "No internet connection. Please check and try again."
                        )
                    }
                }
                return@launch
            }

            repository.getCandidate(id)
                .onSuccess { candidate ->
                    _uiState.update { it.copy(isLoading = false, candidate = candidate, errorMessage = null) }
                }
                .onFailure { error ->
                    if (cached == null) {
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
    }

    fun loadWhatsAppData(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingWhatsApp = true) }
            repository.getWhatsApp(id)
                .onSuccess { data ->
                    _uiState.update { it.copy(isLoadingWhatsApp = false, whatsAppData = data) }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoadingWhatsApp = false) }
                }
        }
    }

    fun clearWhatsAppData() {
        _uiState.update { it.copy(whatsAppData = null) }
    }
}
