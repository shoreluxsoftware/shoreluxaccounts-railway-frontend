import React, { useState, useEffect, useCallback, useMemo } from "react";
// Import Lucide icons for a professional look
import { Search, X, AlertCircle, CheckCircle, Calendar } from "lucide-react"; 

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// --- TOAST Component ---
const ToastMessage = ({ message, type, onClose }) => {
  const isError = type === "error";
  const baseClasses =
    "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white flex items-center z-[99999] transition-all duration-300 transform";
  const bgClass = isError ? "bg-red-600" : "bg-green-600";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div className={`${baseClasses} ${bgClass}`}>
      <Icon size={20} className="mr-3 flex-shrink-0" />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 p-1 hover:bg-white/20 rounded-full cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const Sales = () => {
  const todayDateStr = new Date().toISOString().split("T")[0];

  // 1. Determine if user is Admin
// final correct code
const isAdmin = localStorage.getItem("role") === "ADMIN";

  const [form, setForm] = useState({
    date: todayDateStr,
    amount: "",
    description: "",
    category: "Cafeteria",
  });

  const [sales, setSales] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("date_newest");
  const [editIndex, setEditIndex] = useState(null); 
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const handleApiResponse = async (response) => {
    if (!response.ok) {
      try {
        const errData = await response.json();
        throw new Error(
          errData.detail || errData.message || errData.error || `HTTP ${response.status}`
        );
      } catch {
        throw new Error(`Server error ${response.status}: ${response.statusText}`);
      }
    }
    return response.json();
  };

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/staff-management/list-sales-income`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("Authentication failed. Please login again.");
          localStorage.removeItem("access_token");
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setSales(result.data || []);
      setError("");
    } catch (err) {
      console.error("Fetch sales error:", err);
      setError("Failed to load sales data");
      showToast(`Failed to load: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || !form.description.trim() || parseFloat(form.amount) <= 0) {
      setError("Please fill amount and description with valid amount (> 0).");
      return;
    }

    setError("");
    setLoading(true);

    const payload = {
      date: form.date,
      amount: parseFloat(form.amount),
      description: form.description.trim(),
      category: form.category,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/staff-management/sales-income`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await handleApiResponse(response);
      await fetchSales();
      setForm({
        date: todayDateStr,
        amount: "",
        description: "",
        category: "Cafeteria",
      });
      showToast("Sale record created successfully!", "success");
    } catch (err) {
      console.error("Create sale error:", err);
      setError(err.message || "Failed to create sale");
      showToast(`Create failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const isEditable = (saleDate) => {
    if (isAdmin) return true; // Admins can always edit (Logic depends on your backend)
    const sale = new Date(saleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sale.setHours(0, 0, 0, 0);
    const diffDays = (today - sale) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 2;
  };

  const filteredSales = useMemo(() => {
    const text = search.toLowerCase();
    return [...sales]
      .filter((sale) => sale.description?.toLowerCase().includes(text))
      .sort((a, b) => {
        if (sortOption === "amount_low") return a.amount - b.amount;
        if (sortOption === "amount_high") return b.amount - a.amount;
        if (sortOption === "date_newest") return new Date(b.date) - new Date(a.date);
        if (sortOption === "date_oldest") return new Date(a.date) - new Date(b.date);
        return 0;
      });
  }, [sales, search, sortOption]);

  const handleEditClick = async (filteredIndex) => {
    const sale = filteredSales[filteredIndex];
    if (!isAdmin && !isEditable(sale.date)) {
      setError("Editing allowed only for sales up to 2 days old.");
      return;
    }

    setError("");
    setOtp("");
    setOtpLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin-management/request-otp`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            verification_type: "sales_income_edit",
            object_id: sale.id,
          }),
        }
      );

      await handleApiResponse(response);
      const originalIndex = sales.findIndex((s) => s.id === sale.id);
      setEditIndex(originalIndex);
      setOtpModalVisible(true);
      showToast("OTP sent to admin mail", "success");
    } catch (err) {
      showToast(err.message || "Failed to request OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Please enter OTP.");
      return;
    }

    setError("");
    setOtpLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin-management/verify-otp`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            verification_type: "sales_income_edit",
            otp: otp.trim(),
          }),
        }
      );

      const result = await handleApiResponse(response);
      if (!result.verified) throw new Error("OTP not verified");

      setOtpModalVisible(false);
      setOtp("");
      setEditForm({ ...sales[editIndex] });
      setEditModalVisible(true);
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      amount: parseFloat(editForm.amount),
      description: editForm.description.trim(),
      category: editForm.category,
      // Admin might want to change date during edit too
      ...(isAdmin && { date: editForm.date }) 
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/staff-management/update-sales-income/${editForm.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      await handleApiResponse(response);
      await fetchSales();
      setEditModalVisible(false);
      showToast("Sale updated successfully!", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setOtpModalVisible(false);
    setEditModalVisible(false);
    setError("");
  };

  return (
    <div className="flex gap-6 px-6 py-8 bg-[#F1F2F4] min-h-screen">
      {/* LEFT FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-300 rounded-xl p-8 shadow-md w-full max-w-lg flex flex-col h-fit"
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Add Sale</h2>
            {isAdmin && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase font-bold tracking-wider">Admin Access</span>}
        </div>

        {error && <p className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded">{error}</p>}

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              name="date"
              onChange={handleChange}
              // ENABLED FOR ADMIN, DISABLED FOR STAFF
              disabled={!isAdmin || loading}
              className={`w-full border-b-2 border-dotted border-black p-2 text-sm transition-colors ${
                !isAdmin ? "bg-gray-200 cursor-not-allowed" : "bg-transparent hover:border-solid cursor-pointer"
              }`}
            />
            {!isAdmin && <p className="text-[10px] text-gray-500 mt-1">Staff: Today's date only</p>}
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">Category *</label>
            <input
              type="text"
              value="Cafeteria"
              disabled
              className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
            />
          </div>
        </div>

        <label className="text-sm font-medium block mb-1">Amount *</label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          placeholder="Enter amount..."
          className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6 focus:border-solid outline-none"
          disabled={loading}
        />

        <label className="text-sm font-medium block mb-1">Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Write short description..."
          className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6 resize-none focus:border-solid outline-none"
          disabled={loading}
          rows="3"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white cursor-pointer py-3 mt-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50 font-medium"
        >
          {loading ? "Processing..." : "Submit Sale"}
        </button>
      </form>

      {/* RIGHT TABLE */}
      <div className="flex-1">
        <div className="flex justify-between mb-3 gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search description..."
              className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
          <select
            className="border border-gray-400 rounded-md px-3 py-2 bg-white text-sm"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="date_newest">Date (Newest → Oldest)</option>
            <option value="date_oldest">Date (Oldest → Newest)</option>
            <option value="amount_low">Amount (Low → High)</option>
            <option value="amount_high">Amount (High → Low)</option>
          </select>
        </div>

        <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-md overflow-auto max-h-[75vh]">
          <h2 className="text-lg font-semibold mb-4 text-center">Sales Records ({filteredSales.length})</h2>

          <table className="w-full border-collapse text-sm">
            <thead className="bg-black text-white sticky top-0 z-10">
              <tr>
                <th className="border p-3 text-left">ID</th>
                <th className="border p-3 text-left">Date</th>
                <th className="border p-3 text-left">Category</th>
                <th className="border p-3 text-left">Amount (₹)</th>
                <th className="border p-3 text-left">Description</th>
                <th className="border p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && sales.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-blue-500">Loading...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No records found</td></tr>
              ) : (
                filteredSales.map((sale, idx) => (
                  <tr key={sale.id} className="hover:bg-gray-50 border-b">
                    <td className="border p-3 text-gray-500 font-mono">{idx + 1}</td>
                    <td className="border p-3 whitespace-nowrap">{sale.date}</td>
                    <td className="border p-3">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold uppercase">
                        {sale.category}
                      </span>
                    </td>
                    <td className="border p-3 font-bold text-green-700">₹ {Number(sale.amount).toLocaleString("en-IN")}</td>
                    <td className="border p-3 max-w-xs truncate" title={sale.description}>{sale.description}</td>
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleEditClick(idx)}
                        disabled={(!isAdmin && !isEditable(sale.date)) || loading || otpLoading}
                        className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${
                          isAdmin || isEditable(sale.date)
                            ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {isAdmin || isEditable(sale.date) ? "Edit" : "Locked"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTP MODAL */}
      {otpModalVisible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-[100]">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Security Check</h3>
                <p className="text-sm text-gray-500 mt-2">OTP sent to Administrator's email/phone.</p>
            </div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="w-full border-2 border-gray-200 p-3 rounded-lg mb-6 focus:border-blue-500 outline-none text-center text-2xl tracking-[0.5em] font-bold"
              placeholder="000000"
              autoFocus
            />
            <div className="flex flex-col gap-3">
              <button
                onClick={handleVerifyOtp}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                disabled={otpLoading}
              >
                {otpLoading ? "Verifying..." : "Verify & Unlock"}
              </button>
              <button
                onClick={cancelEdit}
                className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalVisible && editForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-[100]">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-6 border-b pb-4">Edit Sale Record</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  name="date"
                  onChange={handleEditChange}
                  disabled={!isAdmin}
                  className={`w-full border-b-2 p-2 text-sm ${isAdmin ? "border-blue-500" : "border-gray-200 bg-gray-50"}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Category</label>
                <input
                  type="text"
                  value="Cafeteria"
                  disabled
                  className="w-full border-b-2 border-gray-200 p-2 text-sm bg-gray-50"
                />
              </div>
            </div>

            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              value={editForm.amount}
              onChange={handleEditChange}
              className="w-full border-b-2 border-blue-500 p-2 text-lg font-bold mb-6 outline-none"
            />

            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label>
            <textarea
              name="description"
              value={editForm.description}
              onChange={handleEditChange}
              className="w-full border-2 border-gray-100 rounded-lg p-3 text-sm h-32 mb-6 focus:border-blue-500 outline-none"
            />

            <div className="flex gap-4">
              <button
                onClick={cancelEdit}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {toast && (
        <ToastMessage
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Sales;