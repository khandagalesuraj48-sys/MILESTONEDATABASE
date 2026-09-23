import { GoogleGenAI } from '@google/genai';

export interface ExtractedResumeData {
  name: string;
  phones: Array<{ number: string; type: 'primary' | 'secondary' | 'other'; isPrimary: boolean }>;
  emails: Array<{ address: string; type: 'primary' | 'secondary' | 'other'; isPrimary: boolean }>;
  dob?: string;
  age?: number;
  gender?: string;
  currentAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  permanentAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  isPermanentSameAsCurrent: boolean;
  education: Array<{
    qualification: string;
    course: string;
    specialization: string;
    passingYear: string;
    institute?: string;
    percentageOrCgpa?: string;
  }>;
  experience: Array<{
    company: string;
    designation: string;
    fromYear: string;
    toYear: string;
    roleSummary: string;
    isCurrent?: boolean;
  }>;
  totalExperienceYears: number;
  currentCompany?: string;
  currentDesignation?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  joiningAvailability?: string;
  skills: string[];
  technicalKnowledge?: string;
  roleApplied?: string;
  department?: string;
  recommendation?: string;
  status?: string;
  joiningDate?: string;
  remarks?: string;
  summary?: string;
}

export async function extractResumeWithGemini(
  pdfBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<ExtractedResumeData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
  }

  // Pre-validate PDF magic bytes (%PDF-)
  if (pdfBuffer.length < 4 || pdfBuffer.toString('utf-8', 0, 4) !== '%PDF') {
    console.warn('[Gemini] File buffer does not begin with %PDF magic header.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert AI Resume Parsing Engine for the "MILESTONE DATABASE" enterprise platform.
Extract factual information strictly from the attached resume PDF document.

CRITICAL RULES:
1. Do NOT guess or hallucinate any information. If a field is not explicitly present in the resume, return empty string "" or empty array [].
2. Identify all contact phone numbers. Keep multiple phone numbers separate in the "phones" array. Mark the first/primary one with isPrimary: true.
3. Identify all email addresses. Keep multiple emails separate in the "emails" array. Mark the first one with isPrimary: true.
4. Extract Date of Birth (DOB) in YYYY-MM-DD format if explicitly stated, otherwise empty string.
5. Extract Gender if explicitly stated.
6. Extract current address and permanent address if available (street, city, state, pincode, country).
7. Parse education history chronologically (qualification, course, specialization, passingYear, institute, percentageOrCgpa).
8. Parse work experience history chronologically (company, designation, fromYear, toYear, roleSummary, isCurrent).
9. Calculate total professional experience in years as a float/number (e.g. 3.5). If 0 or fresh graduate, return 0.
10. Extract technical and professional skills as a list of strings.
11. Extract technical knowledge / expertise summary if present.
12. Extract current company, current designation, previous companies, current salary/CTC, expected salary/CTC, and notice period if stated.
13. Suggest the most suitable position/role and department based on the resume.

RETURN ONLY VALID JSON matching this structure:
{
  "name": "Candidate Full Name",
  "phones": [
    { "number": "+91XXXXXXXXXX", "type": "primary", "isPrimary": true }
  ],
  "emails": [
    { "address": "candidate@example.com", "type": "primary", "isPrimary": true }
  ],
  "dob": "YYYY-MM-DD or empty",
  "gender": "Male / Female / Other or empty",
  "currentAddress": {
    "street": "",
    "city": "",
    "state": "",
    "pincode": "",
    "country": ""
  },
  "permanentAddress": {
    "street": "",
    "city": "",
    "state": "",
    "pincode": "",
    "country": ""
  },
  "education": [
    {
      "qualification": "B.Tech / BCA / MBA / etc.",
      "course": "Computer Science / Finance / etc.",
      "specialization": "",
      "passingYear": "2022",
      "institute": "University name",
      "percentageOrCgpa": ""
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "designation": "Job Title",
      "fromYear": "2022",
      "toYear": "2024",
      "roleSummary": "Key responsibilities",
      "isCurrent": true
    }
  ],
  "totalExperienceYears": 2.5,
  "currentCompany": "Company Name",
  "currentDesignation": "Job Title",
  "currentCtc": "",
  "expectedCtc": "",
  "noticePeriod": "",
  "joiningAvailability": "",
  "skills": ["Skill 1", "Skill 2"],
  "technicalKnowledge": "",
  "roleApplied": "Suggested Role based on resume",
  "department": "Engineering / HR / Operations / etc.",
  "recommendation": "",
  "status": "Scheduled",
  "joiningDate": "",
  "remarks": "",
  "summary": "Brief 2-line summary"
}
`;

  const base64Data = pdfBuffer.toString('base64');

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
  } catch (primaryModelErr: any) {
    console.warn('[Gemini] gemini-2.5-flash failed, attempting fallback to gemini-2.0-flash:', primaryModelErr.message);
    response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
  }

  const rawText = (response.text || '').trim();
  if (!rawText) {
    throw new Error('Gemini API returned an empty response for resume extraction.');
  }

  // Clean JSON response (strip markdown fences if present)
  let cleanJson = rawText;
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (parseError: any) {
    console.warn('[Gemini] Direct JSON parse failed, attempting substring extraction:', parseError.message);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = {};
      }
    } else {
      parsed = {};
    }
  }

  // Calculate age if DOB is valid
  let age: number | undefined;
  if (parsed.dob && parsed.dob.length === 10) {
    const birthDate = new Date(parsed.dob);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
  }

  const result: ExtractedResumeData = {
    name: parsed.name || '',
    phones: Array.isArray(parsed.phones) && parsed.phones.length > 0
      ? parsed.phones
      : (parsed.phone || parsed.mobile ? [{ number: parsed.phone || parsed.mobile, type: 'primary', isPrimary: true }] : [{ number: '', type: 'primary', isPrimary: true }]),
    emails: Array.isArray(parsed.emails) && parsed.emails.length > 0
      ? parsed.emails
      : (parsed.email ? [{ address: parsed.email, type: 'primary', isPrimary: true }] : [{ address: '', type: 'primary', isPrimary: true }]),
    dob: parsed.dob || '',
    age,
    gender: parsed.gender || '',
    currentAddress: parsed.currentAddress || { street: '', city: '', state: '', pincode: '', country: '' },
    permanentAddress: parsed.permanentAddress || { street: '', city: '', state: '', pincode: '', country: '' },
    isPermanentSameAsCurrent: false,
    education: Array.isArray(parsed.education) ? parsed.education : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    totalExperienceYears: Number(parsed.totalExperienceYears) || 0,
    currentCompany: parsed.currentCompany || '',
    currentDesignation: parsed.currentDesignation || '',
    currentCtc: parsed.currentCtc || '',
    expectedCtc: parsed.expectedCtc || '',
    noticePeriod: parsed.noticePeriod || '',
    joiningAvailability: parsed.joiningAvailability || '',
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    technicalKnowledge: parsed.technicalKnowledge || '',
    roleApplied: parsed.roleApplied || '',
    department: parsed.department || '',
    recommendation: parsed.recommendation || '',
    status: parsed.status || 'Scheduled',
    joiningDate: parsed.joiningDate || '',
    remarks: parsed.remarks || '',
    summary: parsed.summary || '',
  };

  return result;
}
