/**
 * MILESTONE DATABASE — Frontend Application Logic
 */

const API_BASE = '/api/v1';

/**
 * Safe fetch helper that guarantees a structured JSON result,
 * preventing 'Unexpected token <' errors when server returns HTML/redirects.
 */
async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: {
          code: 'SERVER_UNAVAILABLE',
          message: 'Server is temporarily unavailable. Please try again.',
        },
      };
    }
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Server is temporarily unavailable. Please try again.',
      },
    };
  }
}

let platformModules = [];
let dropdownsData = {};
let selectedResumeFile = null;
let currentCandidatePage = 1;
let candidateSearchTimeout = null;
let activeCandidateDetail = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initHealthCheck();
  loadModuleRegistry();
  loadDropdowns();
  initDashboardMetrics();
  initDragAndDrop();

  // Set default interview date to today (Asia/Kolkata)
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('interviewDate');
  if (dateInput) dateInput.value = today;
});

// ==================== NAVIGATION & VIEWS ====================
function navigateTo(viewId) {
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active');

  const navSubtitle = document.getElementById('navSubtitle');
  if (viewId === 'home') {
    if (navSubtitle) navSubtitle.textContent = 'Enterprise Platform';
    initDashboardMetrics(); // refresh home KPI cards
  } else if (viewId === 'interview-master') {
    if (navSubtitle) navSubtitle.textContent = 'INTERVIEW MASTER';
    switchInterviewTab('dashboard');
  }
  closeModuleDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModule(moduleId) {
  if (moduleId === 'interview-master') {
    navigateTo('interview-master');
  } else {
    showToast('This module is scheduled for Phase 2 implementation.', 'warning');
  }
}

function switchInterviewTab(tabName) {
  document.querySelectorAll('.module-tab').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

  const tabBtn = document.getElementById(`tab-btn-${tabName}`);
  const tabContent = document.getElementById(`tab-interview-${tabName}`);

  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');

  if (tabName === 'dashboard') {
    loadInterviewDashboard();
  } else if (tabName === 'candidates') {
    loadCandidatesList();
  }
}

// ==================== MODULE DRAWER ====================
function toggleModuleDrawer() {
  const drawer = document.getElementById('moduleDrawer');
  const overlay = document.getElementById('drawerOverlay');
  drawer.classList.toggle('active');
  overlay.classList.toggle('active');
}

function closeModuleDrawer() {
  const drawer = document.getElementById('moduleDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) drawer.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

async function loadModuleRegistry() {
  try {
    const json = await safeFetchJson(`${API_BASE}/modules`);
    if (json.success && Array.isArray(json.data)) {
      platformModules = json.data.filter((m) => m.status === 'active');
      renderDrawerModules(platformModules);
    }
  } catch (err) {
    console.warn('[Platform] Failed to load modules:', err);
  }
}

function renderDrawerModules(modules) {
  const list = document.getElementById('drawerModuleList');
  if (!list) return;

  const activeModules = modules.filter((m) => m.status === 'active' || m.id === 'interview-master');
  list.innerHTML = activeModules
    .map((mod) => {
      return `
      <div class="drawer-module-item active-module" onclick="openModule('${mod.id}')">
        <div class="drawer-mod-icon">
          ${getModuleIconSvg(mod.icon)}
        </div>
        <div class="drawer-mod-info">
          <div class="drawer-mod-name">
            <span>${mod.name}</span>
            <span class="badge badge-success">Active</span>
          </div>
          <div class="drawer-mod-desc">${mod.description}</div>
        </div>
      </div>
    `;
    })
    .join('');
}

function getModuleIconSvg(iconName) {
  const icons = {
    'user-check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
    users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    'file-text': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'dollar-sign': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    folder: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    'bar-chart-2': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  };
  return icons[iconName] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
}

// ==================== HEALTH CHECK ====================
async function initHealthCheck() {
  const pill = document.getElementById('connectionPill');
  try {
    const json = await safeFetchJson(`${API_BASE}/health`);
    if (json.success && json.data && json.data.database === 'connected') {
      pill.className = 'status-pill status-connected';
      pill.querySelector('.status-text').textContent = 'Cluster0 Connected';
    } else {
      pill.className = 'status-pill status-connecting';
      pill.querySelector('.status-text').textContent = 'Cluster0 Degraded';
    }
  } catch (err) {
    pill.className = 'status-pill status-error';
    pill.querySelector('.status-text').textContent = 'Cluster0 Offline';
  }
}

// ==================== DROPDOWNS ====================
async function loadDropdowns() {
  try {
    const json = await safeFetchJson(`${API_BASE}/dropdowns`);
    if (json.success && json.data) {
      dropdownsData = json.data;
      populateSelectOptions('roleAppliedSelect', dropdownsData.roles || []);
      populateSelectOptions('departmentSelect', dropdownsData.departments || []);
      populateSelectOptions('interviewModeSelect', dropdownsData.interview_modes || []);
      populateSelectOptions('interviewStatusSelect', dropdownsData.statuses || []);

      // Filter dropdowns
      populateSelectOptions('filterRoleSelect', dropdownsData.roles || [], true, 'All Roles');
      populateSelectOptions('filterStatusSelect', dropdownsData.statuses || [], true, 'All Statuses');
    }
  } catch (err) {
    console.warn('[Dropdowns] Could not load dropdowns:', err);
  }
}

function populateSelectOptions(selectId, options, keepFirst = false, firstText = '') {
  const select = document.getElementById(selectId);
  if (!select) return;

  let html = keepFirst ? `<option value="All">${firstText}</option>` : '';
  for (const opt of options) {
    html += `<option value="${opt}">${opt}</option>`;
  }
  select.innerHTML = html;
}

// ==================== DASHBOARD METRICS ====================
async function initDashboardMetrics() {
  try {
    const json = await safeFetchJson(`${API_BASE}/interviews/dashboard`);
    if (json.success && json.data) {
      const stats = json.data;
      const homeTotal = document.getElementById('homeTotalCandidates');
      const homeToday = document.getElementById('homeTodayInterviews');
      const homeGridFS = document.getElementById('homeGridFSFiles');

      if (homeTotal) homeTotal.textContent = stats.totalCandidates || 0;
      if (homeToday) homeToday.textContent = stats.todayInterviews || 0;
      if (homeGridFS) homeGridFS.textContent = stats.totalCandidates || 0;
    }
  } catch (e) {
    // Ignore error on first load
  }
}

async function loadInterviewDashboard() {
  try {
    const json = await safeFetchJson(`${API_BASE}/interviews/dashboard`);
    if (json.success && json.data) {
      const stats = json.data;
      document.getElementById('statTotalCandidates').textContent = stats.totalCandidates || 0;
      document.getElementById('statTodayInterviews').textContent = stats.todayInterviews || 0;
      document.getElementById('statSelected').textContent = stats.byStatus?.['Selected'] || 0;
      document.getElementById('statRejected').textContent = stats.byStatus?.['Rejected'] || 0;

      const candidatesBadge = document.getElementById('candidatesTabBadge');
      if (candidatesBadge) candidatesBadge.textContent = stats.totalCandidates || 0;

      renderStatusDistribution(stats.byStatus || {});
      renderRoleDistribution(stats.byRole || {});
      renderRecentCandidatesTable(stats.recentCandidates || []);
    } else {
      showToast(json.error?.message || 'Failed to load dashboard statistics', 'warning');
    }
  } catch (err) {
    showToast('Failed to load dashboard statistics', 'error');
  }
}

function renderStatusDistribution(byStatus) {
  const container = document.getElementById('statusDistributionList');
  if (!container) return;

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
  const entries = Object.entries(byStatus);

  if (entries.length === 0) {
    container.innerHTML = '<div class="text-muted py-3">No status data recorded yet.</div>';
    return;
  }

  container.innerHTML = entries
    .map(([status, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
      <div style="margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:600; margin-bottom:4px;">
          <span>${status}</span>
          <span>${count} (${pct}%)</span>
        </div>
        <div style="height:6px; background:var(--gray-100); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:var(--primary); border-radius:3px;"></div>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderRoleDistribution(byRole) {
  const container = document.getElementById('roleDistributionList');
  if (!container) return;

  const entries = Object.entries(byRole);
  if (entries.length === 0) {
    container.innerHTML = '<div class="text-muted py-3">No roles recorded yet.</div>';
    return;
  }

  container.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:8px;">
      ${entries
        .map(
          ([role, count]) => `
        <span class="badge badge-neutral" style="padding: 6px 12px; font-size: 0.8rem;">
          ${role}: <strong style="margin-left: 4px; color: var(--primary);">${count}</strong>
        </span>
      `
        )
        .join('')}
    </div>
  `;
}

function renderRecentCandidatesTable(candidates) {
  const tbody = document.getElementById('recentCandidatesTableBody');
  if (!tbody) return;

  if (candidates.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No recent candidates found.</td></tr>';
    return;
  }

  tbody.innerHTML = candidates
    .map((c) => {
      const primaryPhone = c.phones && c.phones.length > 0 ? c.phones[0].number : '-';
      return `
      <tr>
        <td><strong class="cand-id">${c.interviewId}</strong></td>
        <td><strong>${c.name}</strong></td>
        <td>${c.roleApplied}</td>
        <td>${primaryPhone}</td>
        <td>${c.interviewDate}</td>
        <td><span class="badge ${getStatusBadgeClass(c.interviewStatus)}">${c.interviewStatus}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openCandidateDetail('${c.interviewId}')">View</button>
        </td>
      </tr>
    `;
    })
    .join('');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Selected':
      return 'badge-success';
    case 'Rejected':
      return 'badge-danger';
    case 'Scheduled':
      return 'badge-primary';
    case 'Interviewed':
    case 'On Hold':
      return 'badge-warning';
    default:
      return 'badge-neutral';
  }
}

// ==================== CANDIDATE RESUME EXTRACTION & FORM ====================
function initDragAndDrop() {
  const dropZone = document.getElementById('resumeDropZone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary-hover)';
      dropZone.style.backgroundColor = '#e0edff';
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary)';
      dropZone.style.backgroundColor = 'var(--primary-light)';
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleResumeFileSelected(files[0]);
    }
  });
}

async function handleResumeFileSelected(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Please select a valid PDF file.', 'error');
    return;
  }

  selectedResumeFile = file;
  document.getElementById('dropZoneTitle').textContent = `Selected: ${file.name}`;
  document.getElementById('dropZoneSubtitle').textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to extract or submit`;

  // Start Gemini extraction
  await triggerGeminiExtraction(file);
}

async function triggerGeminiExtraction(file) {
  const statusBar = document.getElementById('extractionStatusBar');
  statusBar.style.display = 'flex';

  const formData = new FormData();
  formData.append('resume', file);

  try {
    const json = await safeFetchJson(`${API_BASE}/interviews/extract-resume`, {
      method: 'POST',
      body: formData,
    });

    if (json.success && json.data) {
      applyExtractedDataToForm(json.data);
      showToast('Resume parsed successfully with Gemini AI!', 'success');
    } else {
      showToast(json.error?.message || 'Could not extract resume via AI. You can enter details manually.', 'warning');
    }
  } catch (err) {
    showToast('Gemini extraction timed out. Please enter candidate details manually.', 'warning');
  } finally {
    statusBar.style.display = 'none';
  }
}

function applyExtractedDataToForm(data) {
  if (data.name) document.getElementById('candidateName').value = data.name;

  // Phones
  if (Array.isArray(data.phones) && data.phones.length > 0) {
    const container = document.getElementById('phoneNumbersList');
    container.innerHTML = '';
    data.phones.forEach((p, idx) => {
      container.appendChild(createPhoneRowElement(p.number, p.type, idx === 0));
    });
  }

  // Emails
  if (Array.isArray(data.emails) && data.emails.length > 0) {
    const container = document.getElementById('emailsList');
    container.innerHTML = '';
    data.emails.forEach((em, idx) => {
      container.appendChild(createEmailRowElement(em.address, em.type, idx === 0));
    });
  }

  // DOB & Age
  if (data.dob) {
    document.getElementById('candidateDob').value = data.dob;
    calculateCandidateAge();
  }

  // Addresses
  if (data.currentAddress) {
    document.getElementById('currentStreet').value = data.currentAddress.street || '';
    document.getElementById('currentCity').value = data.currentAddress.city || '';
    document.getElementById('currentState').value = data.currentAddress.state || '';
    document.getElementById('currentPincode').value = data.currentAddress.pincode || '';
  }

  if (data.permanentAddress) {
    document.getElementById('permStreet').value = data.permanentAddress.street || '';
    document.getElementById('permCity').value = data.permanentAddress.city || '';
    document.getElementById('permState').value = data.permanentAddress.state || '';
    document.getElementById('permPincode').value = data.permanentAddress.pincode || '';
  }

  // Education
  if (Array.isArray(data.education) && data.education.length > 0) {
    const eduList = document.getElementById('educationList');
    eduList.innerHTML = '';
    data.education.forEach((edu) => {
      eduList.appendChild(createEducationCardElement(edu));
    });
  }

  // Experience
  if (Array.isArray(data.experience) && data.experience.length > 0) {
    const expList = document.getElementById('experienceList');
    expList.innerHTML = '';
    data.experience.forEach((exp) => {
      expList.appendChild(createExperienceCardElement(exp));
    });
  }

  if (data.totalExperienceYears !== undefined) {
    document.getElementById('totalExpYears').value = data.totalExperienceYears;
  }
  if (data.currentCompany) document.getElementById('currentCompany').value = data.currentCompany;
  if (data.currentDesignation) document.getElementById('currentDesignation').value = data.currentDesignation;
  if (data.currentCtc) document.getElementById('currentCtc').value = data.currentCtc;
  if (data.expectedCtc) document.getElementById('expectedCtc').value = data.expectedCtc;
  if (data.noticePeriod) document.getElementById('noticePeriod').value = data.noticePeriod;

  if (Array.isArray(data.skills) && data.skills.length > 0) {
    document.getElementById('skillsInput').value = data.skills.join(', ');
  }

  if (data.roleApplied) {
    const roleSelect = document.getElementById('roleAppliedSelect');
    selectMatchingOption(roleSelect, data.roleApplied);
  }

  if (data.department) {
    const deptSelect = document.getElementById('departmentSelect');
    selectMatchingOption(deptSelect, data.department);
  }

  if (data.summary) {
    document.getElementById('remarksText').value = data.summary;
  }
}

function selectMatchingOption(selectElement, targetValue) {
  if (!selectElement) return;
  for (let i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].value.toLowerCase() === targetValue.toLowerCase()) {
      selectElement.selectedIndex = i;
      return;
    }
  }
}

// ==================== DYNAMIC FORM ROWS ====================
function addPhoneRow() {
  const container = document.getElementById('phoneNumbersList');
  container.appendChild(createPhoneRowElement('', 'secondary', false));
}

function createPhoneRowElement(number = '', type = 'primary', isFirst = false) {
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.innerHTML = `
    <input type="tel" class="phone-input" placeholder="+91 9876543210" value="${number}" required>
    <select class="phone-type-select">
      <option value="primary" ${type === 'primary' ? 'selected' : ''}>Primary</option>
      <option value="secondary" ${type === 'secondary' ? 'selected' : ''}>Secondary</option>
      <option value="other" ${type === 'other' ? 'selected' : ''}>Other / Work</option>
    </select>
    <button type="button" class="btn-remove-row" onclick="removeDynamicRow(this)" title="Remove">&times;</button>
  `;
  return div;
}

function addEmailRow() {
  const container = document.getElementById('emailsList');
  container.appendChild(createEmailRowElement('', 'secondary', false));
}

function createEmailRowElement(email = '', type = 'primary', isFirst = false) {
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.innerHTML = `
    <input type="email" class="email-input" placeholder="candidate@example.com" value="${email}">
    <select class="email-type-select">
      <option value="primary" ${type === 'primary' ? 'selected' : ''}>Primary</option>
      <option value="secondary" ${type === 'secondary' ? 'selected' : ''}>Secondary</option>
      <option value="other" ${type === 'other' ? 'selected' : ''}>Other</option>
    </select>
    <button type="button" class="btn-remove-row" onclick="removeDynamicRow(this)" title="Remove">&times;</button>
  `;
  return div;
}

function removeDynamicRow(btn) {
  const row = btn.closest('.dynamic-row') || btn.closest('.dynamic-card-item');
  if (row) row.remove();
}

function calculateCandidateAge() {
  const dobVal = document.getElementById('candidateDob').value;
  if (!dobVal) return;

  const birthDate = new Date(dobVal);
  if (isNaN(birthDate.getTime())) return;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  document.getElementById('candidateAge').value = age >= 0 ? age : '';
}

function togglePermanentAddress(isSame) {
  const container = document.getElementById('permanentAddressContainer');
  if (container) {
    container.style.display = isSame ? 'none' : 'grid';
  }
}

function addEducationRow() {
  const container = document.getElementById('educationList');
  container.appendChild(createEducationCardElement());
}

function createEducationCardElement(edu = {}) {
  const div = document.createElement('div');
  div.className = 'dynamic-card-item';
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <strong>Qualification Entry</strong>
      <button type="button" class="btn-remove-row" style="width:28px; height:28px;" onclick="removeDynamicRow(this)">&times;</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Degree / Qualification</label>
        <input type="text" class="edu-qual" placeholder="e.g. B.Tech / MBA" value="${edu.qualification || ''}">
      </div>
      <div class="form-group">
        <label>Course / Stream</label>
        <input type="text" class="edu-course" placeholder="e.g. Computer Science" value="${edu.course || ''}">
      </div>
      <div class="form-group">
        <label>University / Institute</label>
        <input type="text" class="edu-inst" placeholder="e.g. Mumbai University" value="${edu.institute || ''}">
      </div>
      <div class="form-group">
        <label>Passing Year</label>
        <input type="text" class="edu-year" placeholder="e.g. 2022" value="${edu.passingYear || ''}">
      </div>
    </div>
  `;
  return div;
}

function addExperienceRow() {
  const container = document.getElementById('experienceList');
  container.appendChild(createExperienceCardElement());
}

function createExperienceCardElement(exp = {}) {
  const div = document.createElement('div');
  div.className = 'dynamic-card-item';
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <strong>Experience Entry</strong>
      <button type="button" class="btn-remove-row" style="width:28px; height:28px;" onclick="removeDynamicRow(this)">&times;</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Company Name</label>
        <input type="text" class="exp-company" placeholder="e.g. Tata Consultancy Services" value="${exp.company || ''}">
      </div>
      <div class="form-group">
        <label>Designation</label>
        <input type="text" class="exp-designation" placeholder="e.g. Senior Developer" value="${exp.designation || ''}">
      </div>
      <div class="form-group">
        <label>From Year</label>
        <input type="text" class="exp-from" placeholder="e.g. 2021" value="${exp.fromYear || ''}">
      </div>
      <div class="form-group">
        <label>To Year</label>
        <input type="text" class="exp-to" placeholder="e.g. 2024 or Present" value="${exp.toYear || ''}">
      </div>
      <div class="form-group full-width">
        <label>Role Summary</label>
        <input type="text" class="exp-summary" placeholder="e.g. Developed cloud microservices" value="${exp.roleSummary || ''}">
      </div>
    </div>
  `;
  return div;
}

// ==================== CANDIDATE SUBMISSION ====================
async function handleCandidateFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitBtnText');
  const spinner = document.getElementById('submitSpinner');

  submitBtn.disabled = true;
  submitText.textContent = 'Saving to MongoDB & GridFS...';
  spinner.style.display = 'inline-block';

  try {
    // Gather phone numbers
    const phones = [];
    document.querySelectorAll('#phoneNumbersList .dynamic-row').forEach((row) => {
      const num = row.querySelector('.phone-input')?.value.trim();
      const type = row.querySelector('.phone-type-select')?.value || 'primary';
      if (num) {
        phones.push({ number: num, type, isPrimary: phones.length === 0 });
      }
    });

    // Gather emails
    const emails = [];
    document.querySelectorAll('#emailsList .dynamic-row').forEach((row) => {
      const addr = row.querySelector('.email-input')?.value.trim();
      const type = row.querySelector('.email-type-select')?.value || 'primary';
      if (addr) {
        emails.push({ address: addr, type, isPrimary: emails.length === 0 });
      }
    });

    // Gather education
    const education = [];
    document.querySelectorAll('#educationList .dynamic-card-item').forEach((item) => {
      const qual = item.querySelector('.edu-qual')?.value.trim();
      if (qual) {
        education.push({
          qualification: qual,
          course: item.querySelector('.edu-course')?.value.trim() || '',
          institute: item.querySelector('.edu-inst')?.value.trim() || '',
          passingYear: item.querySelector('.edu-year')?.value.trim() || '',
        });
      }
    });

    // Gather experience
    const experience = [];
    document.querySelectorAll('#experienceList .dynamic-card-item').forEach((item) => {
      const comp = item.querySelector('.exp-company')?.value.trim();
      if (comp) {
        experience.push({
          company: comp,
          designation: item.querySelector('.exp-designation')?.value.trim() || '',
          fromYear: item.querySelector('.exp-from')?.value.trim() || '',
          toYear: item.querySelector('.exp-to')?.value.trim() || '',
          roleSummary: item.querySelector('.exp-summary')?.value.trim() || '',
        });
      }
    });

    const isPermSame = document.getElementById('permanentSameAsCurrent').checked;

    const payload = {
      name: document.getElementById('candidateName').value.trim(),
      phones,
      emails,
      dob: document.getElementById('candidateDob').value || '',
      age: parseInt(document.getElementById('candidateAge').value, 10) || undefined,
      currentAddress: {
        street: document.getElementById('currentStreet').value.trim(),
        city: document.getElementById('currentCity').value.trim(),
        state: document.getElementById('currentState').value.trim(),
        pincode: document.getElementById('currentPincode').value.trim(),
      },
      permanentAddress: isPermSame
        ? {
            street: document.getElementById('currentStreet').value.trim(),
            city: document.getElementById('currentCity').value.trim(),
            state: document.getElementById('currentState').value.trim(),
            pincode: document.getElementById('currentPincode').value.trim(),
          }
        : {
            street: document.getElementById('permStreet').value.trim(),
            city: document.getElementById('permCity').value.trim(),
            state: document.getElementById('permState').value.trim(),
            pincode: document.getElementById('permPincode').value.trim(),
          },
      isPermanentSameAsCurrent: isPermSame,
      education,
      experience,
      totalExperienceYears: parseFloat(document.getElementById('totalExpYears').value) || 0,
      currentCompany: document.getElementById('currentCompany').value.trim(),
      currentDesignation: document.getElementById('currentDesignation').value.trim(),
      currentCtc: document.getElementById('currentCtc').value.trim(),
      expectedCtc: document.getElementById('expectedCtc').value.trim(),
      noticePeriod: document.getElementById('noticePeriod').value.trim(),
      skills: document.getElementById('skillsInput').value.split(',').map((s) => s.trim()).filter(Boolean),
      roleApplied: document.getElementById('roleAppliedSelect').value,
      department: document.getElementById('departmentSelect').value,
      interviewDate: document.getElementById('interviewDate').value,
      interviewTime: document.getElementById('interviewTime').value || '',
      interviewMode: document.getElementById('interviewModeSelect').value,
      interviewStatus: document.getElementById('interviewStatusSelect').value,
      remarks: document.getElementById('remarksText').value.trim(),
      whatsappOptIn: document.getElementById('whatsappOptIn').checked,
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (selectedResumeFile) {
      formData.append('resume', selectedResumeFile);
    }

    const json = await safeFetchJson(`${API_BASE}/interviews/submit`, {
      method: 'POST',
      body: formData,
    });

    if (json.success && json.data) {
      const interviewId = json.data.interviewId;
      showToast(`Candidate registered successfully! ID: ${interviewId}`, 'success');
      resetCandidateForm();
      switchInterviewTab('candidates');
    } else {
      showToast(json.error?.message || 'Submission failed. Please check fields.', 'error');
    }
  } catch (err) {
    showToast('Network error while saving candidate.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Submit to MongoDB & Save Resume';
    spinner.style.display = 'none';
  }
}

function resetCandidateForm() {
  document.getElementById('candidateForm').reset();
  selectedResumeFile = null;
  document.getElementById('dropZoneTitle').textContent = 'Select or Drag Resume (PDF)';
  document.getElementById('dropZoneSubtitle').textContent = 'Max size 20MB • Streamed to MongoDB GridFS • AI Extracted';
  document.getElementById('phoneNumbersList').innerHTML = '';
  document.getElementById('phoneNumbersList').appendChild(createPhoneRowElement('', 'primary', true));
  document.getElementById('emailsList').innerHTML = '';
  document.getElementById('emailsList').appendChild(createEmailRowElement('', 'primary', true));
  document.getElementById('educationList').innerHTML = '';
  document.getElementById('experienceList').innerHTML = '';
  document.getElementById('candidateAge').value = '';
}

// ==================== CANDIDATES DIRECTORY ====================
function debounceCandidateSearch() {
  clearTimeout(candidateSearchTimeout);
  candidateSearchTimeout = setTimeout(() => {
    currentCandidatePage = 1;
    loadCandidatesList();
  }, 300);
}

async function loadCandidatesList() {
  const grid = document.getElementById('candidatesGrid');
  const search = document.getElementById('candidateSearchInput').value.trim();
  const status = document.getElementById('filterStatusSelect').value;
  const role = document.getElementById('filterRoleSelect').value;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px;"><div class="extraction-spinner" style="margin: 0 auto 10px;"></div>Loading candidates...</div>';

  try {
    const params = new URLSearchParams({
      page: currentCandidatePage,
      limit: 30,
    });
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);
    if (role && role !== 'All') params.append('role', role);

    const json = await safeFetchJson(`${API_BASE}/candidates?${params.toString()}`);

    if (json.success && json.data) {
      renderCandidatesGrid(json.data.candidates || []);
      renderPagination(json.data.total, json.data.page, json.data.limit, json.data.totalPages);
    } else {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px;">No candidates found.</div>';
    }
  } catch (err) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--danger); padding: 40px;">Error loading candidates.</div>';
  }
}

function renderCandidatesGrid(candidates) {
  const grid = document.getElementById('candidatesGrid');
  if (!grid) return;

  if (candidates.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:var(--gray-500);">No candidates found matching the search criteria.</div>';
    return;
  }

  grid.innerHTML = candidates
    .map((c) => {
      const primaryPhone = c.phones && c.phones.length > 0 ? c.phones[0].number : 'No Phone';
      const email = c.emails && c.emails.length > 0 ? c.emails[0].address : 'No Email';
      const hasResume = !!c.resumeDocumentId;

      return `
      <div class="candidate-card-item">
        <div class="cand-card-top">
          <span class="cand-id">${c.interviewId}</span>
          <span class="badge ${getStatusBadgeClass(c.interviewStatus)}">${c.interviewStatus}</span>
        </div>
        <h4 class="cand-name">${c.name}</h4>
        <div class="cand-role">${c.roleApplied} &bull; ${c.department}</div>

        <div class="cand-meta-list">
          <div class="cand-meta-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>${primaryPhone}</span>
          </div>
          <div class="cand-meta-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>${email}</span>
          </div>
          <div class="cand-meta-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Interview: ${c.interviewDate}</span>
          </div>
        </div>

        <div class="cand-card-actions">
          <button class="btn btn-sm btn-primary" onclick="openCandidateDetail('${c.interviewId}')">View Details</button>
          <button class="btn btn-sm btn-outline" onclick="triggerCallCandidate('${c.interviewId}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>Call</span>
          </button>
          ${
            hasResume
              ? `<button class="btn btn-sm btn-outline" onclick="viewResumeModal('${c.resumeDocumentId}', '${c.name}')">PDF</button>`
              : ''
          }
        </div>
      </div>
    `;
    })
    .join('');
}

function renderPagination(total, page, limit, totalPages) {
  const bar = document.getElementById('paginationBar');
  if (!bar) return;

  if (total <= limit) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  document.getElementById('paginationInfo').textContent = `Page ${page} of ${totalPages} (${total} total)`;
  document.getElementById('prevPageBtn').disabled = page <= 1;
  document.getElementById('nextPageBtn').disabled = page >= totalPages;
}

function changeCandidatePage(delta) {
  currentCandidatePage += delta;
  loadCandidatesList();
}

// ==================== CANDIDATE DETAILS MODAL ====================
async function openCandidateDetail(candidateId) {
  try {
    const json = await safeFetchJson(`${API_BASE}/candidates/${candidateId}`);
    if (!json.success || !json.data) {
      showToast('Could not load candidate details', 'error');
      return;
    }

    const c = json.data;
    activeCandidateDetail = c;

    document.getElementById('modalCandidateId').textContent = c.interviewId;
    document.getElementById('modalCandidateName').textContent = c.name;
    document.getElementById('modalCandidateRole').textContent = `${c.roleApplied} • ${c.department}`;

    const body = document.getElementById('modalCandidateBody');
    body.innerHTML = `
      <div class="detail-grid">
        <div>
          <div class="detail-section-title">Contact Details</div>
          <div class="info-item">
            <span class="info-label">Mobile Numbers</span>
            <div class="info-val">
              ${c.phones.map((p) => `<div>${p.number} (${p.type}${p.isPrimary ? ' - Primary' : ''})</div>`).join('')}
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">Email Addresses</span>
            <div class="info-val">
              ${c.emails.map((e) => `<div>${e.address} (${e.type})</div>`).join('')}
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">Date of Birth &amp; Age</span>
            <div class="info-val">${c.dob || 'Not provided'} ${c.age ? `(${c.age} years old)` : ''}</div>
          </div>
          <div class="info-item">
            <span class="info-label">WhatsApp Opt-in</span>
            <div class="info-val">
              ${c.whatsappOptIn ? '<span class="badge badge-success">Consented (Yes)</span>' : '<span class="badge badge-neutral">Not Opted-in</span>'}
            </div>
          </div>
        </div>

        <div>
          <div class="detail-section-title">Interview Details</div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <div class="info-val"><span class="badge ${getStatusBadgeClass(c.interviewStatus)}">${c.interviewStatus}</span></div>
          </div>
          <div class="info-item">
            <span class="info-label">Date &amp; Time</span>
            <div class="info-val">${c.interviewDate} ${c.interviewTime || ''} (${c.interviewMode})</div>
          </div>
          <div class="info-item">
            <span class="info-label">Current Experience &amp; CTC</span>
            <div class="info-val">${c.totalExperienceYears} years &bull; ${c.currentCompany || 'N/A'} &bull; ${c.currentCtc || 'N/A'}</div>
          </div>
          <div class="info-item">
            <span class="info-label">Notice Period</span>
            <div class="info-val">${c.noticePeriod || 'Immediate'}</div>
          </div>
        </div>
      </div>

      <div class="detail-section-title">Address Information</div>
      <div class="detail-grid">
        <div class="info-item">
          <span class="info-label">Current Address</span>
          <div class="info-val">${c.currentAddress?.street || ''}, ${c.currentAddress?.city || ''}, ${c.currentAddress?.state || ''} ${c.currentAddress?.pincode || ''}</div>
        </div>
        <div class="info-item">
          <span class="info-label">Permanent Address</span>
          <div class="info-val">${c.isPermanentSameAsCurrent ? 'Same as current address' : `${c.permanentAddress?.street || ''}, ${c.permanentAddress?.city || ''}, ${c.permanentAddress?.state || ''} ${c.permanentAddress?.pincode || ''}`}</div>
        </div>
      </div>

      <div class="detail-section-title">Education History</div>
      <div style="margin-bottom:18px;">
        ${
          c.education && c.education.length > 0
            ? c.education.map((edu) => `
            <div style="padding:8px 0; border-bottom:1px solid var(--gray-100); font-size:0.85rem;">
              <strong>${edu.qualification}</strong> - ${edu.course} (${edu.passingYear}) &bull; <span class="text-muted">${edu.institute || ''}</span>
            </div>
          `).join('')
            : '<div class="text-muted" style="font-size:0.85rem;">No education entries recorded.</div>'
        }
      </div>

      <div class="detail-section-title">Work Experience History</div>
      <div style="margin-bottom:18px;">
        ${
          c.experience && c.experience.length > 0
            ? c.experience.map((exp) => `
            <div style="padding:8px 0; border-bottom:1px solid var(--gray-100); font-size:0.85rem;">
              <strong>${exp.company}</strong> - ${exp.designation} (${exp.fromYear} to ${exp.toYear})
              <div class="text-muted" style="font-size:0.8rem;">${exp.roleSummary || ''}</div>
            </div>
          `).join('')
            : '<div class="text-muted" style="font-size:0.85rem;">No experience entries recorded.</div>'
        }
      </div>

      <div class="detail-section-title">Skills &amp; Remarks</div>
      <div class="info-item">
        <span class="info-label">Skills</span>
        <div class="info-val">${c.skills && c.skills.length > 0 ? c.skills.join(', ') : 'None listed'}</div>
      </div>
      <div class="info-item">
        <span class="info-label">Remarks</span>
        <div class="info-val" style="background:var(--gray-50); padding:10px; border-radius:6px;">${c.remarks || 'No remarks added.'}</div>
      </div>
    `;

    // Footer actions
    const footer = document.getElementById('modalCandidateFooter');
    footer.innerHTML = `
      <button class="btn btn-outline" onclick="triggerCallCandidate('${c.interviewId}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        <span>Call</span>
      </button>

      <button class="btn btn-success" onclick="triggerWhatsAppCandidate('${c.interviewId}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span>WhatsApp</span>
      </button>

      ${
        c.resumeDocumentId
          ? `<button class="btn btn-outline" onclick="viewResumeModal('${c.resumeDocumentId}', '${c.name}')">View Resume (GridFS)</button>`
          : ''
      }
      <button class="btn btn-secondary" onclick="closeCandidateDetailModal()">Close</button>
    `;

    document.getElementById('candidateDetailModal').classList.add('active');
  } catch (err) {
    showToast('Failed to display candidate record', 'error');
  }
}

function closeCandidateDetailModal() {
  document.getElementById('candidateDetailModal').classList.remove('active');
  activeCandidateDetail = null;
}

// ==================== CALL & WHATSAPP ACTIONS ====================
async function triggerCallCandidate(candidateId) {
  let c = activeCandidateDetail;
  if (!c || c.interviewId !== candidateId) {
    const json = await safeFetchJson(`${API_BASE}/candidates/${candidateId}`);
    if (json.success) c = json.data;
  }
  if (!c || !c.phones || c.phones.length === 0) {
    showToast('No phone number recorded for this candidate.', 'warning');
    return;
  }

  if (c.phones.length === 1) {
    // Directly call
    window.location.href = `tel:${c.phones[0].number}`;
  } else {
    // Open selector modal
    openCallPickerModal(c.phones, c.name);
  }
}

function openCallPickerModal(phones, name) {
  const modal = document.getElementById('callPickerModal');
  const list = document.getElementById('callPickerList');

  list.innerHTML = phones
    .map(
      (p) => `
    <a href="tel:${p.number}" class="call-option-btn" onclick="closeCallPickerModal()">
      <div>
        <strong style="color:var(--gray-900); font-size:1rem;">${p.number}</strong>
        <div style="font-size:0.75rem; color:var(--gray-500); text-transform:uppercase;">${p.type}${p.isPrimary ? ' (Primary)' : ''}</div>
      </div>
      <span class="btn btn-sm btn-primary">Dial</span>
    </a>
  `
    )
    .join('');

  modal.classList.add('active');
}

function closeCallPickerModal() {
  document.getElementById('callPickerModal').classList.remove('active');
}

async function triggerWhatsAppCandidate(candidateId) {
  let c = activeCandidateDetail;
  if (!c || c.interviewId !== candidateId) {
    const json = await safeFetchJson(`${API_BASE}/candidates/${candidateId}`);
    if (json.success) c = json.data;
  }

  if (!c || !c.phones || c.phones.length === 0) {
    showToast('No phone number available for WhatsApp.', 'warning');
    return;
  }

  if (!c.whatsappOptIn) {
    showToast('Candidate has not consented to WhatsApp communication (whatsappOptIn is false).', 'warning');
    return;
  }

  // Find primary or first number
  const targetPhone = c.phones.find((p) => p.isPrimary) || c.phones[0];
  const cleanNumber = targetPhone.number.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Hello ${c.name},\nThis is from the Milestone Database recruitment team regarding your interview for the ${c.roleApplied} position (Ref: ${c.interviewId}).`
  );

  window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
}

// ==================== RESUME VIEWER MODAL ====================
function viewResumeModal(documentId, candidateName) {
  const modal = document.getElementById('pdfViewerModal');
  const iframe = document.getElementById('pdfIframe');
  const title = document.getElementById('pdfModalTitle');
  const downloadLink = document.getElementById('pdfDownloadLink');

  title.textContent = `Resume — ${candidateName}`;
  const streamUrl = `${API_BASE}/documents/${documentId}/view?view=true`;
  const downloadUrl = `${API_BASE}/documents/${documentId}/download`;

  iframe.src = streamUrl;
  downloadLink.href = downloadUrl;

  modal.classList.add('active');
}

function closePdfViewerModal() {
  const modal = document.getElementById('pdfViewerModal');
  const iframe = document.getElementById('pdfIframe');
  iframe.src = '';
  modal.classList.remove('active');
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

