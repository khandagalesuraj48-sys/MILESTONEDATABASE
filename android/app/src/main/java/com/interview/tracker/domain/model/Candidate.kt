package com.interview.tracker.domain.model

data class PhoneNumber(
    val number: String = "",
    val type: String = "primary",
    val isPrimary: Boolean = false
)

data class EmailAddress(
    val address: String = "",
    val type: String = "primary",
    val isPrimary: Boolean = false
)

data class Address(
    val street: String = "",
    val city: String = "",
    val state: String = "",
    val pincode: String = ""
)

data class EducationItem(
    val qualification: String = "",
    val course: String = "",
    val specialization: String = "",
    val passingYear: String = "",
    val institute: String = "",
    val percentageOrCgpa: String = ""
)

data class ExperienceItem(
    val company: String = "",
    val designation: String = "",
    val fromYear: String = "",
    val toYear: String = "",
    val roleSummary: String = "",
    val isCurrent: Boolean = false
)

/**
 * Domain model for a candidate, decoupled from API DTO.
 */
data class Candidate(
    val interviewId: Int = 0,
    val interviewIdString: String = "",
    val interviewDate: String = "",
    val candidateName: String = "",
    val mobileNo: String = "",
    val phones: List<PhoneNumber> = emptyList(),
    val emails: List<EmailAddress> = emptyList(),
    val dob: String = "",
    val age: Int? = null,
    val currentAddress: Address = Address(),
    val permanentAddress: Address = Address(),
    val isPermanentSameAsCurrent: Boolean = false,
    val educationList: List<EducationItem> = emptyList(),
    val education: String = "",
    val experienceList: List<ExperienceItem> = emptyList(),
    val totalExperience: String = "",
    val currentCompany: String = "",
    val currentDesignation: String = "",
    val currentLocation: String = "",
    val currentSalary: String = "",
    val expectedSalary: String = "",
    val noticePeriod: String = "",
    val positionApplied: String = "",
    val department: String = "",
    val skills: List<String> = emptyList(),
    val joiningAvailability: String = "",
    val technicalKnowledge: String = "",
    val recommendation: String = "",
    val finalStatus: String = "",
    val joiningDate: String = "",
    val interviewer: String = "",
    val resumeUrl: String = "",
    val resumeDocumentId: String = "",
    val whatsappOptIn: Boolean = true,
    val remarks: String = ""
) {
    val displayId: String
        get() = interviewIdString.ifBlank { if (interviewId > 0) "#$interviewId" else "Pending" }

    val allPhones: List<PhoneNumber>
        get() = if (phones.isNotEmpty()) phones else if (mobileNo.isNotBlank()) listOf(PhoneNumber(number = mobileNo, type = "primary", isPrimary = true)) else emptyList()
}
