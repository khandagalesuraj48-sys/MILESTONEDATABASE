package com.interview.tracker.data.api.models

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken

data class PhoneNumberDto(
    @SerializedName("number") val number: String = "",
    @SerializedName("type") val type: String = "primary",
    @SerializedName("isPrimary") val isPrimary: Boolean = false
)

data class EmailAddressDto(
    @SerializedName("address") val address: String = "",
    @SerializedName("type") val type: String = "primary",
    @SerializedName("isPrimary") val isPrimary: Boolean = false
)

data class AddressDto(
    @SerializedName("street") val street: String = "",
    @SerializedName("city") val city: String = "",
    @SerializedName("state") val state: String = "",
    @SerializedName("pincode") val pincode: String = ""
)

data class EducationDto(
    @SerializedName("qualification") val qualification: String = "",
    @SerializedName("course") val course: String = "",
    @SerializedName("specialization") val specialization: String = "",
    @SerializedName("passingYear") val passingYear: String = "",
    @SerializedName("institute") val institute: String = "",
    @SerializedName("percentageOrCgpa") val percentageOrCgpa: String = ""
)

data class ExperienceDto(
    @SerializedName("company") val company: String = "",
    @SerializedName("designation") val designation: String = "",
    @SerializedName("fromYear") val fromYear: String = "",
    @SerializedName("toYear") val toYear: String = "",
    @SerializedName("roleSummary") val roleSummary: String = "",
    @SerializedName("isCurrent") val isCurrent: Boolean = false
)

data class PlatformModuleDto(
    @SerializedName("id") val id: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("icon") val icon: String = "",
    @SerializedName("description") val description: String = "",
    @SerializedName("route") val route: String = "",
    @SerializedName("status") val status: String = "coming_soon",
    @SerializedName("order") val order: Int = 99,
    @SerializedName("category") val category: String = "operations",
    @SerializedName("version") val version: String = "1.0.0"
)

/**
 * Candidate API response model matching both MongoDB Atlas schema and legacy field names.
 */
data class CandidateDto(
    @SerializedName("Interview ID", alternate = ["interviewId"]) val interviewIdRaw: JsonElement? = null,
    @SerializedName("Interview Date", alternate = ["interviewDate"]) val interviewDate: String? = null,
    @SerializedName("Candidate Name", alternate = ["name", "candidateName"]) val candidateName: String? = null,
    @SerializedName("Mobile No.", alternate = ["mobile", "mobileNo"]) val mobileNo: String? = null,
    @SerializedName("phones") val phones: List<PhoneNumberDto>? = null,
    @SerializedName("emails") val emails: List<EmailAddressDto>? = null,
    @SerializedName("dob") val dob: String? = null,
    @SerializedName("age") val age: Int? = null,
    @SerializedName("currentAddress") val currentAddress: AddressDto? = null,
    @SerializedName("permanentAddress") val permanentAddress: AddressDto? = null,
    @SerializedName("isPermanentSameAsCurrent") val isPermanentSameAsCurrent: Boolean = false,
    @SerializedName("education") val educationList: List<EducationDto>? = null,
    @SerializedName("Education / Qualification") val educationLegacy: String? = null,
    @SerializedName("experience") val experienceList: List<ExperienceDto>? = null,
    @SerializedName("totalExperienceYears", alternate = ["Total Experience (Years)"]) val totalExperienceRaw: JsonElement? = null,
    @SerializedName("currentCompany") val currentCompany: String? = null,
    @SerializedName("currentDesignation") val currentDesignation: String? = null,
    @SerializedName("Current Location") val currentLocation: String? = null,
    @SerializedName("Current Salary", alternate = ["currentCtc"]) val currentSalary: String? = null,
    @SerializedName("Expected Salary", alternate = ["expectedCtc"]) val expectedSalary: String? = null,
    @SerializedName("Notice Period", alternate = ["noticePeriod"]) val noticePeriod: String? = null,
    @SerializedName("Position Applied For", alternate = ["roleApplied", "position"]) val positionApplied: String? = null,
    @SerializedName("Department", alternate = ["department"]) val department: String? = null,
    @SerializedName("skills") val skills: List<String>? = null,
    @SerializedName("Final Status", alternate = ["interviewStatus", "status"]) val finalStatus: String? = null,
    @SerializedName("interviewMode") val interviewMode: String? = null,
    @SerializedName("interviewTime") val interviewTime: String? = null,
    @SerializedName("Joining Availability") val joiningAvailability: String? = null,
    @SerializedName("Technical Knowledge (10)") val technicalKnowledge: String? = null,
    @SerializedName("Recommendation") val recommendation: String? = null,
    @SerializedName("Joining Date") val joiningDate: String? = null,
    @SerializedName("Interviewer") val interviewer: String? = null,
    @SerializedName("Resume URL", alternate = ["resumeUrl"]) val resumeUrl: String? = null,
    @SerializedName("resumeDocumentId") val resumeDocumentId: String? = null,
    @SerializedName("resumeFileName") val resumeFileName: String? = null,
    @SerializedName("whatsappOptIn") val whatsappOptIn: Boolean = true,
    @SerializedName("Remarks", alternate = ["remarks"]) val remarks: String? = null
) {
    val interviewIdString: String
        get() = when {
            interviewIdRaw == null || interviewIdRaw.isJsonNull -> ""
            interviewIdRaw.isJsonPrimitive -> interviewIdRaw.asString
            else -> ""
        }

    val interviewId: Int
        get() = try {
            when {
                interviewIdRaw == null || interviewIdRaw.isJsonNull -> 0
                interviewIdRaw.isJsonPrimitive -> {
                    val prim = interviewIdRaw.asJsonPrimitive
                    if (prim.isNumber) prim.asInt
                    else prim.asString.filter { it.isDigit() }.toIntOrNull() ?: 0
                }
                else -> 0
            }
        } catch (_: Exception) { 0 }

    val totalExperience: String
        get() = when {
            totalExperienceRaw == null || totalExperienceRaw.isJsonNull -> ""
            totalExperienceRaw.isJsonPrimitive -> totalExperienceRaw.asString
            else -> ""
        }
}

