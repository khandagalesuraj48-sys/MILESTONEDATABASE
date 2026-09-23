import { GoogleGenAI } from '@google/genai';

export interface ExtractedResumeData {
  name: string;
  phones: Array<{ number: string; type: 'primary' | 'secondary' | 'other'; isPrimary: boolean }>;
  emails: Array<{ address: string; type: 'primary' | 'secondary' | 'other'; isPrimary: boolean }>;
  dob?: string;
  age?: number;
  currentAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  permanentAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
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
  skills: string[];
  roleApplied?: string;
  department?: string;
  summary?: string;
}

export async function extractResumeWithGemini(
  pdfBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<ExtractedResumeData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set on the server.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert AI Resume Parsing Engine for the "MILESTONE DATABASE" enterprise platform.
Extract factual information strictly from the attached resume PDF document.

RULES:
1. Do NOT guess or hallucinate any information. If a field is not present in the resume, return empty string "" or empty array [].
2. Identify all contact phone numbers. Mark the first or primary one with isPrimary: true, others isPrimary: false. Clean numbers to digits with standard format.
3. Identify all email addresses. Mark the first with isPrimary: true.
4. Extract Date of Birth (DOB) in YYYY-MM-DD format if explicitly stated.
5. Extract current address and permanent address if available (street, city, state, pincode).
6. Parse education history chronologically.
7. Parse work experience chronologically (company name, designation, start year, end year, brief role summary).
8. Calculate total professional experience in years as a float/number (e.g. 3.5). If 0 or fresh graduate, return 0.
9. Extract technical and professional skills as a list of strings.
10. Identify the most recent or applied position/designation.

RETURN ONLY VALID JSON conforming strictly to this format:
{
  "name": "Candidate Full Name",
  "phones": [
    { "number": "+91XXXXXXXXXX", "type": "primary", "isPrimary": true }
  ],
  "emails": [
    { "address": "candidate@example.com", "type": "primary", "isPrimary": true }
  ],
  "dob": "YYYY-MM-DD or empty",
  "currentAddress": {
    "street": "",
    "city": "",
    "state": "",
    "pincode": ""
  },
  "permanentAddress": {
    "street": "",
    "city": "",
    "state": "",
    "pincode": ""
  },
  "education": [
    {
      "qualification": "B.Tech / MBA / etc.",
      "course": "Computer Science / Finance",
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
  "skills": ["Skill 1", "Skill 2"],
  "roleApplied": "Suggested Role based on resume",
  "department": "Engineering / HR / Sales / etc.",
  "summary": "Brief 2-line summary"
}
`;

  const base64Data = pdfBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
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

  const responseText = response.text || '';
  if (!responseText) {
    throw new Error('Gemini API returned an empty response for resume extraction.');
  }

  try {
    const parsed = JSON.parse(responseText);

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
        : [{ number: '', type: 'primary', isPrimary: true }],
      emails: Array.isArray(parsed.emails) && parsed.emails.length > 0
        ? parsed.emails
        : [{ address: '', type: 'primary', isPrimary: true }],
      dob: parsed.dob || '',
      age,
      currentAddress: parsed.currentAddress || { street: '', city: '', state: '', pincode: '' },
      permanentAddress: parsed.permanentAddress || { street: '', city: '', state: '', pincode: '' },
      isPermanentSameAsCurrent: false,
      education: Array.isArray(parsed.education) ? parsed.education : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      totalExperienceYears: Number(parsed.totalExperienceYears) || 0,
      currentCompany: parsed.currentCompany || '',
      currentDesignation: parsed.currentDesignation || '',
      currentCtc: parsed.currentCtc || '',
      expectedCtc: parsed.expectedCtc || '',
      noticePeriod: parsed.noticePeriod || '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      roleApplied: parsed.roleApplied || '',
      department: parsed.department || '',
      summary: parsed.summary || '',
    };

    return result;
  } catch (parseError: any) {
    console.error('[Gemini] Failed to parse JSON response:', responseText);
    throw new Error(`Failed to parse extracted JSON from Gemini: ${parseError.message}`);
  }
}

