import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, X, Trash2, CheckCircle, AlertTriangle, UserCheck, UserX } from "lucide-react"; 

// --- Custom Components ---
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

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel, confirmText = "Confirm" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border-4 border-red-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-red-600 flex items-center">
            <AlertTriangle size={24} className="mr-2" />
            Confirm Action
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>
        <p className="mb-6 text-gray-700 text-lg">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main StaffCreate Component ---
const StaffCreate = () => {
  const token = localStorage.getItem("access_token");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [showEnablePassword, setShowEnablePassword] = useState(false);

  // --- State Hooks ---
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    age: "",
    phone_number: "",
    aadhaar_number: "",
    aadhaarPhoto: null,
    profile_image: null,
    date: new Date().toISOString().split("T")[0],
  });

  const [aadhaarPreview, setAadhaarPreview] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [staffList, setStaffList] = useState([]);
  
  // Modal/Toast States
  const [toast, setToast] = useState({ message: '', type: '' });
  const [modalImage, setModalImage] = useState(null);
  const [modalTitle, setModalTitle] = useState("");
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    staffId: null,
    fullName: "",
    action: "", // 'delete' or 'disable'
  });
  const [enableLoginModal, setEnableLoginModal] = useState({
    isOpen: false,
    staffId: null,
    fullName: "",
  });
  const [enableLoginForm, setEnableLoginForm] = useState({
    username: "",
    password: "",
  });

  // --- Utility Functions ---
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };
  const closeToast = () => {
    setToast({ message: '', type: '' });
  };
  const handleOpenModal = (imageUrl, title) => {
    setModalImage(imageUrl);
    setModalTitle(title);
  };
  const handleCloseModal = () => {
    setModalImage(null);
    setModalTitle("");
  };

  // --- Data Fetching ---
  const fetchStaffList = useCallback(async () => {
    if (!token) {
      showToast("Authentication token not found.", 'error');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/admin-management/list-staff`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.detail || "Failed to fetch staff list.", 'error');
        return;
      }
      
      // Add this INSIDE fetchStaffList(), right after setStaffList
setStaffList(data.staff_list || []); 

// 🔥 TEMP DEBUG - REMOVE LATER
console.log("🔥 API RESPONSE:", data.staff_list);
console.log("🔥 FIRST STAFF:", data.staff_list[0]);

    } catch (err) {
      console.error("Error fetching staff list:", err);
      showToast("Network error: Could not load staff list.", 'error');
    }
  }, [token, BACKEND_URL]); 

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]); 

  // --- Form Handlers ---
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && files.length > 0) {
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
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.age ||
      !form.phone_number ||
      !form.aadhaar_number ||
      !form.aadhaarPhoto ||
      !form.profile_image
    ) {
      showToast("All fields including Aadhaar & Profile picture are required.", 'error');
      return false;
    }

    if (!/^\d{10}$/.test(form.phone_number)) {
      showToast("Phone number must be exactly 10 digits.", 'error');
      return false;
    }

    if (!/^\d{12}$/.test(form.aadhaar_number)) {
      showToast("Aadhaar must be exactly 12 digits.", 'error');
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
    formData.append('age', form.age);
    formData.append('phone_number', form.phone_number);
    formData.append('aadhaar_number', form.aadhaar_number);
    formData.append('aadhaar_card', form.aadhaarPhoto); 
    formData.append('profile_image', form.profile_image); 

    try {
      const res = await fetch(`${BACKEND_URL}/admin-management/create-staff`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.detail || "Something went wrong during staff creation.", 'error');
        return;
      }

      showToast("Staff member created successfully!", 'success');
      fetchStaffList();
      
      setForm({
        first_name: "",
        last_name: "",
        age: "",
        phone_number: "",
        aadhaar_number: "",
        aadhaarPhoto: null,
        profile_image: null,
        date: new Date().toISOString().split("T")[0],
      });

      setAadhaarPreview(null);
      setProfilePreview(null);

    } catch (err) {
      console.error("Staff creation network error:", err);
      showToast("Network error. Try again.", 'error');
    }
  };

  // 🔥 ENABLE LOGIN MODAL HANDLERS
  const openEnableLoginModal = (staffId, fullName) => {
    setEnableLoginModal({
      isOpen: true,
      staffId: staffId,
      fullName: fullName,
    });
    setEnableLoginForm({ username: "", password: "" });
    setShowEnablePassword(false);
  };

  const closeEnableLoginModal = () => {
    setEnableLoginModal({ isOpen: false, staffId: null, fullName: "" });
    setEnableLoginForm({ username: "", password: "" });
    setShowEnablePassword(false);
  };

  const handleEnableLoginSubmit = async (e) => {
    e.preventDefault();
    const { staffId, fullName } = enableLoginModal;
    const { username, password } = enableLoginForm;

    if (!username.trim() || !password.trim()) {
      showToast("Username and password are required", 'error');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/admin-management/enable-login/${staffId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to enable login", 'error');
        return;
      }

      showToast(`Login enabled for ${fullName}! Username: ${username}`, 'success');
      closeEnableLoginModal();
      fetchStaffList();
    } catch (err) {
      console.error("Enable login error:", err);
      showToast("Network error. Try again.", 'error');
    }
  };

  // 🔥 CONFIRMATION MODAL HANDLERS
  const openConfirmationModal = (staffId, fullName, action) => {
    setConfirmationModal({
      isOpen: true,
      staffId: staffId,
      fullName: fullName,
      action: action
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, staffId: null, fullName: "", action: '' });
  };

  const handleConfirmAction = async () => {
    const { staffId, fullName, action } = confirmationModal;
    
    if (action === 'disable') {
      // Disable Login
      try {
        const res = await fetch(`${BACKEND_URL}/admin-management/disable-login/${staffId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();

        if (!res.ok) {
          showToast(data.detail || "Failed to disable login", 'error');
          return;
        }

        showToast(`Login disabled for ${fullName}`, 'success');
        fetchStaffList();
      } catch (err) {
        console.error("Disable login error:", err);
        showToast("Network error. Try again.", 'error');
      }
    } else if (action === 'delete') {
      // Delete Staff
      try {
        const res = await fetch(`${BACKEND_URL}/admin-management/delete-staff/${staffId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const data = await res.json();
          showToast(data.detail || `Failed to delete staff member: ${fullName}.`, 'error');
          return;
        }

        setStaffList(prevList => prevList.filter(staff => staff.id !== staffId));
        showToast(`Staff member "${fullName}" deleted successfully.`, 'success');
      } catch (err) {
        console.error("Staff deletion network error:", err);
        showToast("Network error. Could not delete staff member. Try again.", 'error');
      }
    }
    
    closeConfirmationModal();
  };

  // 🔥 HIGHLIGHTED LOGIN STATUS BADGE - SHOWS ALL STAFFS
// 🔥 USE can_login FIELD - PERFECT FIX
const LoginStatusBadge = ({ staff }) => {
  const isDisabled = !staff.can_login; // 🔥 Backend sends can_login: true/false
  
  return (
    <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm  transition-all duration-300 ${
      isDisabled 
        ? 'bg-red-500 text-white   ' 
        : 'bg-green-500 text-white border-green-400 shadow-green-500 hover:shadow-green-600 ring-2 ring-green-300 ring-opacity-50'
    }`}>
      {isDisabled ? (
        <>
          <UserX size={16} className="" />
          <span className="tracking-wide ">Disabled</span>
        </>
      ) : (
        <>
          <UserCheck size={16} className="" />
          <span className="tracking-wide font-semibold">{staff.username}</span>
        </>
      )}
    </div>
  );
};


  // 🔥 ACTION BUTTONS
  const ActionButtons = ({ staff }) => {
    const isLoginDisabled = !staff.username || staff.username.trim() === "";
    
    return (
      <div className="flex gap-1 justify-center">
        {isLoginDisabled ? (
          <button
            onClick={() => openEnableLoginModal(staff.id, `${staff.first_name} ${staff.last_name}`)}
            className="text-green-600 hover:text-green-800 p-1.5 bg-green-100 rounded-full transition-all hover:scale-110 shadow-md"
            title="Enable Login"
          >
            <UserCheck size={16} /> 
          </button>
        ) : (
          <button
            onClick={() => openConfirmationModal(staff.id, `${staff.first_name} ${staff.last_name}`, 'disable')}
            className="text-orange-600 hover:text-orange-800 p-1.5 bg-orange-100 rounded-full transition-all hover:scale-110 shadow-md"
            title="Disable Login"
          >
            <UserX size={16} />
          </button>
        )}
        <button
          onClick={() => openConfirmationModal(staff.id, `${staff.first_name} ${staff.last_name}`, 'delete')}
          className="text-red-600 hover:text-red-800 p-1.5 bg-red-100 rounded-full transition-all hover:scale-110 shadow-md"
          title="Delete Staff"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-[#F1F2F4] px-6 py-8 min-h-screen">
      {/* Staff Creation Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow-md border border-gray-300 rounded-xl p-8 mb-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8">Add Staff Member</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <div className="space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium">Date</label>
              <input
                type="date"
                value={form.date}
                readOnly disabled
                className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Last Name *</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium">First Name *</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Age *</label>
              <input
                name="age"
                type="number"
                min={18}
                max={100}
                value={form.age}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium">Phone *</label>
              <input
                name="phone_number"
                type="text" 
                maxLength={10}
                value={form.phone_number}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Aadhaar *</label>
              <input
                name="aadhaar_number"
                type="text" 
                maxLength={12}
                value={form.aadhaar_number}
                onChange={handleChange}
                className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium">Aadhaar Photo *</label>
              <input type="file" name="aadhaarPhoto" accept="image/*" onChange={handleChange} className="text-sm block w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"/>
              {aadhaarPreview && <img className="h-20 mt-2 rounded border cursor-pointer object-cover" src={aadhaarPreview} alt="Aadhaar Preview" onClick={() => handleOpenModal(aadhaarPreview, "Aadhaar Photo Preview")} />}
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Profile Picture *</label>
              <input type="file" name="profile_image" accept="image/*" onChange={handleChange} className="text-sm block w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"/>
              {profilePreview && <img className="h-20 w-20 mt-2 rounded-full border object-cover cursor-pointer" src={profilePreview} alt="Profile Preview" onClick={() => handleOpenModal(profilePreview, "Profile Picture Preview")} />}
            </div>
          </div>
        </div>
        <button 
          type="submit" 
          className="w-full mt-10 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition duration-150"
        >
          Create Staff
        </button>
      </form>
      
      {/* Staff List Table - SHOWS ALL STAFFS */}
      <div className="bg-white border shadow-md rounded-lg p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Created Staff Members ({staffList.length})</h2>
          <button 
            onClick={fetchStaffList}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
          >
            Refresh List
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-black text-white">
              <tr>
                <th className="border p-3 text-sm text-left">S.No.</th>
                <th className="border p-3 text-sm text-left">Photo</th>
                <th className="border p-3 text-sm text-left">Name</th>
                <th className="border p-3 text-sm text-left">Age</th>
                <th className="border p-3 text-sm text-left">Phone</th>
                <th className="border p-3 text-sm text-left">Aadhaar</th>
                <th className="border p-3 text-sm text-left">Staff ID</th>
                <th className="border p-3 text-sm text-left">Login Status</th>
                <th className="border p-3 text-sm text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-gray-500">
                    No staff added yet
                  </td>
                </tr>
              ) : (
                staffList.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-gray-100">
                    <td className="border p-3 text-sm font-semibold text-center">{i + 1}</td>
                    <td className="border p-3 text-sm text-center">
                      {s.profile_image ? (
                        <img 
                          src={s.profile_image} 
                          alt={`${s.first_name} Profile`}
                          className="h-10 w-10 rounded-full object-cover mx-auto cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition"
                          onClick={() => handleOpenModal(s.profile_image, `${s.first_name} ${s.last_name}'s Profile`)}
                        />
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="border p-3 text-sm font-medium">{s.first_name} {s.last_name}</td>
                    <td className="border p-3 text-sm">{s.age}</td>
                    <td className="border p-3 text-sm">{s.phone_number}</td>
                    <td className="border p-3 text-sm text-center">
                      {s.aadhaar_card ? (
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                          onClick={() => handleOpenModal(s.aadhaar_card, `${s.first_name} ${s.last_name}'s Aadhaar`)}
                        >
                          View Card
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="border p-3 text-sm font-mono">{s.staff_unique_id || 'N/A'}</td>
                    <td className="border p-3 text-sm py-2">
                      <LoginStatusBadge staff={s} />
                    </td>
                    <td className="border p-3 text-sm py-2">
                      <ActionButtons staff={s} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ENABLE LOGIN MODAL */}
      {enableLoginModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-green-600 flex items-center">
                <UserCheck size={24} className="mr-2" />
                Enable Login for {enableLoginModal.fullName}
              </h3>
              <button onClick={closeEnableLoginModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEnableLoginSubmit}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Username *</label>
                  <input
                    type="text"
                    value={enableLoginForm.username}
                    onChange={(e) => setEnableLoginForm({...enableLoginForm, username: e.target.value})}
                    className="w-full border rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter username"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Password *</label>
                  <input
                    type={showEnablePassword ? "text" : "password"}
                    value={enableLoginForm.password}
                    onChange={(e) => setEnableLoginForm({...enableLoginForm, password: e.target.value})}
                    className="w-full border rounded-md p-3 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnablePassword(!showEnablePassword)}
                    className="absolute right-3 top-11 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showEnablePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEnableLoginModal}
                  className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  Enable Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARED CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        message={
          confirmationModal.action === 'disable'
            ? `Disable login access for ${confirmationModal.fullName}?`
            : `Delete ${confirmationModal.fullName}? This cannot be undone!`
        }
        onConfirm={handleConfirmAction}
        onCancel={closeConfirmationModal}
        confirmText={confirmationModal.action === 'disable' ? 'Disable Login' : 'Delete'}
      />

      {/* Modals and Toast */}
      <ImageModal src={modalImage} onClose={handleCloseModal} title={modalTitle} />
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </div>
  );
};

export default StaffCreate;
