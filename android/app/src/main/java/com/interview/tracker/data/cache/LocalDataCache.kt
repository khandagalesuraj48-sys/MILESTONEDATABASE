package com.interview.tracker.data.cache

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.interview.tracker.domain.model.Candidate
import com.interview.tracker.domain.model.Dashboard
import com.interview.tracker.domain.model.Dropdowns
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Thread-safe local cache providing instant (0ms) read access to Dashboard, Candidates, and Dropdowns,
 * backed by SharedPreferences for persistence between app launches.
 */
@Singleton
class LocalDataCache @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val gson = Gson()
    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences("interview_tracker_cache", Context.MODE_PRIVATE)
    }

    private val _dashboardFlow = MutableStateFlow<Dashboard?>(null)
    val dashboardFlow: StateFlow<Dashboard?> = _dashboardFlow.asStateFlow()

    private val _candidatesFlow = MutableStateFlow<List<Candidate>?>(null)
    val candidatesFlow: StateFlow<List<Candidate>?> = _candidatesFlow.asStateFlow()

    private val _dropdownsFlow = MutableStateFlow<Dropdowns?>(null)
    val dropdownsFlow: StateFlow<Dropdowns?> = _dropdownsFlow.asStateFlow()

    init {
        loadFromDisk()
    }

    private fun loadFromDisk() {
        try {
            val dashJson = prefs.getString(KEY_DASHBOARD, null)
            if (!dashJson.isNullOrBlank()) {
                _dashboardFlow.value = gson.fromJson(dashJson, Dashboard::class.java)
            }

            val candJson = prefs.getString(KEY_CANDIDATES, null)
            if (!candJson.isNullOrBlank()) {
                val type = object : TypeToken<List<Candidate>>() {}.type
                _candidatesFlow.value = gson.fromJson<List<Candidate>>(candJson, type)
            }

            val dropJson = prefs.getString(KEY_DROPDOWNS, null)
            if (!dropJson.isNullOrBlank()) {
                _dropdownsFlow.value = gson.fromJson(dropJson, Dropdowns::class.java)
            }
        } catch (_: Exception) {
            // Graceful fallback to null on deserialization failure
        }
    }

    fun getCachedDashboard(): Dashboard? = _dashboardFlow.value

    fun setCachedDashboard(dashboard: Dashboard) {
        _dashboardFlow.value = dashboard
        try {
            prefs.edit().putString(KEY_DASHBOARD, gson.toJson(dashboard)).apply()
        } catch (_: Exception) {}
    }

    fun getCachedCandidates(): List<Candidate>? = _candidatesFlow.value

    fun setCachedCandidates(candidates: List<Candidate>) {
        _candidatesFlow.value = candidates
        try {
            prefs.edit().putString(KEY_CANDIDATES, gson.toJson(candidates)).apply()
        } catch (_: Exception) {}
    }

    fun getCachedDropdowns(): Dropdowns? = _dropdownsFlow.value

    fun setCachedDropdowns(dropdowns: Dropdowns) {
        _dropdownsFlow.value = dropdowns
        try {
            prefs.edit().putString(KEY_DROPDOWNS, gson.toJson(dropdowns)).apply()
        } catch (_: Exception) {}
    }

    /**
     * Inserts or replaces a candidate in the local cache immediately upon server confirmation.
     * Also updates dashboard counts and recent list.
     */
    fun insertCandidate(candidate: Candidate) {
        val currentList = _candidatesFlow.value.orEmpty().toMutableList()
        val existingIndex = currentList.indexOfFirst { it.interviewId == candidate.interviewId }
        val isNew = existingIndex < 0
        if (!isNew) {
            currentList[existingIndex] = candidate
        } else {
            currentList.add(0, candidate)
        }
        setCachedCandidates(currentList)

        // Optimistically update cached dashboard with confirmed candidate
        _dashboardFlow.value?.let { dash ->
            val updatedTotal = if (isNew) dash.total + 1 else dash.total
            val updatedRecent = currentList.take(5)
            setCachedDashboard(
                dash.copy(
                    total = updatedTotal,
                    recentCandidates = updatedRecent
                )
            )
        }
    }

    /**
     * Updates an existing candidate in the cache immediately upon server confirmation.
     */
    fun updateCandidate(candidate: Candidate) {
        val currentList = _candidatesFlow.value.orEmpty().toMutableList()
        val index = currentList.indexOfFirst { it.interviewId == candidate.interviewId }
        if (index >= 0) {
            currentList[index] = candidate
            setCachedCandidates(currentList)
        }

        _dashboardFlow.value?.let { dash ->
            val recent = dash.recentCandidates.toMutableList()
            val rIndex = recent.indexOfFirst { it.interviewId == candidate.interviewId }
            if (rIndex >= 0) {
                recent[rIndex] = candidate
                setCachedDashboard(dash.copy(recentCandidates = recent))
            }
        }
    }

    companion object {
        private const val KEY_DASHBOARD = "cached_dashboard_v1"
        private const val KEY_CANDIDATES = "cached_candidates_v1"
        private const val KEY_DROPDOWNS = "cached_dropdowns_v1"
    }
}

