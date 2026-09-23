import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  getCandidatesCollection,
  getDropdownsCollection,
  getAuditLogsCollection,
  getDocumentsCollection,
  getEmployeesCollection,
  getInterviewsCollection,
  getSettingsCollection,
  getCountersCollection,
} from '../../config/db';
import {
  ApiResponse,
  CandidateDocument,
  DashboardStats,
  EmployeeDocument,
  DocumentMetadataDocument,
  InterviewEventDocument,
  SettingsDocument,
} from '../../models/types';
import { getNextInterviewId } from '../../services/counter.service';
import { uploadResumeBuffer, getResumeStream, deleteResume } from '../../services/gridfs.service';
import { extractResumeWithGemini } from '../../services/gemini.service';
import { calculateDistinctExperienceYears } from '../../utils/experience.util';

/**
 * Format today's date in Asia/Kolkata timezone (YYYY-MM-DD)
 */
function getTodayKolkata(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(now);
}

/**
 * GET /api/v1/interviews/dashboard
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const candidatesCol = await getCandidatesCollection();
    const today = getTodayKolkata();

    const [
      totalCandidates,
      todayInterviews,
      statusAggregation,
      roleAggregation,
      recentCandidates,
    ] = await Promise.all([
      candidatesCol.countDocuments(),
      candidatesCol.countDocuments({ interviewDate: today }),
      candidatesCol
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$interviewStatus', count: { $sum: 1 } } },
        ])
        .toArray(),
      candidatesCol
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$roleApplied', count: { $sum: 1 } } },
        ])
        .toArray(),
      candidatesCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const item of statusAggregation) {
      if (item._id) byStatus[item._id] = item.count;
    }

    const byRole: Record<string, number> = {};
    for (const item of roleAggregation) {
      if (item._id) byRole[item._id] = item.count;
    }

    const stats: DashboardStats = {
      totalCandidates,
      todayInterviews,
      byStatus,
      byRole,
      recentCandidates,
    };

    return res.json({
      success: true,
      data: stats,
      message: 'Dashboard data retrieved successfully',
    } as ApiResponse<DashboardStats>);
  } catch (error: any) {
    console.error('[InterviewMaster] Dashboard error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: error.message || 'Failed to fetch dashboard metrics',
      },
    } as ApiResponse);
  }
}

/**
 * GET /api/v1/candidates
 */
export async function getCandidates(req: Request, res: Response) {
  try {
    const candidatesCol = await getCandidatesCollection();
    const { search, status, role, page = '1', limit = '50' } = req.query;

    const filter: any = {};

    if (status && typeof status === 'string' && status !== 'All') {
      filter.interviewStatus = status;
    }

    if (role && typeof role === 'string' && role !== 'All') {
      filter.roleApplied = role;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { interviewId: { $regex: q, $options: 'i' } },
        { 'phones.number': { $regex: q, $options: 'i' } },
        { 'emails.address': { $regex: q, $options: 'i' } },
        { roleApplied: { $regex: q, $options: 'i' } },
        { skills: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      candidatesCol.countDocuments(filter),
      candidatesCol
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
    ]);

    return res.json({
      success: true,
      data: {
        candidates: items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      message: 'Candidates list retrieved successfully',
    } as ApiResponse);
  } catch (error: any) {
    console.error('[InterviewMaster] Candidates error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CANDIDATES_FETCH_ERROR',
        message: error.message || 'Failed to fetch candidates',
      },
    } as ApiResponse);
  }
}

/**
 * GET /api/v1/candidates/:id
 */
export async function getCandidateById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const candidatesCol = await getCandidatesCollection();

    let candidate: CandidateDocument | null = null;
    if (ObjectId.isValid(id)) {
      candidate = await candidatesCol.findOne({ _id: new ObjectId(id) });
    }
    if (!candidate) {
      candidate = await candidatesCol.findOne({ interviewId: id });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: `Candidate with ID '${id}' not found`,
        },
      } as ApiResponse);
    }

    return res.json({
      success: true,
      data: candidate,
      message: 'Candidate retrieved successfully',
    } as ApiResponse<CandidateDocument>);
  } catch (error: any) {
    console.error('[InterviewMaster] Candidate detail error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CANDIDATE_FETCH_ERROR',
        message: error.message || 'Failed to fetch candidate details',
      },
    } as ApiResponse);
  }
}

