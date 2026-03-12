import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, X, Trash2, CheckCircle, AlertTriangle, UserCheck, UserX } from "lucide-react"; 

// --- Custom Components (UNCHANGED) ---
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;

  const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-2xl text-white flex items-center z-[100] transition-opacity duration-300";
  let typeClasses = "";
  let Icon = CheckCircle;

  switch (type) {
    case 'success':
      typeClasses = "bg-green-600";
      Icon = CheckCircle;
      break;
    case 'error':
      typeClasses = "bg-red-600";
      Icon = AlertTriangle;
      break;
    default:
      typeClasses = "bg-gray-700";
      Icon = AlertTriangle;
      break;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      <Icon size={20} className="mr-3 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition">
        <X size={16} />
      </button>
    </div>
  );
};

const ImageModal = ({ src, onClose, title }) => {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose} 
    >
      <div
        className="relative max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()} 
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-red-600 rounded-full p-2 hover:bg-red-700 transition"
          aria-label="Close image preview"
        >
          <X size={24} />
        </button>
        <h3 className="text-white text-xl text-center mb-2">{title}</h3>
        <img
          src={src}
          alt={title}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl"
        />
      </div>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:bg-gray-300 peer-disabled:cursor-not-allowed ${checked ? 'peer-checked:bg-green-600' : ''}`}>
    </div>
  </label>
);

// --- Main StaffCreate Component ---
const StaffCreate = () => {
  const token = localStorage.getItem("access_token");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // State
  const [form, setForm] = useState({
    first_name: "", last_name: "", designation: "", age: "", phone_number: "", aadhaar_number: "",
    aadhaarPhoto: null, profile_image: null, date: new Date().toISOString().split("T")[0],
  });
  const [aadhaarPreview, setAadhaarPreview] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [modalImage, setModalImage] = useState(null);
  const [modalTitle, setModalTitle] = useState("");
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false, staffId: null, fullName: "", action: "",
  });
  const [enableLoginModal, setEnableLoginModal] = useState({
    isOpen: false, staffId: null, fullName: "", existingUsername: "",
  });
  const [enableLoginForm, setEnableLoginForm] = useState({ username: "", password: "" });
  const [showEnablePassword, setShowEnablePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Utils
  const showToast = (message, type = 'error') => setToast({ message, type });
  const closeToast = () => setToast({ message: '', type: '' });
  const handleOpenModal = (imageUrl, title) => {
    setModalImage(imageUrl);
    setModalTitle(title);
  };
  const handleCloseModal = () => {
    setModalImage(null);
    setModalTitle("");
  };

  // Fetch staff
  const fetchStaffList = useCallback(async () => {
    if (!token) return showToast("No token", 'error');
    
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/admin-management/list-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setStaffList(data.staff_list || []);
      } else {
        showToast(data.detail || "Failed to fetch staff", 'error');
      }
    } catch (err) {
      showToast("Network error", 'error');
    } finally {
      setLoading(false);
    }
  }, [token, BACKEND_URL]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files?.[0]) {
      const file = files[0];
      setForm({ ...form, [name]: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        if (name === "aadhaarPhoto") setAadhaarPreview(reader.result);
        if (name === "profile_image") setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const validateForm = () => {
    if (!form.first_name?.trim() || !form.last_name?.trim() || !form.age || !form.designation?.trim() ||
        !form.phone_number || !form.aadhaar_number || !form.aadhaarPhoto || 
        !form.profile_image) {
      showToast("All fields are required", 'error');
      return false;
    }
    if (!/^\d{10}$/.test(form.phone_number)) {
      showToast("Phone must be 10 digits", 'error');
      return false;
    }
    if (!/^\d{12}$/.test(form.aadhaar_number)) {
      showToast("Aadhaar must be 12 digits", 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('first_name', form.first_name);
    formData.append('last_name', form.last_name);
    formData.append('designation', form.designation);
    formData.append('age', form.age);
    formData.append('phone_number', form.phone_number);
    formData.append('aadhaar_number', form.aadhaar_number);
    formData.append('aadhaar_card', form.aadhaarPhoto);
    formData.append('profile_image', form.profile_image);

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/admin-management/create-staff`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast("Staff created successfully!", 'success');
        setForm({
          first_name: "", last_name: "", age: "", phone_number: "", aadhaar_number: "",
          aadhaarPhoto: null, profile_image: null, date: new Date().toISOString().split("T")[0],
        });
        setAadhaarPreview(null);
        setProfilePreview(null);
        fetchStaffList();
      } else {
        showToast(data.detail || "Creation failed", 'error');
      }
    } catch (err) {
      showToast("Network error", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLogin = async (staff) => {
    const isEnabled = staff.can_login === true && staff.username?.trim();
    
    if (!isEnabled) {
      openEnableLoginModal(staff);
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/admin-management/disable-login/${staff.id}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      
      if (res.ok) {
        showToast('Login disabled successfully!', 'success');
        fetchStaffList();
      } else {
        showToast(data.error || data.detail || 'Failed to disable login', 'error');
      }
    } catch (err) {
      showToast("Network error", 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEnableLoginModal = (staff) => {
    setEnableLoginModal({
      isOpen: true,
      staffId: staff.id,
      fullName: `${staff.first_name} ${staff.last_name}`,
      existingUsername: staff.username || '',
    });
    setEnableLoginForm({ username: '', password: '' });
    setShowEnablePassword(false);
  };

  const closeEnableLoginModal = () => {
    setEnableLoginModal({ isOpen: false, staffId: null, fullName: "", existingUsername: "" });
    setEnableLoginForm({ username: "", password: "" });
  };

  const handleEnableLoginSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = enableLoginForm;
    
    if (!username.trim() || !password.trim()) {
      showToast("Username and password required", 'error');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/admin-management/enable-login/${enableLoginModal.staffId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast(`Login enabled for ${enableLoginModal.fullName}!`, 'success');
        closeEnableLoginModal();
        fetchStaffList();
      } else {
        showToast(data.error || "Failed to enable login", 'error');
      }
    } catch (err) {
      showToast("Network error", 'error');
    }
  };

  const openConfirmationModal = (staffId, fullName) => {
    setConfirmationModal({ isOpen: true, staffId, fullName, action: 'delete' });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, staffId: null, fullName: "", action: '' });
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin-management/delete-staff/${confirmationModal.staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setStaffList(prev => prev.filter(s => s.id !== confirmationModal.staffId));
        showToast(`"${confirmationModal.fullName}" deleted`, 'success');
      } else {
        const data = await res.json();
        showToast(data.detail || "Delete failed", 'error');
      }
    } catch (err) {
      showToast("Network error", 'error');
    }
    closeConfirmationModal();
  };

  const LoginStatusBadge = ({ staff }) => {
    const isEnabled = staff.can_login === true && staff.username?.trim();
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
        isEnabled 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isEnabled ? <UserCheck size={12} /> : <UserX size={12} />}
        {isEnabled ? 'Active' : 'Inactive'}
        {isEnabled && <span className="text-xs">@{staff.username}</span>}
      </span>
    );
  };

  const ActionButtons = ({ staff }) => {
    const isEnabled = staff.can_login === true && staff.username?.trim();
    
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Login:</span>
          <ToggleSwitch 
            checked={isEnabled}
            onChange={() => handleToggleLogin(staff)}
            disabled={loading}
          />
        </div>
        <button
          onClick={() => openConfirmationModal(staff.id, `${staff.first_name} ${staff.last_name}`)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105"
          title="Delete Staff"
          disabled={loading}
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-[#F1F2F4] px-6 py-8 min-h-screen">
      {/* 🔥 FIXED & WIDER FORM - SAME DESIGN */}
      <form onSubmit={handleSubmit} className="bg-white shadow-md border border-gray-300 rounded-xl p-10 mb-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold mb-10 text-center">Add Staff Member</h2>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-8 gap-y-8 w-full">
          {/* 🔥 LEFT COLUMN - BETTER ALIGNMENT */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-gray-200 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Last Name *</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-transparent text-sm focus:outline-none"
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* 🔥 SECOND COLUMN */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">First Name *</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-transparent text-sm focus:outline-none"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Designation *</label>
              <input
                name="designation"
                placeholder="e.g. Chef, Manager"
                value={form.designation}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Age *</label>
              <input
                name="age"
                type="number"
                min={18}
                max={100}
                value={form.age}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-transparent text-sm focus:outline-none"
                placeholder="Enter age"
              />
            </div>
          </div>

          {/* 🔥 THIRD COLUMN - PHONE & AADHAAR */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Phone Number *</label>
              <input
                name="phone_number"
                type="text" 
                maxLength={10}
                value={form.phone_number}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-transparent text-sm focus:outline-none"
                placeholder="10 digit phone"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Aadhaar Number *</label>
              <input
                name="aadhaar_number"
                type="text" 
                maxLength={12}
                value={form.aadhaar_number}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-3 bg-transparent text-sm focus:outline-none"
                placeholder="12 digit aadhaar"
              />
            </div>
          </div>

          {/* 🔥 FOURTH COLUMN - UPLOADS */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Aadhaar Photo *</label>
              <input 
                type="file" 
                name="aadhaarPhoto" 
                accept="image/*" 
                onChange={handleChange} 
                className="text-sm block w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"
              />
              {aadhaarPreview && (
                <img 
                  className="h-24 w-32 mt-3 rounded-lg border-2 border-gray-300 cursor-pointer object-cover hover:border-blue-500 transition-all" 
                  src={aadhaarPreview} 
                  alt="Aadhaar Preview" 
                  onClick={() => handleOpenModal(aadhaarPreview, "Aadhaar Photo Preview")}
                />
              )}
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Profile Picture *</label>
              <input 
                type="file" 
                name="profile_image" 
                accept="image/*" 
                onChange={handleChange} 
                className="text-sm block w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"
              />
              {profilePreview && (
                <img 
                  className="h-24 w-24 mt-3 rounded-full border-2 border-gray-300 cursor-pointer object-cover hover:border-blue-500 transition-all mx-auto" 
                  src={profilePreview} 
                  alt="Profile Preview" 
                  onClick={() => handleOpenModal(profilePreview, "Profile Picture Preview")}
                />
              )}
            </div>
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-12 py-3 bg-black text-white text-lg rounded-md hover:bg-gray-800 transition duration-150 disabled:opacity-50 font-medium"
        >
          {loading ? 'Creating...' : 'Create Staff Member'}
        </button>
      </form>

      {/* 🔥 FIXED TABLE - CORRECT COLUMN ORDER */}
      <div className="bg-white border shadow-md rounded-lg p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold">Staff Members ({staffList.length})</h2>
          <button 
            onClick={fetchStaffList}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition disabled:opacity-50 font-medium"
          >
            Refresh List
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="border p-4 text-sm text-left font-semibold">S.No.</th>
                <th className="border p-4 text-sm text-left font-semibold">Photo</th>
                <th className="border p-4 text-sm text-left font-semibold">Name</th>
                <th className="border p-4 text-sm text-left font-semibold">Designation</th>
                <th className="border p-4 text-sm text-left font-semibold">Age</th>
                <th className="border p-4 text-sm text-left font-semibold">Phone</th>
                <th className="border p-4 text-sm text-left font-semibold">Aadhaar</th>
                <th className="border p-4 text-sm text-left font-semibold">Staff ID</th>
                <th className="border p-4 text-sm text-left font-semibold">Status</th>
                <th className="border p-4 text-sm text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-16 text-gray-500 text-xl">
                    No staff members added yet
                  </td>
                </tr>
              ) : (
                staffList.map((staff, index) => (
                  <tr key={staff.id} className="hover:bg-gray-50 border-b transition-colors">
                    <td className="border p-4 text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="border p-4">
                      {staff.profile_image ? (
                        <img 
                          src={staff.profile_image} 
                          alt="Profile"
                          className="h-14 w-14 rounded-full object-cover mx-auto cursor-pointer border-2 border-gray-300 hover:border-blue-500 hover:scale-105 transition-all shadow-md"
                          onClick={() => handleOpenModal(staff.profile_image, `${staff.first_name} ${staff.last_name}'s Profile`)}
                        />
                      ) : (
                        <div className="h-14 w-14 bg-gray-200 rounded-full mx-auto flex items-center justify-center text-gray-500 text-xs font-medium">
                          No Photo
                        </div>
                      )}
                    </td>
                    <td className="border p-4 text-sm font-semibold text-gray-900">
                      {staff.first_name} {staff.last_name}
                    </td>
                    <td className="border p-4 text-sm font-medium text-gray-700">{staff.designation}</td>
                    <td className="border p-4 text-sm text-gray-700">{staff.age}</td>
                    <td className="border p-4 text-sm font-mono text-gray-700">{staff.phone_number}</td>
                    <td className="border p-4 text-sm">
                      {staff.aadhaar_card ? (
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium underline hover:no-underline flex items-center gap-1"
                          onClick={() => handleOpenModal(staff.aadhaar_card, `${staff.first_name} ${staff.last_name}'s Aadhaar`)}
                        >
                          View Aadhaar
                        </button>
                      ) : (
                        <span className="text-gray-500 text-sm italic">N/A</span>
                      )}
                    </td>
                    <td className="border p-4 text-sm font-mono text-xs bg-gray-50 px-3 py-2 rounded font-medium">
                      {staff.staff_unique_id || 'N/A'}
                    </td>
                    <td className="border p-4 py-4">
                      <LoginStatusBadge staff={staff} />
                    </td>
                    <td className="border p-4 py-4">
                      <ActionButtons staff={staff} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enable Login Modal */}
      {enableLoginModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-green-600">
                Enable Login - {enableLoginModal.fullName}
              </h3>
              <button onClick={closeEnableLoginModal} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEnableLoginSubmit}>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Username *</label>
                  <input
                    type="text"
                    value={enableLoginForm.username}
                    onChange={(e) => setEnableLoginForm({...enableLoginForm, username: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all"
                    placeholder="Enter unique username"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Password *</label>
                  <input
                    type={showEnablePassword ? "text" : "password"}
                    value={enableLoginForm.password}
                    onChange={(e) => setEnableLoginForm({...enableLoginForm, password: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 pr-12 focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all"
                    placeholder="Enter secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnablePassword(!showEnablePassword)}
                    className="absolute right-4 top-[3.5rem] text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
                  >
                    {showEnablePassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={closeEnableLoginModal} className="px-8 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold shadow-lg hover:shadow-xl transition-all">
                  Enable Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{display: confirmationModal.isOpen ? 'flex' : 'none'}}>
        <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border-4 border-red-100">
          <h3 className="text-2xl font-bold text-red-600 mb-6 flex items-center gap-3 justify-center">
            <AlertTriangle size={32} /> Delete Staff?
          </h3>
          <p className="text-gray-700 text-lg mb-8 text-center">Are you sure you want to delete <strong className="font-bold text-red-600 block text-xl">{confirmationModal.fullName}</strong>? This action cannot be undone.</p>
          <div className="flex justify-center gap-6">
            <button onClick={closeConfirmationModal} className="px-8 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all">
              Cancel
            </button>
            <button onClick={handleConfirmDelete} className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg hover:shadow-xl transition-all">
              Delete Staff
            </button>
          </div>
        </div>
      </div>

      {/* Modals & Toast */}
      <ImageModal src={modalImage} onClose={handleCloseModal} title={modalTitle} />
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </div>
  );
};

export default StaffCreate;