data class CandidatesListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val rawData: JsonElement? = null,
    @SerializedName("error") val error: JsonElement? = null
) {
    val errorMessage: String?
        get() = when {
            error == null || error.isJsonNull -> null
            error.isJsonPrimitive -> error.asString
            error.isJsonObject && error.asJsonObject.has("message") -> error.asJsonObject.get("message").asString
            else -> error.toString()
        }

    fun getCandidateList(gson: Gson = Gson()): List<CandidateDto> {
        return try {
            when {
                rawData == null || rawData.isJsonNull -> emptyList()
                rawData.isJsonArray -> {
                    val listType = object : TypeToken<List<CandidateDto>>() {}.type
                    gson.fromJson(rawData, listType)
                }
                rawData.isJsonObject -> {
                    val obj = rawData.asJsonObject
                    if (obj.has("candidates") && obj.get("candidates").isJsonArray) {
                        val listType = object : TypeToken<List<CandidateDto>>() {}.type
                        gson.fromJson(obj.get("candidates"), listType)
                    } else emptyList()
                }
                else -> emptyList()
            }
        } catch (_: Exception) { emptyList() }
    }
}

data class CandidateDetailResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: CandidateDto? = null,
    @SerializedName("error") val error: JsonElement? = null
) {
    val errorMessage: String?
        get() = when {
            error == null || error.isJsonNull -> null
            error.isJsonPrimitive -> error.asString
            error.isJsonObject && error.asJsonObject.has("message") -> error.asJsonObject.get("message").asString
            else -> error.toString()
        }
}

// ---- Request body models ----

data class FilePayload(
    @SerializedName("fileName") val fileName: String,
    @SerializedName("mimeType") val mimeType: String,
    @SerializedName("base64") val base64: String
)

data class ProcessResumeRequest(
    @SerializedName("action") val action: String = "processResume",
    @SerializedName("file") val file: FilePayload
)

data class ExtractedCandidateWrapper(
    @SerializedName("candidate") val candidate: ExtractedCandidate
)

