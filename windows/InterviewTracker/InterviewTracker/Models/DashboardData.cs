using System.Text.Json.Serialization;

namespace InterviewTracker.Models;

public class DashboardData
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("selected")]
    public int Selected { get; set; }

    [JsonPropertyName("rejected")]
    public int Rejected { get; set; }

    [JsonPropertyName("pending")]
    public int Pending { get; set; }

    [JsonPropertyName("candidates")]
    public List<Candidate> Candidates { get; set; } = new();
}

