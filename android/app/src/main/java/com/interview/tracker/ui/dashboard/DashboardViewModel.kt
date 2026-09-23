package com.interview.tracker.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.interview.tracker.data.repository.CandidateRepository
import com.interview.tracker.domain.model.Dashboard
import com.interview.tracker.util.NetworkUtil
import com.interview.tracker.util.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val dashboard: Dashboard? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: CandidateRepository,
    private val networkUtil: NetworkUtil
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        run {
            val cached = repository.getCachedDashboard()
            if (cached != null) {
                // Instant 0ms render from cache!
                DashboardUiState(isLoading = false, isRefreshing = true, dashboard = cached)
            } else {
                DashboardUiState(isLoading = true, isRefreshing = false, dashboard = null)
            }
        }
    )
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard(isInitial = true)
    }

    fun loadDashboard(isInitial: Boolean = false) {
        viewModelScope.launch {
            val hasData = _uiState.value.dashboard != null
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

            // Parallel background pre-warming of Candidates & Dropdowns if initial load
            if (isInitial) {
                launch {
                    val cDeferred = async { repository.getCandidates() }
                    val dDeferred = async { repository.getDropdowns() }
                    cDeferred.await()
                    dDeferred.await()
                }
            }

            repository.getDashboard()
                .onSuccess { dashboard ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            dashboard = dashboard,
                            errorMessage = null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = if (!hasData) {
                                (error as? Exception)?.toUserMessage() ?: "Failed to load dashboard."
                            } else null
                        )
                    }
                }
        }
    }

    fun refresh() = loadDashboard(isInitial = false)
}
