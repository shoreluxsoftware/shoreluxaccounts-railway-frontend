import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Edit2, X, AlertCircle, CheckCircle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// --- TOAST ---
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
        className="ml-4 p-1 hover:bg-white/20 rounded-full"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const todayDateStr = new Date().toISOString().split("T")[0];

function isEditable(recordDate) {
  const record = new Date(recordDate);
  record.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays =
    (today.getTime() - record.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 2;
}

export default function OtherIncome() {
  const [form, setForm] = useState({
    date: todayDateStr,
    amount: "",
    description: "",
    category: "Other Income",
  });
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // default sort option (newest on top)
  const [sortOption, setSortOption] = useState("date_newest");
  // editIndex now stores the record ID, not array index
  const [editIndex, setEditIndex] = useState(null); 
  const [editForm, setEditForm] = useState(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type) => {
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
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            errorData.error ||
            `HTTP ${response.status}`
        );
      } catch (jsonError) {
        throw new Error(
          `Server error ${response.status}: ${response.statusText}`
        );
      }
    }
    return response.json();
  };

  // --- Fetch other income list ---
  const fetchIncomeRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/staff-management/list-other-income`,
        {
          headers: getAuthHeaders(),
        }
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
      setIncomeRecords(result.data || []);
      setError("");
      showToast("Income records loaded successfully", "success");
    } catch (err) {
      console.error("Fetch income error:", err);
      setError("Failed to load income data");
      showToast(`Failed to load records: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // --- Create income ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.amount ||
      !form.description.trim() ||
      parseFloat(form.amount) <= 0
    ) {
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
        `${API_BASE_URL}/staff-management/other-income`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await handleApiResponse(response);

      await fetchIncomeRecords();
      setForm({
        date: todayDateStr,
        amount: "",
        description: "",
        category: "Other Income",
      });
      showToast(
        `Income '${result.data.description.substring(0, 30)}...' added!`,
        "success"
      );
    } catch (err) {
      console.error("Create income error:", err);
      setError(err.message || "Failed to create income");
      showToast(`Failed to add income: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Update income (after OTP verified) ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (
      !editForm.amount ||
      !editForm.description.trim() ||
      parseFloat(editForm.amount) <= 0
    ) {
      setError("Please fill amount and description with valid amount (> 0).");
      return;
    }

    setError("");
    setLoading(true);

    const payload = {
      amount: parseFloat(editForm.amount),
      description: editForm.description.trim(),
      category: editForm.category,
    };

    try {
      // *** FIX: Use the ID stored in editForm.id for the API endpoint ***
      const response = await fetch(
        `${API_BASE_URL}/staff-management/update-other-income/${editForm.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      await handleApiResponse(response);

      await fetchIncomeRecords();
      cancelEdit();
      showToast("Income updated successfully!", "success");
    } catch (err) {
      console.error("Update income error:", err);
      setError(err.message || "Failed to update income");
      showToast(`Update failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeRecords();
  }, [fetchIncomeRecords]);

  const filteredIncome = useMemo(() => {
    const filterText = search.toLowerCase();
    return incomeRecords
      .filter((rec) =>
        rec.description?.toLowerCase().includes(filterText)
      )
      .sort((a, b) => {
        if (sortOption === "amount_low") return a.amount - b.amount;
        if (sortOption === "amount_high") return b.amount - a.amount;
        if (sortOption === "date_newest")
          return new Date(b.date) - new Date(a.date);
        if (sortOption === "date_oldest")
          return new Date(a.date) - new Date(b.date);
        return 0;
      });
  }, [incomeRecords, search, sortOption]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (error) setError("");
  };

  // --- EDIT CLICK: call request-otp then open modal ---
  // *** FIX: Accept recordId instead of array index ***
  const handleEditClick = async (recordId) => {
    // 1. Find the correct record in the original list using its unique ID
    const recordToEdit = incomeRecords.find(rec => rec.id === recordId);

    if (!recordToEdit) {
        showToast("Error: Record not found.", "error");
        return;
    }

    if (!isEditable(recordToEdit.date)) {
      setError("Editing allowed only for records up to 2 days old.");
      return;
    }

    setError("");
    setOtp("");
    // 2. Store the record ID in editIndex state
    setEditIndex(recordId); 
    setOtpLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin-management/request-otp`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            verification_type: "other_income_edit",
            object_id: recordToEdit.id, // 3. Use the correct ID for the API
          }),
        }
      );

      await handleApiResponse(response);
      showToast("OTP sent to admin Email", "success");
      setOtpModalVisible(true);
    } catch (err) {
      console.error("Request OTP error:", err);
      setEditIndex(null);
      showToast(
        "Failed to request OTP. Please try again.",
        "error"
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // --- VERIFY OTP: call verify-otp, then open edit modal ---
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
            verification_type: "other_income_edit",
            otp: otp.trim(),
          }),
        }
      );

      const result = await handleApiResponse(response);
      if (!result.verified) {
        throw new Error("OTP not verified");
      }

      setOtpModalVisible(false);
      setOtp("");
      // *** FIX: Look up the record using the stored ID (editIndex) ***
      const record = incomeRecords.find(rec => rec.id === editIndex);
      if (!record) throw new Error("Record data lost after verification.");

      setEditForm({ ...record });
      setEditModalVisible(true);
      showToast("OTP verified. You can edit now.", "success");
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError(err.message || "OTP verification failed");
      showToast(`OTP verification failed: ${err.message}`, "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
    if (error) setError("");
  };

  const cancelEdit = () => {
    setEditForm(null);
    setEditIndex(null); // Reset the ID
    setOtp("");
    setOtpModalVisible(false);
    setEditModalVisible(false);
    setError("");
  };

  return (
    <div className="flex gap-6 px-6 py-8 bg-[#F1F2F4] min-h-screen">
      {/* LEFT FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-300 rounded-xl p-8 shadow-md w-full max-w-lg flex flex-col"
      >
        <h2 className="text-xl font-semibold mb-6">Add Other Income</h2>

        {error && (
          <p className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded">
            {error}
          </p>
        )}
        {loading && (
          <p className="text-blue-600 text-sm mb-4">Processing...</p>
        )}

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">
              Date *
            </label>
            <input
              type="date"
              value={form.date}
              name="date"
              disabled
              className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">
              Category *
            </label>
            <input
              type="text"
              value="Other Income"
              disabled
              className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
            />
          </div>
        </div>

        <label className="text-sm font-medium block mb-1">
          Amount *
        </label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          min="0.01"
          step="0.01"
          placeholder="Enter amount..."
          className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
          disabled={loading}
        />

        <label className="text-sm font-medium block mb-1">
          Description *
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Write short description..."
          className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6 resize-none"
          disabled={loading}
          rows="3"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 mt-4 cursor-pointer rounded-md hover:bg-gray-900 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Submit Income"}
        </button>
      </form>

      {/* RIGHT TABLE */}
      <div className="flex-1">
        <div className="flex justify-between mb-3">
          <div className="relative w-1/2">
            <input
              type="text"
              placeholder="Search description..."
              className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            />
          </div>
          <select
            className="border border-gray-400 rounded-md px-3 py-2"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="">Sort by</option>
            <option value="date_newest">Date (Newest → Oldest)</option>
            <option value="date_oldest">Date (Oldest → Newest)</option>
            <option value="amount_low">Amount (Low → High)</option>
            <option value="amount_high">Amount (High → Low)</option>
          </select>
        </div>

        <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-md overflow-auto max-h-[70vh]">
          <h2 className="text-lg font-semibold mb-4 text-center">
            Income ({filteredIncome.length})
          </h2>

          <table className="w-full border-collapse text-sm">
            <thead className="bg-black text-white sticky top-0 z-10">
              <tr>
                <th className="border p-3">ID</th>
                <th className="border p-3">Date</th>
                <th className="border p-3">Category</th>
                <th className="border p-3">Amount (₹)</th>
                <th className="border p-3 max-w-xs">Description</th>
                <th className="border p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && incomeRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-blue-500">
                    Loading income records...
                  </td>
                </tr>
              ) : filteredIncome.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No income recorded
                  </td>
                </tr>
              ) : (
                filteredIncome.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50 border-b">

                    {/* Hidden Real ID */}
                    <td className="border p-3 font-mono hidden">{record.id}</td>

                    {/* Auto Increment ID (Visual index only) */}
                    <td className="border p-3 font-mono">{index + 1}</td>

                    <td className="border p-3">{record.date}</td>

                    <td className="border p-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        {record.category}
                      </span>
                    </td>

                    <td className="border p-3 font-semibold text-green-700">
                      ₹ {Number(record.amount).toLocaleString("en-IN")}
                    </td>

                    <td
                      className="border p-3 max-w-xs truncate"
                      title={record.description}
                    >
                      {record.description}
                    </td>

                    <td className="border p-3">
                      <button
                        // *** FIX: Pass the unique record.id instead of index ***
                        onClick={() => handleEditClick(record.id)}
                        disabled={!isEditable(record.date) || otpLoading || loading}
                        className={`px-3 py-1 rounded text-xs cursor-pointer font-medium transition-all ${
                          isEditable(record.date)
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                            : "bg-gray-400 text-gray-700 cursor-not-allowed"
                        } ${otpLoading ? "opacity-70" : ""}`}
                      >
                        {isEditable(record.date) ? "Edit" : "Too Old"}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold mb-4">
              Enter OTP to Edit
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              OTP has been sent to admin Email.
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="w-full border border-gray-300 p-3 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
              placeholder="Enter OTP"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 border border-gray-300 cursor-pointer rounded-lg hover:bg-gray-50 transition text-sm"
                disabled={otpLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="px-6 py-2 bg-green-600 text-white cursor-pointer rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-60"
                disabled={otpLoading}
              >
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalVisible && editForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-semibold mb-6">
              Edit Income (ID: {editForm.id})
            </h2>

            {error && (
              <p className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded">
                {error}
              </p>
            )}
            {loading && (
              <p className="text-blue-600 text-sm mb-4">Updating...</p>
            )}

            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  disabled
                  className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  value="Other Income"
                  disabled
                  className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
                />
              </div>
            </div>

            <label className="text-sm font-medium block mb-1">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={editForm.amount}
              onChange={handleEditChange}
              min="0.01"
              step="0.01"
              placeholder="Enter amount..."
              className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
              disabled={loading}
            />

            <label className="text-sm font-medium block mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={editForm.description}
              onChange={handleEditChange}
              placeholder="Write short description..."
              className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6 resize-none"
              disabled={loading}
              rows="3"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={loading}
                className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <ToastMessage
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}