data class ExtractedCandidate(
    @SerializedName("Candidate Name", alternate = ["candidateName", "name"]) val candidateName: String? = null,
    @SerializedName("Mobile No.", alternate = ["mobileNo", "mobile"]) val mobileNo: String? = null,
    @SerializedName("phones") val phones: List<PhoneNumberDto>? = null,
    @SerializedName("emails") val emails: List<EmailAddressDto>? = null,
    @SerializedName("dob") val dob: String? = null,
    @SerializedName("gender") val gender: String? = null,
    @SerializedName("currentAddress") val currentAddress: AddressDto? = null,
    @SerializedName("permanentAddress") val permanentAddress: AddressDto? = null,
    @SerializedName("education") val educationList: List<EducationDto>? = null,
    @SerializedName("experience") val experienceList: List<ExperienceDto>? = null,
    @SerializedName("skills") val skills: List<String>? = null,
    @SerializedName("Position Applied For", alternate = ["positionApplied", "position", "roleApplied"]) val positionApplied: String? = null,
    @SerializedName("Department", alternate = ["department"]) val department: String? = null,
    @SerializedName("Education / Qualification", alternate = ["educationQualification", "education"]) val educationQualification: String? = null,
    @SerializedName("Total Experience (Years)", alternate = ["totalExperienceYears", "totalExperience"]) val totalExperienceYears: String? = null,
    @SerializedName("Current Location", alternate = ["currentLocation", "location"]) val currentLocation: String? = null,
    @SerializedName("Current Salary", alternate = ["currentSalary", "currentCtc"]) val currentSalary: String? = null,
    @SerializedName("Expected Salary", alternate = ["expectedSalary", "expectedCtc"]) val expectedSalary: String? = null,
    @SerializedName("Notice Period", alternate = ["noticePeriod"]) val noticePeriod: String? = null,
    @SerializedName("Joining Availability", alternate = ["joiningAvailability"]) val joiningAvailability: String? = null,
    @SerializedName("Technical Knowledge (10)", alternate = ["technicalKnowledge"]) val technicalKnowledge: String? = null,
    @SerializedName("Recommendation", alternate = ["recommendation"]) val recommendation: String? = null,
    @SerializedName("Final Status", alternate = ["finalStatus", "status"]) val finalStatus: String? = null,
    @SerializedName("Joining Date", alternate = ["joiningDate"]) val joiningDate: String? = null,
    @SerializedName("Interviewer", alternate = ["interviewer"]) val interviewer: String? = null,
    @SerializedName("Remarks", alternate = ["remarks", "summary"]) val remarks: String? = null
) {
    val effectiveMobile: String
        get() = mobileNo?.ifBlank { null }
            ?: phones?.firstOrNull()?.number
            ?: ""

    val effectiveEducation: String
        get() = educationQualification?.ifBlank { null }
            ?: educationList?.filter { it.qualification.isNotBlank() }?.joinToString(", ") {
                listOf(it.qualification, it.course).filter { part -> part.isNotBlank() }.joinToString(" in ")
            }
            ?: ""

    val effectiveLocation: String
        get() = currentLocation?.ifBlank { null }
            ?: listOfNotNull(currentAddress?.city, currentAddress?.state).filter { it.isNotBlank() }.joinToString(", ")

    val effectiveTotalExperience: String
        get() = totalExperienceYears ?: ""
}

data class SaveCandidateRequest(
    @SerializedName("action") val action: String = "saveCandidate",
    @SerializedName("file") val file: FilePayload,
    @SerializedName("candidate") val candidate: Map<String, Any?>,
    @SerializedName("remarks") val remarks: String = ""
)

data class SaveCandidateResponse(
    @SerializedName("interviewId") val interviewIdRaw: JsonElement? = null,
    @SerializedName("interviewDate") val interviewDate: String? = null,
    @SerializedName("resumeUrl") val resumeUrl: String? = null,
    @SerializedName("resumeFileName") val resumeFileName: String? = null
) {
    val interviewId: Int
        get() = try {
            when {
                interviewIdRaw == null || interviewIdRaw.isJsonNull -> 0
                interviewIdRaw.isJsonPrimitive -> {
                    val prim = interviewIdRaw.asJsonPrimitive
                    if (prim.isNumber) prim.asInt
                    else prim.asString.filter { it.isDigit() }.toIntOrNull() ?: 0
                }
                else -> 0
            }
        } catch (_: Exception) { 0 }

    val interviewIdString: String
        get() = when {
            interviewIdRaw == null || interviewIdRaw.isJsonNull -> ""
            interviewIdRaw.isJsonPrimitive -> interviewIdRaw.asString
            else -> ""
        }
}

data class UpdateCandidateRequest(
    @SerializedName("action") val action: String = "updateCandidate",
    @SerializedName("interviewId") val interviewId: String,
    @SerializedName("candidate") val candidate: Map<String, Any?>,
    @SerializedName("replaceResume") val replaceResume: Boolean = false,
    @SerializedName("file") val file: FilePayload? = null
)

data class UpdateCandidateResponse(
    @SerializedName("interviewId") val interviewId: String? = null,
    @SerializedName("resumeUrl") val resumeUrl: String? = null
)