/**
 * POST /api/v1/interviews/extract-resume and POST /api/v1/resume/extract
 */
export async function extractResume(req: Request, res: Response) {
  try {
    let pdfBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';
    let fileName = 'resume.pdf';
    let fileSize = 0;

    // 1. Check multipart/form-data upload (Web client)
    if (req.file) {
      pdfBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'application/pdf';
      fileName = req.file.originalname || 'resume.pdf';
      fileSize = req.file.size;
    }
    // 2. Check JSON payload upload (Android / Mobile client)
    else if (req.body?.file?.base64) {
      const base64Data = req.body.file.base64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Buffer.from(base64Data, 'base64');
      mimeType = req.body.file.mimeType || 'application/pdf';
      fileName = req.body.file.fileName || 'resume.pdf';
      fileSize = pdfBuffer.length;
    } else if (req.body?.base64) {
      const base64Data = req.body.base64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Buffer.from(base64Data, 'base64');
      mimeType = req.body.mimeType || 'application/pdf';
      fileName = req.body.fileName || 'resume.pdf';
      fileSize = pdfBuffer.length;
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'Please attach a valid PDF resume file to extract.',
        },
      } as ApiResponse);
    }

    if (fileSize > 20 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'The selected PDF resume exceeds the maximum allowed 20MB limit.',
        },
      } as ApiResponse);
    }

    const extractedData = await extractResumeWithGemini(pdfBuffer, mimeType);

    // Audit log
    const auditLogs = await getAuditLogsCollection();
    await auditLogs.insertOne({
      entityType: 'document',
      entityId: fileName,
      action: 'extract',
      details: {
        fileSize,
        fileName,
      },
      timestamp: new Date(),
      ipAddress: req.ip,
    });

    const responsePayload = {
      ...extractedData,
      candidate: extractedData,
      // Map flat legacy & Android field names
      candidateName: extractedData.name,
      mobileNo: extractedData.phones?.[0]?.number || '',
      educationQualification: extractedData.education?.map((e) => [e.qualification, e.course].filter(Boolean).join(' in ')).join(', ') || '',
      currentLocation: [extractedData.currentAddress?.city, extractedData.currentAddress?.state].filter(Boolean).join(', ') || '',
      positionApplied: extractedData.roleApplied || '',
      totalExperienceYears: String(extractedData.totalExperienceYears || '0'),
      currentCompany: extractedData.currentCompany || '',
      currentDesignation: extractedData.currentDesignation || '',
      currentSalary: extractedData.currentCtc || '',
      expectedSalary: extractedData.expectedCtc || '',
      noticePeriod: extractedData.noticePeriod || '',
      joiningAvailability: extractedData.joiningAvailability || '',
      technicalKnowledge: extractedData.technicalKnowledge || '',
      recommendation: extractedData.recommendation || '',
      finalStatus: extractedData.status || 'Scheduled',
      joiningDate: extractedData.joiningDate || '',
      remarks: extractedData.summary || extractedData.remarks || '',
    };

    return res.json({
      success: true,
      data: responsePayload,
      message: 'Resume extracted successfully via Gemini AI',
    } as ApiResponse);
  } catch (error: any) {
    console.error('[InterviewMaster] Extract resume error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RESUME_EXTRACTION_FAILED',
        message: error.message || 'Failed to extract resume via Gemini',
      },
    } as ApiResponse);
  }
}

/**
 * POST /api/v1/interviews/submit and POST /api/v1/submit
 */
