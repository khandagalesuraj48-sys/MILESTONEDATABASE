package com.interview.tracker.data.api

import com.interview.tracker.data.api.models.*
import retrofit2.http.*

/**
 * Retrofit interface for MILESTONE DATABASE backend.
 * Supports REST endpoints on Vercel Node.js backend.
 */
interface ApiService {

    // ---- Module Registry & Platform ----

    @GET("modules")
    suspend fun getModules(): ApiResponse<List<PlatformModuleDto>>

    // ---- Interview Master Endpoints ----

    @GET("interviews/dashboard")
    suspend fun getDashboard(): DashboardResponse

    @GET("candidates")
    suspend fun getCandidates(
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
        @Query("role") role: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): CandidatesListResponse

    @GET("candidates/{id}")
    suspend fun getCandidate(
        @Path("id") id: String
    ): CandidateDetailResponse

    @GET("dropdowns")
    suspend fun getDropdowns(): DropdownsResponse

    @GET("whatsapp")
    suspend fun getWhatsApp(
        @Query("id") id: String
    ): ApiResponse<WhatsAppData>

    // ---- POST / PUT endpoints ----

    @POST("interviews/extract-resume")
    suspend fun processResume(
        @Body request: ProcessResumeRequest
    ): ApiResponse<ExtractedCandidateWrapper>

    @POST("interviews/submit")
    suspend fun saveCandidate(
        @Body request: SaveCandidateRequest
    ): ApiResponse<SaveCandidateResponse>

    @PUT("candidates/{id}")
    suspend fun updateCandidate(
        @Path("id") id: String,
        @Body request: UpdateCandidateRequest
    ): ApiResponse<UpdateCandidateResponse>
}
