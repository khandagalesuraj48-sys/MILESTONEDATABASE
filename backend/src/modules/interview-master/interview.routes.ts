import { Router } from 'express';
import multer from 'multer';
import {
  getDashboard,
  getCandidates,
  getCandidateById,
  getCandidateResume,
  convertToEmployee,
  extractResume,
  submitInterview,
  updateCandidate,
  downloadDocument,
  getDropdowns,
  getSettings,
} from './interview.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported for resume upload.'));
    }
  },
});

const router = Router();

// Dashboard & Candidates
router.get('/dashboard', getDashboard);
router.get('/candidates', getCandidates);
router.post('/candidates', upload.single('resume'), submitInterview);
router.get('/candidates/:id', getCandidateById);
router.put('/candidates/:id', upload.single('resume'), updateCandidate);

// Resume streaming for candidate
router.get('/candidates/:id/resume', getCandidateResume);

// Candidate to Employee conversion
router.post('/candidates/:id/convert-to-employee', convertToEmployee);

// Resume Extraction via Gemini (both aliases supported)
router.post('/extract-resume', upload.single('resume'), extractResume);
router.post('/resume/extract', upload.single('resume'), extractResume);

// Submit Candidate with PDF & Atomic Interview ID
router.post('/submit', upload.single('resume'), submitInterview);

// GridFS Document download & view
router.get('/documents/:id/download', downloadDocument);
router.get('/documents/:id/view', downloadDocument);

// Dropdown options
router.get('/dropdowns', getDropdowns);

// Platform & Module settings
router.get('/settings', getSettings);

export default router;