export async function submitInterview(req: Request, res: Response) {
  try {
    const rawData = req.body || {};
    let candidateData: any = {};

    if (rawData.data && typeof rawData.data === 'string') {
      try {
        candidateData = JSON.parse(rawData.data);
      } catch {
        candidateData = rawData;
      }
    } else if (rawData.candidate && typeof rawData.candidate === 'object') {
      candidateData = { ...rawData.candidate, remarks: rawData.remarks || rawData.candidate.remarks };
    } else {
      candidateData = rawData;
    }

    const candidateName = (
      candidateData.name ||
      candidateData['Candidate Name'] ||
      candidateData.candidateName ||
      ''
    ).trim();

    if (!candidateName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Candidate name is required.',
        },
      } as ApiResponse);
    }

    // 1. GridFS PDF upload if file present (either multipart or JSON base64)
    let resumeDocumentId: ObjectId | undefined;
    let resumeFileName: string | undefined;
    let resumeFileSize: number | undefined;

    if (req.file) {
      const originalName = req.file.originalname || 'resume.pdf';
      resumeDocumentId = await uploadResumeBuffer(req.file.buffer, originalName, req.file.mimetype || 'application/pdf');
      resumeFileName = originalName;
      resumeFileSize = req.file.size;
    } else {
      const filePayload = rawData.file || candidateData.file;
      if (filePayload && filePayload.base64) {
        const base64Data = filePayload.base64.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const originalName = filePayload.fileName || 'resume.pdf';
        const mimeType = filePayload.mimeType || 'application/pdf';
        resumeDocumentId = await uploadResumeBuffer(pdfBuffer, originalName, mimeType);
        resumeFileName = originalName;
        resumeFileSize = pdfBuffer.length;
      }
    }

    // 2. Generate Atomic Interview ID
    const interviewId = await getNextInterviewId();

    // 3. Compute age if DOB is provided
    let age = candidateData.age;
    const dob = candidateData.dob || candidateData['DOB'] || '';
    if (dob && !age) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
    }

    // 4. Normalize phones & emails
    const primaryMobile = candidateData.mobile || candidateData['Mobile No.'] || candidateData.mobileNo || '';
    const phones = Array.isArray(candidateData.phones) && candidateData.phones.length > 0
      ? candidateData.phones
      : [{ number: primaryMobile, type: 'primary', isPrimary: true }];

    const primaryEmail = candidateData.email || candidateData['Email'] || candidateData.emailAddress || '';
    const emails = Array.isArray(candidateData.emails) && candidateData.emails.length > 0
      ? candidateData.emails
      : [{ address: primaryEmail, type: 'primary', isPrimary: true }];

    // Compute distinct experience avoiding double counting concurrent intervals
    let totalExperienceYears = Number(
      candidateData.totalExperienceYears ||
      candidateData['Total Experience (Years)'] ||
      0
    );
    if ((!totalExperienceYears || totalExperienceYears === 0) && Array.isArray(candidateData.experience) && candidateData.experience.length > 0) {
      totalExperienceYears = calculateDistinctExperienceYears(candidateData.experience);
    }
    if (isNaN(totalExperienceYears)) totalExperienceYears = 0;

    const now = new Date();
    const currentLoc = candidateData['Current Location'] || '';
    const currentAddress = candidateData.currentAddress || {
      street: currentLoc,
      city: candidateData.city || '',
      state: candidateData.state || '',
      pincode: candidateData.pincode || '',
    };

    const newCandidate: CandidateDocument = {
      interviewId,
      name: candidateName,
      phones,
      emails,
      dob,
      age: age || undefined,
      currentAddress,
      permanentAddress: candidateData.isPermanentSameAsCurrent
        ? currentAddress
        : (candidateData.permanentAddress || currentAddress),
      isPermanentSameAsCurrent: !!candidateData.isPermanentSameAsCurrent,
      education: Array.isArray(candidateData.education) ? candidateData.education : [],
      experience: Array.isArray(candidateData.experience) ? candidateData.experience : [],
      totalExperienceYears,
      currentCompany: candidateData.currentCompany || candidateData['Current Company'] || '',
      currentDesignation: candidateData.currentDesignation || candidateData['Current Designation'] || '',
      currentCtc: candidateData.currentCtc || candidateData['Current Salary'] || '',
      expectedCtc: candidateData.expectedCtc || candidateData['Expected Salary'] || '',
      noticePeriod: candidateData.noticePeriod || candidateData['Notice Period'] || '',
      skills: Array.isArray(candidateData.skills)
        ? candidateData.skills
        : (candidateData.skills ? String(candidateData.skills).split(',').map((s: string) => s.trim()) : []),
      roleApplied: candidateData.roleApplied || candidateData['Position Applied For'] || candidateData.position || candidateData.role || 'Software Engineer',
      department: candidateData.department || candidateData['Department'] || 'Engineering',
      interviewDate: candidateData.interviewDate || candidateData['Interview Date'] || getTodayKolkata(),
      interviewTime: candidateData.interviewTime || candidateData['Interview Time'] || '',
      interviewMode: candidateData.interviewMode || candidateData['Interview Mode'] || 'In-Person',
      interviewStatus: candidateData.interviewStatus || candidateData['Final Status'] || candidateData.status || 'Scheduled',
      remarks: candidateData.remarks || candidateData['Remarks'] || rawData.remarks || '',
      resumeDocumentId: resumeDocumentId ? resumeDocumentId.toString() : (candidateData.resumeDocumentId || undefined),
      resumeFileName: resumeFileName || candidateData.resumeFileName || undefined,
      resumeFileSize: resumeFileSize || candidateData.resumeFileSize || undefined,
      whatsappOptIn: candidateData.whatsappOptIn !== undefined ? !!candidateData.whatsappOptIn : true,
      createdAt: now,
      updatedAt: now,
    };

    const candidatesCol = await getCandidatesCollection();
    const insertResult = await candidatesCol.insertOne(newCandidate);
    newCandidate._id = insertResult.insertedId;

    // Record document metadata in documents collection for GridFS linkage
    if (resumeDocumentId) {
      const documentsCol = await getDocumentsCollection();
      await documentsCol.insertOne({
        resumeFileName: resumeFileName || 'resume.pdf',
        mimeType: 'application/pdf',
        fileSize: resumeFileSize || 0,
        gridFsId: resumeDocumentId,
        entityType: 'candidate',
        entityId: interviewId,
        documentType: 'resume',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Record in interviews collection
    const interviewsCol = await getInterviewsCollection();
    await interviewsCol.insertOne({
      interviewId,
      candidateName: newCandidate.name,
      position: newCandidate.roleApplied,
      department: newCandidate.department,
      interviewDate: newCandidate.interviewDate,
      interviewTime: newCandidate.interviewTime,
      interviewMode: newCandidate.interviewMode,
      status: newCandidate.interviewStatus,
      notes: newCandidate.remarks,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Audit Log
    const auditLogs = await getAuditLogsCollection();
    await auditLogs.insertOne({
      entityType: 'candidate',
      entityId: interviewId,
      action: 'create',
      details: { name: newCandidate.name, role: newCandidate.roleApplied },
      timestamp: now,
      ipAddress: req.ip,
    });

    const responseData = {
      ...newCandidate,
      interviewId,
      interviewDate: newCandidate.interviewDate,
      resumeUrl: `/api/v1/candidates/${interviewId}/resume`,
      resumeFileName: newCandidate.resumeFileName,
      interviewIdRaw: interviewId, // For Android SaveCandidateResponse
    };

    return res.status(201).json({
      success: true,
      data: responseData,
      message: `Candidate saved successfully with Interview ID: ${interviewId}`,
    } as ApiResponse);
  } catch (error: any) {
    console.error('[InterviewMaster] Submit error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBMISSION_FAILED',
        message: error.message || 'Failed to submit candidate to MongoDB',
      },
    } as ApiResponse);
  }
}

/**
 * PUT /api/v1/candidates/:id
 */
export async function updateCandidate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const candidatesCol = await getCandidatesCollection();

    let existing: CandidateDocument | null = null;
    if (ObjectId.isValid(id)) {
      existing = await candidatesCol.findOne({ _id: new ObjectId(id) });
    }
    if (!existing) {
      existing = await candidatesCol.findOne({ interviewId: id });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: `Candidate with ID '${id}' not found for update`,
        },
      } as ApiResponse);
    }

    const rawData = req.body || {};
    let updateData: any = {};
    if (rawData.data && typeof rawData.data === 'string') {
      try {
        updateData = JSON.parse(rawData.data);
      } catch {
        updateData = rawData;
      }
    } else if (rawData.candidate && typeof rawData.candidate === 'object') {
      updateData = rawData.candidate;
    } else {
      updateData = rawData;
    }

    // Optional resume file replacement
    let resumeDocumentId = existing.resumeDocumentId;
    let resumeFileName = existing.resumeFileName;
    let resumeFileSize = existing.resumeFileSize;

    if (req.file) {
      if (existing.resumeDocumentId) {
        await deleteResume(existing.resumeDocumentId);
      }
      const originalName = req.file.originalname || 'resume.pdf';
      const newFileId = await uploadResumeBuffer(req.file.buffer, originalName, req.file.mimetype || 'application/pdf');
      resumeDocumentId = newFileId.toString();
      resumeFileName = originalName;
      resumeFileSize = req.file.size;
    } else if (rawData.file && rawData.file.base64 && (rawData.replaceResume || updateData.replaceResume)) {
      if (existing.resumeDocumentId) {
        await deleteResume(existing.resumeDocumentId);
      }
      const base64Data = rawData.file.base64.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const originalName = rawData.file.fileName || 'resume.pdf';
      const newFileId = await uploadResumeBuffer(pdfBuffer, originalName, 'application/pdf');
      resumeDocumentId = newFileId.toString();
      resumeFileName = originalName;
      resumeFileSize = pdfBuffer.length;
    }

    const updatedFields: Partial<CandidateDocument> = {
      ...(updateData.name && { name: updateData.name.trim() }),
      ...(updateData.phones && { phones: updateData.phones }),
      ...(updateData.emails && { emails: updateData.emails }),
      ...(updateData.dob !== undefined && { dob: updateData.dob }),
      ...(updateData.age !== undefined && { age: updateData.age }),
      ...(updateData.currentAddress && { currentAddress: updateData.currentAddress }),
      ...(updateData.permanentAddress && { permanentAddress: updateData.permanentAddress }),
      ...(updateData.isPermanentSameAsCurrent !== undefined && {
        isPermanentSameAsCurrent: updateData.isPermanentSameAsCurrent,
      }),
      ...(updateData.education && { education: updateData.education }),
      ...(updateData.experience && { experience: updateData.experience }),
      ...(updateData.totalExperienceYears !== undefined && {
        totalExperienceYears: Number(updateData.totalExperienceYears),
      }),
      ...(updateData.currentCompany !== undefined && { currentCompany: updateData.currentCompany }),
      ...(updateData.currentDesignation !== undefined && {
        currentDesignation: updateData.currentDesignation,
      }),
      ...(updateData.currentCtc !== undefined && { currentCtc: updateData.currentCtc }),
      ...(updateData.expectedCtc !== undefined && { expectedCtc: updateData.expectedCtc }),
      ...(updateData.noticePeriod !== undefined && { noticePeriod: updateData.noticePeriod }),
      ...(updateData.skills && { skills: updateData.skills }),
      ...(updateData.roleApplied && { roleApplied: updateData.roleApplied }),
      ...(updateData.department && { department: updateData.department }),
      ...(updateData.interviewDate && { interviewDate: updateData.interviewDate }),
      ...(updateData.interviewTime !== undefined && { interviewTime: updateData.interviewTime }),
      ...(updateData.interviewMode && { interviewMode: updateData.interviewMode }),
      ...(updateData.interviewStatus && { interviewStatus: updateData.interviewStatus }),
      ...(updateData.remarks !== undefined && { remarks: updateData.remarks }),
      ...(updateData.whatsappOptIn !== undefined && { whatsappOptIn: !!updateData.whatsappOptIn }),
      resumeDocumentId,
      resumeFileName,
      resumeFileSize,
      updatedAt: new Date(),
    };

    await candidatesCol.updateOne({ _id: existing._id }, { $set: updatedFields });

    const auditLogs = await getAuditLogsCollection();
    await auditLogs.insertOne({
      entityType: 'candidate',
      entityId: existing.interviewId,
      action: 'update',
      details: { changedFields: Object.keys(updatedFields) },
      timestamp: new Date(),
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      data: { ...existing, ...updatedFields },
      message: 'Candidate updated successfully',
    } as ApiResponse);
  } catch (error: any) {
    console.error('[InterviewMaster] Update candidate error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error.message || 'Failed to update candidate record',
      },
    } as ApiResponse);
  }
}

