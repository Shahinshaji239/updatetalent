import React, { useState, useEffect } from 'react';
import { Plus, Search, LayoutGrid, List, Filter, Download, Upload } from 'lucide-react';
import Navbar from './Navbar';
import * as XLSX from 'xlsx';
import './CandidatesList.css';
import Select from 'react-select';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

// API endpoints
const API_BASE_URL = 'http://localhost:8000';
const ENDPOINTS = {
  candidates: `${API_BASE_URL}/candidates/`,
  addCandidate: `${API_BASE_URL}/add-candidate/`,
  updateCandidate: (id) => `${API_BASE_URL}/update_candidate/${id}/`,
  deleteCandidate: (id) => `${API_BASE_URL}/candidates/${id}/delete/`,
  searchCandidates: `${API_BASE_URL}/search-candidates/`,
  bulkImport: `${API_BASE_URL}/bulk-import-excel/`,
  exportCandidates: `${API_BASE_URL}/export-candidates-excel/`
};

const CandidatesList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState('table');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [newCandidate, setNewCandidate] = useState({
    name: '', email: '', role: '', location: '', experience: '',
    skills: [], industry: '', gender: '', current_ctc: '', expected_ctc: '',
    resume: null, notes: '',
  });
  const [importPopup, setImportPopup] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importSummary, setImportSummary] = useState({ total: 0, missing: [], valid: 0 });
  const [exportPopup, setExportPopup] = useState(false);
  const [exportFilters, setExportFilters] = useState({ role: '', experience: '', location: '' });
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    experience: '',
    location: ''
  });
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const location = useLocation();

  // Error handling utility
  const handleApiError = (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      alert('Session expired. Please log in again.');
      localStorage.clear();
      window.location.href = '/';
    } else {
      setError(error.response?.data?.error || 'An error occurred');
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    }
  };

  // Validation utility
  const validateCandidate = (candidate) => {
    const errors = [];
    if (!candidate.name) errors.push('Name is required');
    if (!candidate.email) errors.push('Email is required');
    if (!candidate.role) errors.push('Role is required');
    if (!candidate.location) errors.push('Location is required');
    if (!candidate.experience) errors.push('Experience is required');
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (candidate.email && !emailRegex.test(candidate.email)) {
      errors.push('Invalid email format');
    }
    
    return errors;
  };

  const fetchCandidates = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      handleApiError({ response: { status: 401 } });
      return;
    }

    try {
      const res = await axios.get(ENDPOINTS.candidates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(res.data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();

    if (location.state?.triggerImport) {
      document.getElementById('fileInput')?.click();
    }
  }, []);

  const openModal = () => {
    setSelectedCandidate(null);
    setNewCandidate({
      name: '', email: '', role: '', location: '', experience: '',
      skills: [], industry: '', gender: '', current_ctc: '', expected_ctc: '',
      resume: null, notes: '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSkillsChange = (selectedOptions) => {
    const selectedSkills = selectedOptions ? selectedOptions.map(option => option.value) : [];
    if (selectedCandidate) {
      setSelectedCandidate({ ...selectedCandidate, skills: selectedSkills });
    } else {
      setNewCandidate({ ...newCandidate, skills: selectedSkills });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (selectedCandidate) {
      setSelectedCandidate({ ...selectedCandidate, resume: file });
    } else {
      setNewCandidate({ ...newCandidate, resume: file });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (selectedCandidate) {
      setSelectedCandidate({ ...selectedCandidate, [name]: value });
    } else {
      setNewCandidate({ ...newCandidate, [name]: value });
    }
  };

  const skillOptions = [
    { value: 'React', label: 'React' },
    { value: 'Node.js', label: 'Node.js' },
    { value: 'JavaScript', label: 'JavaScript' },
    { value: 'TypeScript', label: 'TypeScript' },
    { value: 'Figma', label: 'Figma' },
    { value: 'Strategy', label: 'Strategy' },
    { value: 'Analytics', label: 'Analytics' },
    { value: 'Agile', label: 'Agile' },
    { value: 'Research', label: 'Research' },
    { value: 'Prototyping', label: 'Prototyping' },
  ];

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${ENDPOINTS.searchCandidates}?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidates(response.data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCandidate = async () => {
    const validationErrors = validateCandidate(newCandidate);
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.keys(newCandidate).forEach(key => {
        if (key === 'skills' && newCandidate[key].length > 0) {
          formData.append(key, newCandidate[key].join(','));
        } else if (key === 'resume' && newCandidate[key] instanceof File) {
          formData.append(key, newCandidate[key]);
        } else if (newCandidate[key]) {
          formData.append(key, newCandidate[key]);
        }
      });

      const token = localStorage.getItem('token');
      await axios.post(ENDPOINTS.addCandidate, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      fetchCandidates();
      closeModal();
      alert('Candidate added successfully!');
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCandidate = async () => {
    if (!selectedCandidate) return;

    const validationErrors = validateCandidate(selectedCandidate);
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.keys(selectedCandidate).forEach(key => {
        if (key === 'skills' && selectedCandidate[key].length > 0) {
          formData.append(key, selectedCandidate[key].join(','));
        } else if (key === 'resume' && selectedCandidate[key] instanceof File) {
          formData.append(key, selectedCandidate[key]);
        } else if (selectedCandidate[key]) {
          formData.append(key, selectedCandidate[key]);
        }
      });

      const token = localStorage.getItem('token');
      const response = await axios.put(
        ENDPOINTS.updateCandidate(selectedCandidate.id),
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        fetchCandidates();
        closeModal();
        alert('Candidate updated successfully!');
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!selectedCandidate) return;

    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.delete(ENDPOINTS.deleteCandidate(selectedCandidate.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCandidates();
      closeModal();
      alert('Candidate deleted successfully!');
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files.length) return;

    // Separate Excel file and resume files
    const excelFile = Array.from(files).find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    
    const resumeFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf'
    );

    if (!excelFile) {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    // File size validation (10MB limit)
    if (excelFile.size > 10 * 1024 * 1024) {
      alert('File size too large. Please upload a file smaller than 10MB.');
      return;
    }

    setSelectedImportFile({ excel: excelFile, resumes: resumeFiles });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        if (!rawData || rawData.length === 0) {
          alert('Excel file is empty or has no valid data.');
          return;
        }

        // Standardize column keys to match backend exactly
        const standardizedData = rawData.map(row => {
          const cleanRow = {};
          Object.entries(row).forEach(([key, val]) => {
            const newKey = key.toLowerCase()
              .replace(/\s+/g, '')
              .replace(/[^a-z0-9]/g, '');
            cleanRow[newKey] = val;
          });
          return cleanRow;
        });

        const requiredFields = ['name', 'email'];
        const missingData = [];
        let validCount = 0;

        standardizedData.forEach((row, index) => {
          const missingFields = requiredFields.filter(field => {
            const value = row[field];
            return !value ||
              String(value).trim() === '' ||
              String(value).toLowerCase() === 'nan' ||
              String(value).toLowerCase() === 'null';
          });

          if (missingFields.length > 0) {
            missingData.push({ 
              row: index + 2, 
              fields: missingFields,
              error: `Missing required fields: ${missingFields.join(', ')}`
            });
          } else {
            validCount++;
          }
        });

        setImportData(standardizedData);
        setImportSummary({
          total: standardizedData.length,
          missing: missingData,
          valid: validCount
        });
        setImportPopup(true);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        alert(`Error parsing Excel file: ${err.message}`);
      }
    };

    reader.onerror = () => {
      alert('Error reading file. Please try again.');
    };

    reader.readAsArrayBuffer(excelFile);
  };

  const handleConfirmImport = async () => {
    if (!selectedImportFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImportFile.excel);
      
      // Append resume files
      if (selectedImportFile.resumes.length > 0) {
        selectedImportFile.resumes.forEach(resume => {
          formData.append('resumes', resume);
        });
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(ENDPOINTS.bulkImport, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { created, updated, skipped, total_rows_processed } = response.data;
      
      // Show detailed import summary
      let summaryMessage = `Import completed:\n`;
      summaryMessage += `- ${created} records created\n`;
      summaryMessage += `- ${updated} records updated\n`;
      
      if (skipped.length > 0) {
        summaryMessage += `\nSkipped records:\n`;
        skipped.forEach(item => {
          summaryMessage += `- Row ${item.row}: ${item.error}\n`;
        });
      }
      
      alert(summaryMessage);
      fetchCandidates();
      setImportPopup(false);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditModal = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${ENDPOINTS.candidates}${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fullData = res.data;
      const normalizedData = {
        ...fullData,
        current_ctc: fullData.current_ctc || '',
        expected_ctc: fullData.expected_ctc || '',
        resume: fullData.resume ? `${API_BASE_URL}${fullData.resume}` : null,
        skills: fullData.skills ? fullData.skills.map(s => typeof s === 'object' ? s.name : s) : [],
      };

      setSelectedCandidate(normalizedData);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch candidate details:', err);
      alert('Failed to load candidate details.');
    }
  };

  const handleExport = () => {
    setExportPopup(true);
  };

  const handleExportConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(exportFilters);
      const response = await axios.get(`${ENDPOINTS.exportCandidates}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'candidates_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportPopup(false);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportFilterChange = (e) => {
    const { name, value } = e.target;
    setExportFilters({ ...exportFilters, [name]: value });
  };

  // Add this function to handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add this function to apply filters
  const applyFilters = (candidatesList) => {
    return candidatesList.filter(candidate => {
      const roleMatch = !filters.role || 
        candidate.role?.toLowerCase().includes(filters.role.toLowerCase());
      
      const locationMatch = !filters.location || 
        candidate.location?.toLowerCase().includes(filters.location.toLowerCase());
      
      const experienceMatch = !filters.experience || 
        candidate.experience?.toString().includes(filters.experience);

      return roleMatch && locationMatch && experienceMatch;
    });
  };

  // Update useEffect to apply filters when candidates or filters change
  useEffect(() => {
    setFilteredCandidates(applyFilters(candidates));
  }, [candidates, filters]);

  // Update the filter button click handler
  const handleFilterClick = () => {
    setShowFilterModal(true);
  };

  // Update the export button click handler
  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // Render filter modal
  const renderFilterModal = () => (
    <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
      <div className="modal modal-export-filters" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Filter Candidates</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Job Role</label>
            <input
              type="text"
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              placeholder="Enter job role"
            />
          </div>
          <div className="form-group">
            <label>Experience</label>
            <input
              type="text"
              name="experience"
              value={filters.experience}
              onChange={handleFilterChange}
              placeholder="Enter experience (e.g., 2)"
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Enter location"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="modal-btn cancel-btn" 
            onClick={() => {
              setFilters({ role: '', experience: '', location: '' });
              setShowFilterModal(false);
            }}
          >
            Clear Filters
          </button>
          <button className="modal-btn save-btn" onClick={() => setShowFilterModal(false)}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );

  // Render export modal
  const renderExportModal = () => (
    <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
      <div className="modal modal-export-filters" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Candidates</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Job Role</label>
            <input
              type="text"
              name="role"
              value={exportFilters.role}
              onChange={handleExportFilterChange}
              placeholder="Enter job role"
            />
          </div>
          <div className="form-group">
            <label>Experience</label>
            <input
              type="text"
              name="experience"
              value={exportFilters.experience}
              onChange={handleExportFilterChange}
              placeholder="Enter experience (e.g., 2 years)"
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={exportFilters.location}
              onChange={handleExportFilterChange}
              placeholder="Enter location"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel-btn" onClick={() => setShowExportModal(false)}>Cancel</button>
          <button className="modal-btn save-btn" onClick={handleExportConfirm}>Export</button>
        </div>
      </div>
    </div>
  );

  // Update the candidates count display
  const renderCandidatesCount = () => (
    <div className="header-left">
      <h1 className="page-title">Candidates</h1>
      <span className="candidates-count">
            {candidates.length} total
      </span>
    </div>
  );

  return (
    <div className="candidates-wrapper">
      <Navbar />
      <div className="candidates-container">
        <div className="candidates-header">
          {renderCandidatesCount()}
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => document.getElementById('fileInput').click()}>
              <Upload size={16} />
              Bulk Import
            </button>
            <input
              type="file"
              id="fileInput"
              style={{ display: 'none' }}
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
            <button className="btn btn-primary" onClick={openModal}>
              <Plus size={16} />
              Add Candidate
            </button>
          </div>
        </div>

        <div className="candidates-controls">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search candidates by name, skills, role..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="controls-right">
            <button className="btn btn-secondary" onClick={handleFilterClick}>
              <Filter size={16} />
              Filters
            </button>
            <button className="btn btn-secondary" onClick={handleExportClick}>
              <Download size={16} />
              Export
            </button>

            <div className="view-toggle">
              <button
                className={`view-btn ${view === 'table' ? 'active' : ''}`}
                onClick={() => setView('table')}
              >
                <List size={16} />
              </button>
              <button
                className={`view-btn ${view === 'card' ? 'active' : ''}`}
                onClick={() => setView('card')}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="candidates-content">
          {view === 'table' ? (
            <div className="table-container">
              <table className="candidates-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>ROLE</th>
                    <th>LOCATION</th>
                    <th>EXPERIENCE</th>
                    <th>SKILLS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} onClick={() => handleOpenEditModal(candidate.id)}>
                      <td className="name-cell">
                        <div className="candidate-info">
                          <div className="candidate-name">{candidate.name}</div>
                          <div className="candidate-email">{candidate.email}</div>
                        </div>
                      </td>
                      <td className="role-cell">{candidate.role}</td>
                      <td className="location-cell">{candidate.location}</td>
                      <td className="experience-cell">{candidate.experience}</td>
                      <td className="skills-cell">
                        <div className="skills-container">
                          {candidate.skills && candidate.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="skill-tag">
                              {typeof skill === 'object' ? skill.name : skill}
                            </span>
                          ))}
                          {candidate.skills && candidate.skills.length > 3 && (
                            <span className="skill-tag skill-more">+{candidate.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="dropdown-wrapper">
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === candidate.id ? null : candidate.id);
                            }}
                          >
                            •••
                          </button>

                          {activeDropdownId === candidate.id && (
                            <div className="dropdown-menu">
                              <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(candidate.id); setActiveDropdownId(null); }}>
                                Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); handleDeleteCandidate(); setActiveDropdownId(null); }}>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-grid">
              {filteredCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="candidate-card"
                  onClick={() => handleOpenEditModal(candidate.id)}
                >
                  <div className="card-header">
                    <h3 className="card-name">{candidate.name}</h3>
                  </div>
                  <div className="card-role">{candidate.role}</div>
                  <div className="card-location">{candidate.location}</div>
                  <div className="card-skills">
                    {candidate.skills && candidate.skills.slice(0, 4).map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {typeof skill === 'object' ? skill.name : skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`right-modal ${selectedCandidate ? 'modal-edit-candidate' : 'modal-add-candidate'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <button className="modal-close" onClick={closeModal}>Add candidate</button>
            </div>
            <div className="modal-body">
              {['name', 'email', 'role', 'location', 'experience', 'industry'].map(field => (
                <div className="form-group" key={field}>
                  <label>{field.charAt(0).toUpperCase() + field.slice(1)} {['name', 'email', 'role', 'location', 'experience'].includes(field) && '*'}</label>
                  <input
                    type="text"
                    name={field}
                    value={(selectedCandidate ? selectedCandidate[field] : newCandidate[field]) || ''}
                    onChange={handleInputChange}
                    required={['name', 'email', 'role', 'location', 'experience'].includes(field)}
                  />
                </div>
              ))}

              <div className="form-group">
                <label>Current CTC</label>
                <input
                  type="text"
                  name="current_ctc"
                  value={(selectedCandidate ? selectedCandidate.current_ctc : newCandidate.current_ctc) || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Expected CTC</label>
                <input
                  type="text"
                  name="expected_ctc"
                  value={(selectedCandidate ? selectedCandidate.expected_ctc : newCandidate.expected_ctc) || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={selectedCandidate ? selectedCandidate.gender : newCandidate.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Skills</label>
                <Select
                  isMulti
                  name="skills"
                  options={skillOptions}
                  value={
                    (selectedCandidate ? selectedCandidate.skills : newCandidate.skills).map(skill => ({
                      value: skill,
                      label: skill,
                    }))
                  }
                  onChange={handleSkillsChange}
                />
              </div>

              <div className="form-group">
                <label>Resume</label>
                <input
                  type="file"
                  name="resume"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                {selectedCandidate?.resume && (
                  <div className="resume-preview">
                    <p className="resume-preview-label">Current Resume:</p>
                    <div className="resume-preview-actions">
                      <a 
                        href={selectedCandidate.resume} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resume-preview-link"
                      >
                        View Resume
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  value={selectedCandidate ? selectedCandidate.notes : newCandidate.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel-btn" onClick={closeModal}>Cancel</button>
              {selectedCandidate ? (
                <>
                  <button className="modal-btn save-btn" onClick={handleEditCandidate}>
                    Save Changes
                  </button>
                  <button className="modal-btn delete-btn" onClick={handleDeleteCandidate}>
                    Delete
                  </button>
                </>
              ) : (
                <button className="modal-btn save-btn" onClick={handleAddCandidate}>
                  Add Candidate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importPopup && (
        <div className="modal-overlay" onClick={() => setImportPopup(false)}>
          <div className="modal modal-import-summary" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Summary</h2>
              <button className="modal-close" onClick={() => setImportPopup(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Total Records:</strong> {importSummary.total}</p>
              <p><strong>Valid Records:</strong> {importSummary.valid}</p>
              {importSummary.missing.length > 0 ? (
                <>
                  <p><strong>Records with Issues:</strong></p>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {importSummary.missing.map((item, index) => (
                      <li key={index} className="error-item">
                        <strong>Row {item.row}:</strong> {item.error}
                      </li>
                    ))}
                  </ul>
                  <p className="warning-text">
                    <em>Records with issues will be skipped during import.</em>
                  </p>
                </>
              ) : (
                <p className="success-text">✅ All records are valid!</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel-btn" onClick={() => setImportPopup(false)}>Cancel</button>
              <button 
                className="modal-btn save-btn" 
                onClick={handleConfirmImport}
                disabled={importSummary.valid === 0}
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showFilterModal && renderFilterModal()}
      {showExportModal && renderExportModal()}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default CandidatesList;