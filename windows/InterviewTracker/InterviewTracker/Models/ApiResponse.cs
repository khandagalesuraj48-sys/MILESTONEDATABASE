using System.Text.Json;
using System.Text.Json.Serialization;

namespace InterviewTracker.Models;

public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("data")]
    public T? Data { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class BootstrapData
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "";

    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("serverTime")]
    public string ServerTime { get; set; } = "";
}

public class NextIdData
{
    [JsonPropertyName("nextId")]
    public string NextId { get; set; } = "";

    [JsonPropertyName("date")]
    public string Date { get; set; } = "";
}

public class WhatsAppData
{
    [JsonPropertyName("whatsappNumber")]
    public string WhatsAppNumber { get; set; } = "";

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";

    [JsonPropertyName("whatsappUrl")]
    public string WhatsAppUrl { get; set; } = "";

    [JsonPropertyName("resumeUrl")]
    public string ResumeUrl { get; set; } = "";
}

public class ProcessResumeData
{
    [JsonPropertyName("candidate")]
    public ExtractedCandidate? Candidate { get; set; }
}

public class ExtractedCandidate
{
    [JsonPropertyName("candidateName")]
    public string CandidateName { get; set; } = "";

    [JsonPropertyName("mobileNo")]
    public string MobileNo { get; set; } = "";

    [JsonPropertyName("educationQualification")]
    public string EducationQualification { get; set; } = "";

    [JsonPropertyName("totalExperienceYears")]
    public string TotalExperienceYears { get; set; } = "";
}

public class SaveCandidateData
{
    [JsonPropertyName("interviewId")]
    public string InterviewId { get; set; } = "";

    [JsonPropertyName("resumeUrl")]
    public string ResumeUrl { get; set; } = "";

    [JsonPropertyName("resumeFileName")]
    public string ResumeFileName { get; set; } = "";
}

public class UpdateCandidateData
{
    [JsonPropertyName("interviewId")]
    public string InterviewId { get; set; } = "";

    [JsonPropertyName("resumeUrl")]
    public string ResumeUrl { get; set; } = "";
}