/**
 * GET /api/v1/documents/:id/download or /view
 */
export async function downloadDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isViewInline = req.query.view === 'true' || req.path.includes('/view');

    const { stream, file } = await getResumeStream(id);

    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    const disposition = isViewInline ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${file.filename || 'resume.pdf'}"`);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    stream.pipe(res);
  } catch (error: any) {
    console.error('[InterviewMaster] Document stream error:', error);
    return res.status(404).json({
      success: false,
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: error.message || 'Document not found in GridFS',
      },
    } as ApiResponse);
  }
}

import { DEFAULT_DROPDOWNS } from '../../services/seed.service';

/**
 * GET /api/v1/dropdowns
 */
export async function getDropdowns(req: Request, res: Response) {
  try {
    const dropdownsCol = await getDropdownsCollection();
    const allDropdowns = await dropdownsCol.find({}).toArray();

    if (allDropdowns && allDropdowns.length > 0) {
      const result: Record<string, string[]> = {};
      for (const item of allDropdowns) {
        result[item.category] = item.values;
      }

      return res.json({
        success: true,
        data: result,
        message: 'Dropdown options retrieved successfully',
      } as ApiResponse);
    }
  } catch (error: any) {
    console.warn('[InterviewMaster] MongoDB dropdown fetch failed, using defaults:', error.message);
  }

  // Graceful fallback to static defaults
  const fallbackResult: Record<string, string[]> = {};
  for (const item of DEFAULT_DROPDOWNS) {
    fallbackResult[item.category] = item.values;
  }
  return res.json({
    success: true,
    data: fallbackResult,
    message: 'Dropdown options retrieved from defaults',
  } as ApiResponse);
}

