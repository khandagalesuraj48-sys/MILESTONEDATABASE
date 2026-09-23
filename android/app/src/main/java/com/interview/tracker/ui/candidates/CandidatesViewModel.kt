package com.interview.tracker.ui.candidates

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.interview.tracker.data.repository.CandidateRepository
import com.interview.tracker.domain.model.Candidate
import com.interview.tracker.util.NetworkUtil
import com.interview.tracker.util.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class CandidatesUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val allCandidates: List<Candidate> = emptyList(),
    val filteredCandidates: List<Candidate> = emptyList(),
    val errorMessage: String? = null,
    val searchQuery: String = "",
    val selectedStatus: String = "",
    val selectedPosition: String = "",
    val availableStatuses: List<String> = emptyList(),
    val availablePositions: List<String> = emptyList()
)

@HiltViewModel
class CandidatesViewModel @Inject constructor(
    private val repository: CandidateRepository,
    private val networkUtil: NetworkUtil
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        run {
            val cached = repository.getCachedCandidates()
            if (!cached.isNullOrEmpty()) {
                val statuses = cached.map { it.finalStatus.ifBlank { "Pending" } }.distinct().sorted()
                val positions = cached.map { it.positionApplied }.filter { it.isNotBlank() }.distinct().sorted()
                CandidatesUiState(
                    isLoading = false,
                    isRefreshing = true,
                    allCandidates = cached,
                    filteredCandidates = cached,
                    availableStatuses = statuses,
                    availablePositions = positions
                )
            } else {
                CandidatesUiState(isLoading = true, isRefreshing = false)
            }
        }
    )
    val uiState: StateFlow<CandidatesUiState> = _uiState.asStateFlow()

    init {
        loadCandidates()
    }

    fun loadCandidates() {
        viewModelScope.launch {
            val hasData = _uiState.value.allCandidates.isNotEmpty()
            _uiState.update {
                it.copy(
                    isLoading = !hasData,
                    isRefreshing = true,
                    errorMessage = if (!hasData) null else it.errorMessage
                )
            }

            if (!networkUtil.isConnected()) {
                if (!hasData) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = "No internet connection. Please check and try again."
                        )
                    }
                } else {
                    _uiState.update { it.copy(isRefreshing = false) }
                }
                return@launch
            }

            repository.getCandidates()
                .onSuccess { candidates ->
                    withContext(Dispatchers.Default) {
                        val statuses = candidates
                            .map { it.finalStatus.ifBlank { "Pending" } }
                            .distinct()
                            .sorted()
                        val positions = candidates
                            .map { it.positionApplied }
                            .filter { it.isNotBlank() }
                            .distinct()
                            .sorted()
                        _uiState.update { state ->
                            state.copy(
                                isLoading = false,
                                isRefreshing = false,
                                allCandidates = candidates,
                                availableStatuses = statuses,
                                availablePositions = positions,
                                errorMessage = null
                            ).applyFilters()
                        }
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = if (!hasData) {
                                (error as? Exception)?.toUserMessage() ?: "Failed to load candidates."
                            } else null
                        )
                    }
                }
        }
    }

    fun onSearchQueryChange(query: String) {
        viewModelScope.launch(Dispatchers.Default) {
            _uiState.update { it.copy(searchQuery = query).applyFilters() }
        }
    }

    fun onStatusFilterChange(status: String) {
        viewModelScope.launch(Dispatchers.Default) {
            _uiState.update { it.copy(selectedStatus = status).applyFilters() }
        }
    }

    fun onPositionFilterChange(position: String) {
        viewModelScope.launch(Dispatchers.Default) {
            _uiState.update { it.copy(selectedPosition = position).applyFilters() }
        }
    }

    fun refresh() = loadCandidates()

    private fun CandidatesUiState.applyFilters(): CandidatesUiState {
        val filtered = allCandidates.filter { candidate ->
            val matchesQuery = searchQuery.isBlank() ||
                candidate.candidateName.contains(searchQuery, ignoreCase = true) ||
                candidate.positionApplied.contains(searchQuery, ignoreCase = true) ||
                candidate.mobileNo.contains(searchQuery, ignoreCase = true) ||
                candidate.department.contains(searchQuery, ignoreCase = true)

            val effectiveStatus = candidate.finalStatus.ifBlank { "Pending" }
            val matchesStatus = selectedStatus.isBlank() || effectiveStatus == selectedStatus

            val matchesPosition = selectedPosition.isBlank() ||
                candidate.positionApplied == selectedPosition

            matchesQuery && matchesStatus && matchesPosition
        }
        return copy(filteredCandidates = filtered)
    }
}
