package com.interview.tracker.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Database(
    entities = [DraftEntity::class],
    version = 1,
    exportSchema = false
)
abstract class DraftDatabase : RoomDatabase() {
    abstract fun draftDao(): DraftDao
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): DraftDatabase {
        return Room.databaseBuilder(
            context,
            DraftDatabase::class.java,
            "interview_tracker_db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideDraftDao(database: DraftDatabase): DraftDao {
        return database.draftDao()
    }
}
