package com.interview.tracker.data.api

import com.interview.tracker.BuildConfig
import com.interview.tracker.util.Constants
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ApiClient {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        // Interceptor to ensure Google Apps Script URLs do not have a trailing slash on /exec
        // Google Apps Script returns HTTP 404 if /exec/ has a trailing slash.
        val trailingSlashInterceptor = Interceptor { chain ->
            val request = chain.request()
            val url = request.url
            val path = url.encodedPath
            if (path.endsWith("/exec/")) {
                val newPath = path.substring(0, path.length - 1)
                val newUrl = url.newBuilder().encodedPath(newPath).build()
                chain.proceed(request.newBuilder().url(newUrl).build())
            } else {
                chain.proceed(request)
            }
        }

        return OkHttpClient.Builder()
            .addInterceptor(trailingSlashInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(Constants.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(Constants.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(Constants.WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        val rawUrl = (BuildConfig.API_BASE_URL.ifEmpty { Constants.DEFAULT_BASE_URL }).trim()
        val baseUrl = if (rawUrl.endsWith("/exec")) {
            rawUrl.substringBeforeLast("/exec") + "/"
        } else if (rawUrl.endsWith("/")) {
            rawUrl
        } else {
            "$rawUrl/"
        }

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
