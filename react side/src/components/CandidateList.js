import React, { useState, useEffect } from 'react';
import { Plus, Search, LayoutGrid, List, Filter, Download, Upload } from 'lucide-react';
import Navbar from './Navbar';
import * as XLSX from 'xlsx';
import './CandidatesList.css';
import Select from 'react-select';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

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

  const location = useLocation();

  const fetchCandidates = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, redirecting to login');
      return;
    }

    try {
      const res = await axios.get('http://localhost:8000/candidates/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(res.data);
    } catch (err) {
      console.error('Error fetching candidates:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        alert('Session expired. Please log in again.');
        localStorage.clear();
        window.location.href = '/';
      }
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

  const handleAddCandidate = async () => {
    if (!newCandidate || typeof newCandidate !== 'object') {
      console.error("Invalid candidate data");
      return;
    }

    // Validation
    if (!newCandidate.name || !newCandidate.email || !newCandidate.role || !newCandidate.location || !newCandidate.experience) {
      alert('Please fill in all required fields: Name, Email, Role, Location, and Experience.');
      return;
    }

    try {
      const formData = new FormData();

      // Handle all fields properly
      formData.append('name', newCandidate.name || '');
      formData.append('email', newCandidate.email || '');
      formData.append('role', newCandidate.role || '');
      formData.append('location', newCandidate.location || '');
      formData.append('experience', newCandidate.experience || '');
      formData.append('industry', newCandidate.industry || '');
      formData.append('gender', newCandidate.gender || '');
      formData.append('current_ctc', newCandidate.current_ctc || '');
      formData.append('expected_ctc', newCandidate.expected_ctc || '');
      formData.append('notes', newCandidate.notes || '');

      // Handle skills - send as comma-separated string to match backend expectation
      if (newCandidate.skills && newCandidate.skills.length > 0) {
        formData.append('skills', newCandidate.skills.join(','));
      }

      // Handle resume file
      if (newCandidate.resume instanceof File) {
        formData.append('resume', newCandidate.resume);
      }

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required.');
        return;
      }

      await axios.post('http://localhost:8000/add-candidate/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      fetchCandidates();
      closeModal();
      alert('Candidate added successfully!');
    } catch (err) {
      console.error('Error adding candidate:', err);
      alert(err.response?.data?.error || 'Failed to add candidate.');
    }
  };

  const handleEditCandidate = async () => {
    if (!selectedCandidate) return;

    try {
      const formData = new FormData();

      // Handle all fields properly
      formData.append('name', selectedCandidate.name || '');
      formData.append('email', selectedCandidate.email || '');
      formData.append('role', selectedCandidate.role || '');
      formData.append('location', selectedCandidate.location || '');
      formData.append('experience', selectedCandidate.experience || '');
      formData.append('industry', selectedCandidate.industry || '');
      formData.append('gender', selectedCandidate.gender || '');
      formData.append('current_ctc', selectedCandidate.current_ctc || selectedCandidate.currentCTC || '');
      formData.append('expected_ctc', selectedCandidate.expected_ctc || selectedCandidate.expectedCTC || '');
      formData.append('notes', selectedCandidate.notes || '');

      // Handle skills - send as comma-separated string to match backend expectation
      if (selectedCandidate.skills && selectedCandidate.skills.length > 0) {
        formData.append('skills', selectedCandidate.skills.join(','));
      }

      // Handle resume file - only if it's a new file
      if (selectedCandidate.resume instanceof File) {
        formData.append('resume', selectedCandidate.resume);
      }

      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:8000/update_candidate/${selectedCandidate.id}/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        fetchCandidates();
        closeModal();
        alert('Candidate updated successfully!');
      }
    } catch (err) {
      console.error('Error editing candidate:', err.response?.data || err);
      alert(err.response?.data?.error || 'Failed to update candidate.');
    }
  };

  const handleDeleteCandidate = async () => {
    if (!selectedCandidate) return;

    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/candidates/${selectedCandidate.id}/delete/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCandidates();
      closeModal();
      alert('Candidate deleted successfully!');
    } catch (err) {
      console.error('Error deleting candidate:', err);
      alert('Failed to delete candidate.');
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);

    try {
      const token = localStorage.getItem('token');

      if (query.trim() === '') {
        // If search is empty, fetch all candidates
        fetchCandidates();
      } else {
        // Use the search endpoint
        const res = await axios.get(`http://localhost:8000/candidates/search/?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCandidates(res.data);
      }
    } catch (err) {
      console.error('Search error:', err);
      // Fall back to client-side filtering if search endpoint fails
      if (query.trim() === '') {
        fetchCandidates();
      }
    }
  };

  // Client-side filtering as fallback
  const filtered = candidates.filter((c) =>
    [c.name, c.role, c.location, c.experience].some(
      field => field?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // File type validation
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    // File size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Please upload a file smaller than 10MB.');
      return;
    }

    setSelectedImportFile(file);

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
            missingData.push({ row: index + 2, fields: missingFields });
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

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (!selectedImportFile) {
      alert('No file selected.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedImportFile);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const res = await axios.post('http://localhost:8000/bulk-import-excel/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      const result = res.data;
      if (res.status === 201) {
        const message = `✅ Import Completed
Created: ${result.created}
Updated: ${result.updated}
Skipped: ${result.skipped.length}`;

        if (result.skipped.length > 0) {
          const skippedDetails = result.skipped.slice(0, 5).map(s =>
            `Row ${s.row}: ${s.error}`
          ).join('\n');
          alert(`${message}\n\nFirst few skipped rows:\n${skippedDetails}`);
        } else {
          alert(message);
        }

        fetchCandidates();
        setImportPopup(false);
        setImportData(null);
        setImportSummary({ total: 0, missing: [], valid: 0 });
        setSelectedImportFile(null);

        // Clear the file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        alert('⚠ Import completed with issues.');
      }
    } catch (err) {
      console.error('Bulk import failed:', err);
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Something went wrong during import.';
      alert(`Import failed: ${errorMessage}`);
    }
  };

  const handleOpenEditModal = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/candidates/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fullData = res.data;
      const normalizedData = {
        ...fullData,
        current_ctc: fullData.current_ctc || '',
        expected_ctc: fullData.expected_ctc || '',
        resume: fullData.resume ? `http://localhost:8000${fullData.resume}` : null,
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
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      // Clean up empty filter values
      const cleanFilters = {};
      Object.entries(exportFilters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          cleanFilters[key] = value.trim();
        }
      });

      const queryParams = new URLSearchParams(cleanFilters).toString();
      const response = await axios.get(
        `http://localhost:8000/candidates/export/?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
          timeout: 60000, // 60 second timeout for large exports
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers if available
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'candidates_export.xlsx';

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Clean up

      setExportPopup(false);
      setExportFilters({ role: '', experience: '', location: '' });
      alert('Export completed successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Something went wrong while exporting.';
      alert(`Export failed: ${errorMessage}`);
    }
  };

  const handleExportFilterChange = (e) => {
    const { name, value } = e.target;
    setExportFilters({ ...exportFilters, [name]: value });
  };

  return (
    <div className="candidates-wrapper">
      <Navbar />
      <div className="candidates-container">
        <div className="candidates-header">
          <div className="header-left">
            <h1 className="page-title">Candidates</h1>
            <span className="candidates-count">{filtered.length} total</span>
          </div>
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
            <button className="btn btn-secondary" onClick={handleExport}>
              <Filter size={16} />
              Filters
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
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
                  {filtered.map((candidate) => (
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
              {filtered.map((candidate) => (
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
                {selectedCandidate?.resume && typeof selectedCandidate.resume === 'string' && (
                  <div>
                    <label>Current Resume:</label>
                    <iframe
                      src={selectedCandidate.resume}
                      width="100%"
                      height="300px"
                      title="Resume Preview"
                    />
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
                  <p><strong>Records with Missing Data:</strong></p>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {importSummary.missing.map((item, index) => (
                      <li key={index}>
                        Row {item.row}: Missing {item.fields.join(', ')}
                      </li>
                    ))}
                  </ul>
                  <p><em>Records with missing required fields will be skipped.</em></p>
                </>
              ) : (
                <p style={{ color: 'green' }}>✅ All records have required data!</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel-btn" onClick={() => setImportPopup(false)}>Cancel</button>
              <button className="modal-btn save-btn" onClick={handleConfirmImport}>Confirm Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportPopup && (
        <div className="modal-overlay" onClick={() => setExportPopup(false)}>
          <div className="modal modal-export-filters" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export Candidates</h2>
y            </div>
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
              <button className="modal-btn cancel-btn" onClick={() => setExportPopup(false)}>Cancel</button>
              <button className="modal-btn save-btn" onClick={handleExportConfirm}>Export</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatesList;