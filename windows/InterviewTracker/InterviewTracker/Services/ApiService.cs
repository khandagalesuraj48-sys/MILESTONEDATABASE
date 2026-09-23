using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using InterviewTracker.Models;

namespace InterviewTracker.Services;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public ApiService(SettingsService settings)
    {
        _baseUrl = settings.ApiBaseUrl;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(120)
        };
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "InterviewTracker/1.0");
    }

    private string BuildUrl(string queryString) => $"{_baseUrl}?{queryString}";

    private async Task<ApiResponse<T>> GetAsync<T>(string queryString)
    {
        try
        {
            var url = BuildUrl(queryString);
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ApiResponse<T>>(json, _jsonOptions);
            return result ?? new ApiResponse<T> { Success = false, Error = "Invalid response" };
        }
        catch (HttpRequestException ex)
        {
            return new ApiResponse<T> { Success = false, Error = $"Network error: {ex.Message}" };
        }
        catch (TaskCanceledException)
        {
            return new ApiResponse<T> { Success = false, Error = "Request timed out. Please check your connection." };
        }
        catch (Exception ex)
        {
            return new ApiResponse<T> { Success = false, Error = ex.Message };
        }
    }

    private async Task<ApiResponse<T>> PostAsync<T>(object requestBody)
    {
        try
        {
            var json = JsonSerializer.Serialize(requestBody, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(_baseUrl, content);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ApiResponse<T>>(responseJson, _jsonOptions);
            return result ?? new ApiResponse<T> { Success = false, Error = "Invalid response" };
        }
        catch (HttpRequestException ex)
        {
            return new ApiResponse<T> { Success = false, Error = $"Network error: {ex.Message}" };
        }
        catch (TaskCanceledException)
        {
            return new ApiResponse<T> { Success = false, Error = "Request timed out. The file may be too large." };
        }
        catch (Exception ex)
        {
            return new ApiResponse<T> { Success = false, Error = ex.Message };
        }
    }

    public Task<ApiResponse<BootstrapData>> GetBootstrapAsync()
        => GetAsync<BootstrapData>("action=bootstrap");

    public Task<ApiResponse<DashboardData>> GetDashboardAsync()
        => GetAsync<DashboardData>("action=dashboard");

    public Task<ApiResponse<List<Candidate>>> GetCandidatesAsync()
        => GetAsync<List<Candidate>>("action=candidates");

    public Task<ApiResponse<Candidate>> GetCandidateAsync(string id)
        => GetAsync<Candidate>($"action=candidate&id={Uri.EscapeDataString(id)}");

    public Task<ApiResponse<Dropdowns>> GetDropdownsAsync()
        => GetAsync<Dropdowns>("action=dropdowns");

    public Task<ApiResponse<NextIdData>> GetNextIdAsync()
        => GetAsync<NextIdData>("action=nextId");

    public Task<ApiResponse<WhatsAppData>> GetWhatsAppDataAsync(string id)
        => GetAsync<WhatsAppData>($"action=whatsapp&id={Uri.EscapeDataString(id)}");

    public Task<ApiResponse<ProcessResumeData>> ProcessResumeAsync(ProcessResumeRequest request)
        => PostAsync<ProcessResumeData>(request);

    public Task<ApiResponse<SaveCandidateData>> SaveCandidateAsync(SaveCandidateRequest request)
        => PostAsync<SaveCandidateData>(request);

    public Task<ApiResponse<UpdateCandidateData>> UpdateCandidateAsync(UpdateCandidateRequest request)
        => PostAsync<UpdateCandidateData>(request);
}

