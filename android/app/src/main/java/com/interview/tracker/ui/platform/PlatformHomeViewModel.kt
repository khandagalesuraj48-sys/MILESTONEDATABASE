package com.interview.tracker.ui.platform

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.interview.tracker.data.repository.CandidateRepository
import com.interview.tracker.domain.model.PlatformModule
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlatformHomeViewModel @Inject constructor(
    private val repository: CandidateRepository
) : ViewModel() {

    private val _modules = MutableStateFlow<List<PlatformModule>>(emptyList())
    val modules: StateFlow<List<PlatformModule>> = _modules.asStateFlow()

    private val _totalCandidates = MutableStateFlow(0)
    val totalCandidates: StateFlow<Int> = _totalCandidates.asStateFlow()

    private val _todayInterviews = MutableStateFlow(0)
    val todayInterviews: StateFlow<Int> = _todayInterviews.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            // Check cached metrics first
            repository.getCachedDashboard()?.let {
                _totalCandidates.value = it.total
            }

            // Fetch module registry
            repository.getModules().onSuccess {
                _modules.value = it
            }

            // Fetch live dashboard metrics
            repository.getDashboard().onSuccess {
                _totalCandidates.value = it.total
                _todayInterviews.value = it.todayInterviews
            }
        }
    }
}

