package com.interview.tracker.data.repository

import com.interview.tracker.data.api.ApiService
import com.interview.tracker.data.api.models.*
import com.interview.tracker.data.cache.LocalDataCache
import com.interview.tracker.domain.model.*
import com.interview.tracker.util.PerfLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single source of truth for candidate data in MILESTONE DATABASE.
 * Backed by LocalDataCache for instant 0ms access, with network synchronization and PerfLogger instrumentation.
 */
@Singleton
class CandidateRepository @Inject constructor(
    private val apiService: ApiService,
    private val cache: LocalDataCache
) {

    // ---- Cache Access ----
    val cachedDashboardFlow = cache.dashboardFlow
    val cachedCandidatesFlow = cache.candidatesFlow
    val cachedDropdownsFlow = cache.dropdownsFlow

    fun getCachedDashboard(): Dashboard? = cache.getCachedDashboard()
    fun getCachedCandidates(): List<Candidate>? = cache.getCachedCandidates()
    fun getCachedDropdowns(): Dropdowns? = cache.getCachedDropdowns()

    // ---- Mapping helpers ----

    private fun CandidateDto.toDomain(): Candidate {
        val phoneList = phones?.map { PhoneNumber(it.number, it.type, it.isPrimary) }
            ?: if (!mobileNo.isNullOrBlank()) listOf(PhoneNumber(mobileNo, "primary", true)) else emptyList()

        val emailList = emails?.map { EmailAddress(it.address, it.type, it.isPrimary) } ?: emptyList()

        val currAddr = currentAddress?.let { Address(it.street, it.city, it.state, it.pincode) }
            ?: Address(city = currentLocation.orEmpty())

        val permAddr = permanentAddress?.let { Address(it.street, it.city, it.state, it.pincode) }
            ?: currAddr

        val eduList = educationList?.map {
            EducationItem(
                qualification = it.qualification,
                course = it.course,
                specialization = it.specialization,
                passingYear = it.passingYear,
                institute = it.institute,
                percentageOrCgpa = it.percentageOrCgpa
            )
        } ?: emptyList()

        val expList = experienceList?.map {
            ExperienceItem(
                company = it.company,
                designation = it.designation,
                fromYear = it.fromYear,
                toYear = it.toYear,
                roleSummary = it.roleSummary,
                isCurrent = it.isCurrent
            )
        } ?: emptyList()

        return Candidate(
            interviewId = interviewId,
            interviewIdString = interviewIdString,
            interviewDate = interviewDate.orEmpty(),
            candidateName = candidateName.orEmpty(),
            mobileNo = mobileNo.orEmpty().ifBlank { phoneList.firstOrNull()?.number.orEmpty() },
            phones = phoneList,
            emails = emailList,
            dob = dob.orEmpty(),
            age = age,
            currentAddress = currAddr,
            permanentAddress = permAddr,
            isPermanentSameAsCurrent = isPermanentSameAsCurrent,
            educationList = eduList,
            education = educationLegacy.orEmpty().ifBlank { eduList.firstOrNull()?.qualification.orEmpty() },
            experienceList = expList,
            totalExperience = totalExperience.ifBlank { expList.size.toString() },
            currentCompany = currentCompany.orEmpty(),
            currentDesignation = currentDesignation.orEmpty(),
            currentLocation = currentLocation.orEmpty().ifBlank { currAddr.city },
            currentSalary = currentSalary.orEmpty(),
            expectedSalary = expectedSalary.orEmpty(),
            noticePeriod = noticePeriod.orEmpty(),
            positionApplied = positionApplied.orEmpty(),
            department = department.orEmpty(),
            skills = skills ?: emptyList(),
            joiningAvailability = joiningAvailability.orEmpty(),
            technicalKnowledge = technicalKnowledge.orEmpty(),
            recommendation = recommendation.orEmpty(),
            finalStatus = finalStatus.orEmpty().ifBlank { "Scheduled" },
            joiningDate = joiningDate.orEmpty(),
            interviewer = interviewer.orEmpty(),
            resumeUrl = resumeUrl.orEmpty(),
            resumeDocumentId = resumeDocumentId.orEmpty(),
            whatsappOptIn = whatsappOptIn,
            remarks = remarks.orEmpty()
        )
    }

    private fun Candidate.toApiMap(): Map<String, Any?> = mapOf(
        "name" to candidateName,
        "Candidate Name" to candidateName,
        "mobile" to mobileNo,
        "Mobile No." to mobileNo,
        "phones" to phones.map { mapOf("number" to it.number, "type" to it.type, "isPrimary" to it.isPrimary) },
        "emails" to emails.map { mapOf("address" to it.address, "type" to it.type, "isPrimary" to it.isPrimary) },
        "dob" to dob,
        "age" to age,
        "currentAddress" to mapOf(
            "street" to currentAddress.street,
            "city" to currentAddress.city,
            "state" to currentAddress.state,
            "pincode" to currentAddress.pincode
        ),
        "permanentAddress" to mapOf(
            "street" to permanentAddress.street,
            "city" to permanentAddress.city,
            "state" to permanentAddress.state,
            "pincode" to permanentAddress.pincode
        ),
        "isPermanentSameAsCurrent" to isPermanentSameAsCurrent,
        "roleApplied" to positionApplied,
        "Position Applied For" to positionApplied,
        "department" to department,
        "Department" to department,
        "interviewStatus" to finalStatus,
        "Final Status" to finalStatus,
        "interviewDate" to interviewDate,
        "Interview Date" to interviewDate,
        "skills" to skills,
        "currentCtc" to currentSalary,
        "expectedCtc" to expectedSalary,
        "noticePeriod" to noticePeriod,
        "whatsappOptIn" to whatsappOptIn,
        "remarks" to remarks,
        "Remarks" to remarks
    )

    // ---- Public API ----

    suspend fun getModules(): Result<List<PlatformModule>> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Modules") {
                val res = apiService.getModules()
                if (res.success && res.data != null) {
                    res.data.map {
                        PlatformModule(
                            id = it.id,
                            name = it.name,
                            icon = it.icon,
                            description = it.description,
                            route = it.route,
                            status = it.status,
                            order = it.order,
                            category = it.category,
                            version = it.version
                        )
                    }
                } else {
                    getDefaultModules()
                }
            }
        }.recover { getDefaultModules() }
    }

    private fun getDefaultModules(): List<PlatformModule> = listOf(
        PlatformModule("interview-master", "INTERVIEW MASTER", "user-check", "Candidate screening, Gemini resume parsing, and hiring lifecycle.", "/modules/interview-master", "active", 1, "hr", "1.0.0")
    )

    suspend fun getDashboard(): Result<Dashboard> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Dashboard") {
                val response = apiService.getDashboard()
                if (!response.success) throw Exception(response.errorMessage ?: "Failed to load dashboard")
                val data = response.data ?: throw Exception("No dashboard data received")
                val domainDashboard = Dashboard(
                    total = data.total,
                    todayInterviews = data.todayInterviews,
                    selected = data.selected,
                    rejected = data.rejected,
                    pending = data.pending,
                    recentCandidates = data.candidates.map { it.toDomain() }
                )
                // Cache immediately
                cache.setCachedDashboard(domainDashboard)
                domainDashboard
            }
        }
    }

    suspend fun getCandidates(): Result<List<Candidate>> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Candidates") {
                val response = apiService.getCandidates()
                if (!response.success) throw Exception(response.errorMessage ?: "Failed to load candidates")
                val list = response.getCandidateList().map { it.toDomain() }
                // Cache immediately
                cache.setCachedCandidates(list)
                list
            }
        }
    }

    suspend fun getCandidate(id: Int): Result<Candidate> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Candidate_Detail_$id") {
                val response = apiService.getCandidate(id = id.toString())
                if (!response.success) throw Exception(response.errorMessage ?: "Failed to load candidate")
                val domain = response.data?.toDomain() ?: throw Exception("Candidate not found")
                cache.updateCandidate(domain)
                domain
            }
        }
    }

    suspend fun getDropdowns(): Result<Dropdowns> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Dropdowns") {
                val response = apiService.getDropdowns()
                if (!response.success) throw Exception(response.errorMessage ?: "Failed to load dropdowns")
                val data = response.data ?: throw Exception("No dropdown data received")
                val dropdowns = Dropdowns(
                    joiningAvailability = data.joiningAvailability,
                    recommendation = data.recommendation,
                    finalStatus = data.finalStatus,
                    department = data.department,
                    position = data.position
                )
                cache.setCachedDropdowns(dropdowns)
                dropdowns
            }
        }
    }

    suspend fun processResume(file: FilePayload): Result<ExtractedCandidate> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Resume_Gemini_Extraction") {
                val response = apiService.processResume(ProcessResumeRequest(file = file))
                if (!response.success) throw Exception(response.errorMessage ?: "AI processing failed")
                response.data?.candidate ?: throw Exception("No extraction result received")
            }
        }
    }

    suspend fun saveCandidate(
        file: FilePayload,
        candidate: Candidate,
        remarks: String
    ): Result<SaveCandidateResponse> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Candidate_Save") {
                val response = apiService.saveCandidate(
                    SaveCandidateRequest(
                        file = file,
                        candidate = candidate.toApiMap(),
                        remarks = remarks
                    )
                )
                if (!response.success) throw Exception(response.errorMessage ?: "Failed to save candidate to MongoDB")
                val data = response.data ?: throw Exception("No response data after saving candidate")
                
                // Add to local cache
                val newCandidate = candidate.copy(
                    interviewId = data.interviewId,
                    interviewIdString = data.interviewIdString,
                    interviewDate = data.interviewDate.orEmpty(),
                    resumeUrl = data.resumeUrl.orEmpty(),
                    remarks = remarks
                )
                cache.updateCandidate(newCandidate)
                data
            }
        }
    }

    suspend fun updateCandidate(
        candidate: Candidate,
        replaceResume: Boolean = false,
        file: FilePayload? = null,
        interviewId: Int = candidate.interviewId
    ): Result<UpdateCandidateResponse> = withContext(Dispatchers.IO) {
        runCatching {
            PerfLogger.measureSuspend("API_Candidate_Update") {
                val targetId = candidate.interviewIdString.ifBlank { if (interviewId > 0) interviewId.toString() else candidate.interviewId.toString() }
                val response = apiService.updateCandidate(
                    id = targetId,
                    request = UpdateCandidateRequest(
                        interviewId = targetId,
                        candidate = candidate.toApiMap(),
                        replaceResume = replaceResume,
                        file = file
                    )
                )
                if (!response.success) throw Exception(response.errorMessage ?: "Failed to update candidate")
                val data = response.data ?: throw Exception("No response data after update")
                cache.updateCandidate(candidate)
                data
            }
        }
    }

    suspend fun getWhatsApp(id: Int): Result<WhatsAppData> = withContext(Dispatchers.IO) {
        runCatching {
            val response = apiService.getWhatsApp(id = id.toString())
            if (!response.success) throw Exception(response.errorMessage ?: "Failed to load WhatsApp data")
            response.data ?: throw Exception("No WhatsApp data received")
        }
    }
}