/**
 * GET /api/v1/candidates/:id/resume
 */
export async function getCandidateResume(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const candidatesCol = await getCandidatesCollection();

    let candidate: CandidateDocument | null = null;
    if (ObjectId.isValid(id)) {
      candidate = await candidatesCol.findOne({ _id: new ObjectId(id) });
    }
    if (!candidate) {
      candidate = await candidatesCol.findOne({ interviewId: id });
    }

    if (!candidate || !candidate.resumeDocumentId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESUME_NOT_FOUND',
          message: `Resume not found for candidate '${id}'`,
        },
      } as ApiResponse);
    }

    const { stream, file } = await getResumeStream(candidate.resumeDocumentId);
    const isViewInline = req.query.view === 'true' || req.query.inline === 'true';

    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    const disposition = isViewInline ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${file.filename || candidate.resumeFileName || 'resume.pdf'}"`);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    stream.pipe(res);
  } catch (error: any) {
    console.error('[InterviewMaster] Candidate resume stream error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RESUME_STREAM_ERROR',
        message: error.message || 'Failed to stream candidate resume',
      },
    } as ApiResponse);
  }
}

/**
 * POST /api/v1/candidates/:id/convert-to-employee
 */
export async function convertToEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const candidatesCol = await getCandidatesCollection();
    const employeesCol = await getEmployeesCollection();
    const countersCol = await getCountersCollection();

    let candidate: CandidateDocument | null = null;
    if (ObjectId.isValid(id)) {
      candidate = await candidatesCol.findOne({ _id: new ObjectId(id) });
    }
    if (!candidate) {
      candidate = await candidatesCol.findOne({ interviewId: id });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: `Candidate with ID '${id}' not found`,
        },
      } as ApiResponse);
    }

    // Check if already converted
    const existingEmp = await employeesCol.findOne({ candidateId: candidate.interviewId });
    if (existingEmp) {
      return res.json({
        success: true,
        data: existingEmp,
        message: `Candidate was already converted to Employee: ${existingEmp.employeeId}`,
      } as ApiResponse<EmployeeDocument>);
    }

    // Generate atomic Employee ID (EMP-YYYY-0001)
    const currentYear = new Date().getFullYear();
    const counterId = `employee_id_${currentYear}`;
    const counterResult = await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const seq = counterResult?.seq ?? 1;
    const employeeId = `EMP-${currentYear}-${String(seq).padStart(4, '0')}`;

    const now = new Date();
    const employee: EmployeeDocument = {
      employeeId,
      candidateId: candidate.interviewId,
      name: candidate.name,
      phones: candidate.phones,
      emails: candidate.emails,
      dob: candidate.dob,
      age: candidate.age,
      address: candidate.currentAddress,
      department: candidate.department,
      designation: candidate.roleApplied,
      joiningDate: req.body.joiningDate || candidate.interviewDate || getTodayKolkata(),
      salary: req.body.salary || candidate.expectedCtc || candidate.currentCtc || '',
      status: 'active',
      documents: candidate.resumeDocumentId ? [
        {
          documentId: candidate.resumeDocumentId,
          name: candidate.resumeFileName || 'Resume.pdf',
          type: 'resume',
        }
      ] : [],
      remarks: req.body.remarks || `Converted from candidate ${candidate.interviewId}`,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await employeesCol.insertOne(employee);
    employee._id = insertResult.insertedId;

    // Update candidate status to Joined
    await candidatesCol.updateOne(
      { _id: candidate._id },
      { $set: { interviewStatus: 'Joined', updatedAt: now } }
    );

    // Audit log
    const auditLogs = await getAuditLogsCollection();
    await auditLogs.insertOne({
      entityType: 'employee',
      entityId: employeeId,
      action: 'create',
      details: { convertedFrom: candidate.interviewId, name: employee.name },
      timestamp: now,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: employee,
      message: `Candidate successfully converted to Employee: ${employeeId}`,
    } as ApiResponse<EmployeeDocument>);
  } catch (error: any) {
    console.error('[InterviewMaster] Convert to employee error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EMPLOYEE_CONVERSION_FAILED',
        message: error.message || 'Failed to convert candidate to employee',
      },
    } as ApiResponse);
  }
}

/**
 * GET /api/v1/settings
 */
export async function getSettings(req: Request, res: Response) {
  try {
    const settingsCol = await getSettingsCollection();
    const settings = await settingsCol.find({}).toArray();

    const formatted: Record<string, any> = {
      appName: 'MILESTONE DATABASE',
      activeModule: 'interview-master',
      database: 'MongoDB Atlas Cluster0',
      storage: 'MongoDB GridFS',
      geminiModel: 'gemini-2.5-flash',
      version: '1.0.0',
    };

    for (const s of settings) {
      formatted[s.key] = s.value;
    }

    return res.json({
      success: true,
      data: formatted,
      message: 'Platform settings retrieved successfully',
    } as ApiResponse);
  } catch (error: any) {
    console.error('[Platform] Settings error:', error);
    return res.json({
      success: true,
      data: {
        appName: 'MILESTONE DATABASE',
        activeModule: 'interview-master',
        database: 'MongoDB Atlas Cluster0',
        storage: 'MongoDB GridFS',
        version: '1.0.0',
      },
      message: 'Default settings returned',
    } as ApiResponse);
  }
}

