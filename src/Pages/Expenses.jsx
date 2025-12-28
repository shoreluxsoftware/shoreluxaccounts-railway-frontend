import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, X, AlertCircle, CheckCircle, Plus } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// 🔥 CUSTOM TOAST COMPONENT
const ToastMessage = ({ message, type, onClose }) => {
  const isError = type === "error";
  const baseClasses =
    "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white flex items-center z-[99999999] transition-all duration-300 transform";
  const bgClass = isError ? "bg-red-600" : "bg-green-600";
  const Icon = isError ? AlertCircle : CheckCircle;

  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

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

const expenseCategories = [
  "Laundry",
  "Cleaning",
  "Mess",
  "Rental",
  "Miscellaneous",
  "Maintenance",
  "Capital",
  "Other Expenses",
];

const Expenses = () => {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
    category: "",
    staff_code: "",
    bill_file: null,
    voucher_file: null,
    voucher_no: "",
  });

  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("date_newest");
  const [filterCategory, setFilterCategory] = useState("");

  // 🔥 MODAL STATES
  const [editExpense, setEditExpense] = useState(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // 🔥 TOAST STATE
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const handleJsonOrError = async (response) => {
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Server error ${response.status}: ${response.statusText || "Unknown"}`
      );
    }
    if (!response.ok) {
      throw new Error(
        data.error ||
          data.detail ||
          data.non_field_errors?.[0] ||
          `HTTP ${response.status}`
      );
    }
    return data;
  };

  // 🔥 FETCH EXPENSES FROM API - FIXED FOR BACKEND COMPATIBILITY
  const fetchExpenses = useCallback(async () => {
    setLoadingTable(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/staff-management/list-expenses`,
        {
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );
      const result = await handleJsonOrError(response);
      
      // 🔥 FIX: Ensure staff_code exists (backend might not include it)
      const expensesWithStaffCode = (result.data || []).map(exp => ({
        ...exp,
        staff_code: exp.staff_code || "", // Default to empty string
      }));
      
      setExpenses(expensesWithStaffCode);
      setError("");
    } catch (err) {
      console.error("Fetch expenses error:", err);
      showToast(err.message || "Failed to load expenses", "error");
      setExpenses([]); // Set empty array on error
    } finally {
      setLoadingTable(false);
    }
  }, [showToast, API_BASE_URL]);

  // 🔥 CREATE EXPENSE API (Add Form - LEFT SIDE)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.amount ||
      !form.description ||
      !form.category ||
      (!form.bill_file && !form.voucher_file)
    ) {
      showToast(
        "Please fill all required fields including bill or voucher file",
        "error"
      );
      return;
    }

    // 🔥 VALIDATE STAFF CODE FOR SALARY
    if (form.category === "Salary" && !form.staff_code.trim()) {
      showToast("Staff code is required for Salary expenses", "error");
      return;
    }

    if (form.voucher_file && !form.voucher_no.trim()) {
      showToast("Voucher number required when uploading voucher", "error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("date", form.date);
      formData.append("amount", parseFloat(form.amount));
      formData.append("description", form.description);
      formData.append("category", form.category);

      // 🔥 ADD STAFF CODE FOR SALARY
      if (form.category === "Salary" && form.staff_code.trim()) {
        formData.append("staff_code", form.staff_code.trim());
      }

      if (form.bill_file) {
        formData.append("bill_file", form.bill_file);
      }
      if (form.voucher_file) {
        formData.append("voucher_file", form.voucher_file);
        formData.append("voucher_no", form.voucher_no);
      }

      const response = await fetch(
        `${API_BASE_URL}/staff-management/add-expense`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      await handleJsonOrError(response);

      showToast("Expense added successfully!", "success");
      setForm({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        description: "",
        category: "",
        staff_code: "",
        bill_file: null,
        voucher_file: null,
        voucher_no: "",
      });
      await fetchExpenses();
    } catch (err) {
      console.error("Add expense error:", err);
      showToast(err.message || "Failed to add expense", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "bill_file") {
      setForm({
        ...form,
        bill_file: files[0],
        voucher_file: null,
        voucher_no: "",
      });
    } else if (name === "voucher_file") {
      setForm({
        ...form,
        voucher_file: files[0],
        bill_file: null,
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const removeFile = (type) => {
    setForm({
      ...form,
      bill_file: type === "bill_file" ? null : form.bill_file,
      voucher_file: type === "voucher_file" ? null : form.voucher_file,
      voucher_no: type === "voucher_file" ? "" : form.voucher_no,
    });
  };

  // ✅ EDITABLE CHECK
  const isEditable = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffDays = (today - d) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 2;
  };

  // 🔥 RENDER STAFF CODE FIELD (Conditional - FIXED)
  const renderStaffCodeField = (data, isEdit = false, isForm = true) => {
    if (data.category !== "Salary") return null;

    return (
      <div className="mb-6">
        <label className="text-sm font-medium block mb-1">
          Staff Code * {isForm && <span className="text-xs text-red-500">(Required)</span>}
        </label>
        <input
          type="text"
          name="staff_code"
          value={data.staff_code || ""}
          onChange={isForm ? handleChange : handleEditChange}
          placeholder="Enter staff code (e.g., ST001)"
          className={`w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm ${
            isEdit ? "bg-gray-100" : ""
          }`}
          disabled={isEdit || loading || editLoading}
        />
      </div>
    );
  };

  // 🔥 RENDER VOUCHER FIELD (NEW - HANDLES VOUCHER_NO TOO)
  const renderVoucherField = (data, isEdit = false, isForm = true) => {
    return (
      (data.voucher_file || data.voucher_no) && (
        <div className="mb-6">
          <label className="text-sm font-medium block mb-1">
            Voucher No. {isForm && <span className="text-xs text-red-500">(Required)</span>}
          </label>
          <input
            type="text"
            name="voucher_no"
            value={data.voucher_no || ""}
            onChange={isForm ? handleChange : handleEditChange}
            placeholder="Enter voucher number..."
            className={`w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm ${
              isEdit ? "" : "bg-gray-100"
            }`}
            disabled={loading || editLoading}
          />
        </div>
      )
    );
  };

  // FILTER & SORT - FIXED FOR SAFE ACCESS
  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .filter((exp) => {
        const text = search.toLowerCase();
        const matchesSearch =
          (exp.description || "").toLowerCase().includes(text) ||
          (exp.category || "").toLowerCase().includes(text) ||
          (exp.staff_code || "").toLowerCase().includes(text);
        const matchesCategory = filterCategory
          ? exp.category === filterCategory
          : true;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOption === "amount_low") return (a.amount || 0) - (b.amount || 0);
        if (sortOption === "amount_high") return (b.amount || 0) - (a.amount || 0);
        if (sortOption === "date_newest")
          return new Date(b.date || 0) - new Date(a.date || 0);
        if (sortOption === "date_oldest")
          return new Date(a.date || 0) - new Date(b.date || 0);
        return 0;
      });
  }, [expenses, search, filterCategory, sortOption]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // 🔥 HANDLE EDIT CLICK - STARTS OTP FLOW
  const handleEditClick = async (exp) => {
    console.log("🔍 Edit clicked for:", exp.id, exp.category, exp);

    if (!isEditable(exp.date)) {
      showToast("Editing allowed only for expenses up to 2 days old", "error");
      return;
    }

    setEditExpense({
      id: exp.id,
      date: exp.date,
      category: exp.category,
      amount: exp.amount,
      description: exp.description || "",
      staff_code: exp.staff_code || "",
      bill_file: exp.bill_file,
      voucher_file: exp.voucher_file,
      voucher_no: exp.voucher_no || "",
    });

    setError("");
    setOtp("");
    setOtpLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin-management/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            verification_type: "expense_edit",
            object_id: exp.id,
            category: exp.category,
          }),
        }
      );

      const result = await handleJsonOrError(response);
      showToast(result.message || "OTP sent to admin email", "success");
      setOtpModalVisible(true);
    } catch (err) {
      console.error("Request OTP error:", err);
      showToast(err.message || "Failed to request OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  // 🔥 VERIFY OTP -> OPEN EDIT MODAL
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
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            verification_type: "expense_edit",
            otp: otp.trim(),
          }),
        }
      );

      const result = await handleJsonOrError(response);
      if (!result.verified) {
        throw new Error("OTP not verified");
      }

      setOtpModalVisible(false);
      setOtp("");
      setEditModalVisible(true);
      showToast("OTP verified. You can edit now.", "success");
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError(err.message || "OTP verification failed");
      showToast(err.message || "OTP verification failed", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  // 🔥 EDIT FORM HANDLERS (UPDATED)
  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === "bill_file") {
      setEditExpense({
        ...editExpense,
        bill_file: files[0],
        voucher_file: null,
        voucher_no: "",
      });
    } else if (name === "voucher_file") {
      setEditExpense({
        ...editExpense,
        voucher_file: files[0],
        bill_file: null,
        // Keep existing voucher_no or let user edit it
      });
    } else {
      // 🔥 NOW HANDLES voucher_no TOO
      setEditExpense({ ...editExpense, [name]: value });
    }
    if (error) setError("");
  };

  // 🔥 EDIT SUBMIT (UPDATED WITH VOUCHER VALIDATION)
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // 🔥 VALIDATE STAFF CODE FOR SALARY EDIT
    if (
      editExpense.category === "Salary" && 
      (!editExpense.staff_code || !editExpense.staff_code.trim())
    ) {
      setError("Staff code is required for Salary expenses");
      return;
    }

    // 🔥 VALIDATE VOUCHER_NO WHEN VOUCHER EXISTS
    if (editExpense.voucher_file && !editExpense.voucher_no?.trim()) {
      setError("Voucher number required when voucher file exists.");
      return;
    }

    if (
      !editExpense.amount ||
      !editExpense.description?.trim() ||
      parseFloat(editExpense.amount) <= 0
    ) {
      setError("Fill amount (> 0) and description.");
      return;
    }

    console.log(`🔍 Submitting edit for ID: ${editExpense.id}`);

    setError("");
    setEditLoading(true);

    const formData = new FormData();
    formData.append("category", editExpense.category);
    formData.append("amount", parseFloat(editExpense.amount));
    formData.append("description", editExpense.description.trim());
    formData.append("date", editExpense.date);

    // 🔥 ADD STAFF CODE FOR SALARY EDIT
    if (editExpense.category === "Salary" && editExpense.staff_code.trim()) {
      formData.append("staff_code", editExpense.staff_code.trim());
    }

    if (editExpense.bill_file && editExpense.bill_file instanceof File) {
      formData.append("bill_file", editExpense.bill_file);
    }
    if (editExpense.voucher_file && editExpense.voucher_file instanceof File) {
      formData.append("voucher_file", editExpense.voucher_file);
      formData.append("voucher_no", editExpense.voucher_no || "");
    } else if (editExpense.voucher_no) {
      // 🔥 SEND VOUCHER_NO EVEN IF NO NEW FILE (for editing existing)
      formData.append("voucher_no", editExpense.voucher_no.trim());
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/staff-management/update-expense/${editExpense.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      await handleJsonOrError(response);

      showToast("Expense updated successfully", "success");
      setEditModalVisible(false);
      setEditExpense(null);
      await fetchExpenses();
    } catch (err) {
      console.error("Update expense error:", err);
      setError(err.message || "Failed to update expense");
      showToast(err.message || "Failed to update expense", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditExpense(null);
    setEditModalVisible(false);
    setOtpModalVisible(false);
    setOtp("");
    setError("");
  };

  // 🔥 FILTERED EXPENSES COUNT
  const filteredExpensesCount = filteredExpenses.length;

  return (
    <div className="flex gap-6 bg-[#F1F2F4] px-6 py-8 min-h-screen">
      {/* 🔥 LEFT: ADD EXPENSE FORM (ALWAYS VISIBLE) */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-300 rounded-xl p-8 shadow-md w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Plus size={20} /> Add Expense
        </h2>
        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 rounded flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}
        {loading && <p className="text-blue-600 text-sm mb-4">Processing...</p>}

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">Date *</label>
            <input
              type="date"
              name="date"
              value={form.date}
              disabled
              className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">Category *</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
              disabled={loading}
            >
              <option value="">Select category...</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 🔥 STAFF CODE FIELD - SHOWS WHEN SALARY SELECTED */}
        {renderStaffCodeField(form, false, true)}

        <label className="text-sm font-medium block mb-1">Amount *</label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          min="0"
          placeholder="Enter amount..."
          className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
          disabled={loading}
        />

        <label className="text-sm font-medium block mb-1">Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Write short description..."
          className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6 resize-none"
          disabled={loading}
        />

        <p className="text-sm font-semibold mb-3 text-red-600">Upload Bill or Voucher * (Required)</p>

        {!form.bill_file && !form.voucher_file && (
          <>
            <label className="text-xs text-gray-600 block mb-1">Upload Bill</label>
            <input
              type="file"
              name="bill_file"
              accept="image/*,application/pdf"
              onChange={handleChange}
              className="w-full mb-3 border-b-2 border-dotted border-black p-2 text-sm"
              disabled={loading}
            />
          </>
        )}

        {form.bill_file && (
          <div className="flex justify-between items-center bg-green-50 p-3 rounded-md border border-green-200 mb-4">
            <span className="text-sm text-green-800">Bill: {form.bill_file.name}</span>
            <button type="button" onClick={() => removeFile("bill_file")} disabled={loading}>
              <X className="text-red-600 hover:text-red-800 cursor-pointer" size={18} />
            </button>
          </div>
        )}

        {!form.voucher_file && (
          <>
            <label className="text-xs text-gray-600 block mb-1">OR Upload Voucher</label>
            <input
              type="file"
              name="voucher_file"
              accept="image/*,application/pdf"
              onChange={handleChange}
              className="w-full mb-3 border-b-2 border-dotted border-black p-2 text-sm"
              disabled={!!form.bill_file || loading}
            />
          </>
        )}

        {form.voucher_file && (
          <>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md border border-blue-200 mb-3">
              <span className="text-sm text-blue-800">Voucher: {form.voucher_file.name}</span>
              <button type="button" onClick={() => removeFile("voucher_file")} disabled={loading}>
                <X className="text-red-600 hover:text-red-800 cursor-pointer" size={18} />
              </button>
            </div>
            <label className="text-sm font-medium block mb-1">Voucher No. *</label>
            <input
              type="text"
              name="voucher_no"
              value={form.voucher_no}
              onChange={handleChange}
              placeholder="Enter voucher number..."
              className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
              disabled={loading}
            />
          </>
        )}

        <button
          type="submit"
          className="w-full bg-black text-white py-2 cursor-pointer mt-6 rounded-md hover:bg-gray-900 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Adding..." : "Submit Expense"}
        </button>
      </form>

      {/* 🔥 RIGHT: EXPENSES TABLE */}
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-3">
          <div className="relative w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Search description, category or staff code..."
              className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-400 rounded-md px-3 py-2 flex-1 sm:flex-none"
            >
              <option value="">All Categories</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="border border-gray-400 rounded-md px-3 py-2"
            >
              <option value="">Sort by</option>
              <option value="date_newest">Date (Newest)</option>
              <option value="date_oldest">Date (Oldest)</option>
              <option value="amount_high">Amount (High→Low)</option>
              <option value="amount_low">Amount (Low→High)</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-md overflow-auto max-h-[70vh]">
          <h2 className="text-lg font-semibold mb-4 text-center">
            Expenses ({filteredExpensesCount})
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead className="bg-black text-white sticky top-0 z-10">
              <tr>
                <th className="border p-3">ID</th>
                <th className="border p-3">Date</th>
                <th className="border p-3 w-32">Category</th>
                <th className="border p-3">Amount (₹)</th>
                <th className="border p-3 max-w-xs">Description</th>
                <th className="border p-3">Voucher No.</th>
                <th className="border p-3 w-20">Files</th>
                <th className="border p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-blue-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    {search || filterCategory ? "No matching expenses" : "No expenses added yet"}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, index) => (
                  <tr key={exp.id} className="hover:bg-gray-50 border-b">
                    <td className="border p-3 font-mono hidden">{exp.id}</td>
                    <td className="border p-3 font-mono">{index + 1}</td>
                    <td className="border p-3">{exp.date}</td>
                    <td className="border p-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{exp.category}</span>
                    </td>
                    <td className="border border-black p-3 font-semibold text-red-600">
                      ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="border p-3 max-w-xs truncate" title={exp.description}>
                      {exp.description || "-"}
                    </td>
                    <td className="border p-3 font-mono text-xs">{exp.voucher_no || "-"}</td>
                    <td className="border p-3">
                      <div className="space-y-1">
                        {exp.bill_file && (
                          <a
                            href={`${API_BASE_URL}${exp.bill_file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs block underline"
                          >
                            Bill
                          </a>
                        )}
                        {exp.voucher_file && (
                          <a
                            href={`${API_BASE_URL}${exp.voucher_file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs block underline"
                          >
                            Voucher
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="border p-3">
                      <button
                        type="button"
                        onClick={() => handleEditClick(exp)}
                        disabled={!isEditable(exp.date) || loading || otpLoading}
                        className={`px-3 py-1 rounded text-xs cursor-pointer font-medium transition-all flex items-center gap-1 ${
                          isEditable(exp.date)
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                            : "bg-gray-400 text-gray-700 cursor-not-allowed"
                        } ${otpLoading ? "opacity-70" : ""}`}
                        title={!isEditable(exp.date) ? "Only 2 days old expenses editable" : ""}
                      >
                        {isEditable(exp.date) ? "Edit" : "Too Old"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔥 OTP MODAL */}
      {otpModalVisible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-[1000]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
            <h3 className="text-2xl font-bold mb-2 text-gray-800">Verify Edit</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter OTP sent to admin email (expires in 10 min)
              <br />
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                Expense ID: {editExpense?.id}
              </span>
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="inline mr-2 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="w-full border-2 border-gray-300 p-4 rounded-xl mb-6 focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-mono font-bold"
              placeholder="000000"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-8 py-3 border-2 border-gray-300 cursor-pointer rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
                disabled={otpLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="px-8 py-3 bg-gradient-to-r from-green-600 cursor-pointer to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all text-sm font-bold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={otpLoading || !otp.trim()}
              >
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 EDIT MODAL (UPDATED WITH VOUCHER FIELD) */}
      {editModalVisible && editExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-[1001]">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Edit Expense <span className="text-sm text-gray-500 ml-2">(ID: {editExpense.id})</span>
              </h3>
              <button onClick={cancelEdit} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="inline mr-2 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            {editLoading && <p className="text-blue-600 text-sm mb-6">Saving...</p>}

            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">Date</label>
                <input
                  type="date"
                  value={editExpense.date}
                  disabled
                  className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">
                  Category <span className="text-xs text-gray-500">(fixed)</span>
                </label>
                <select
                  value={editExpense.category}
                  disabled
                  className="w-full border-b-2 border-dotted border-gray-400 p-2 bg-gray-100 text-sm cursor-not-allowed"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 🔥 STAFF CODE FIELD IN EDIT MODAL - SHOWS WHEN SALARY */}
            {renderStaffCodeField(editExpense, true, false)}

            {/* 🔥 VOUCHER NO FIELD IN EDIT MODAL */}
            {renderVoucherField(editExpense, true, false)}

            <label className="text-sm font-medium block mb-1">Amount *</label>
            <input
              type="number"
              name="amount"
              value={editExpense.amount}
              onChange={handleEditChange}
              min="0"
              step="0.01"
              className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
              disabled={editLoading}
            />

            <label className="text-sm font-medium block mb-1">Description *</label>
            <textarea
              name="description"
              value={editExpense.description}
              onChange={handleEditChange}
              className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6 resize-none"
              disabled={editLoading}
            />

            <p className="text-sm font-semibold mb-3 text-blue-600">Current Files:</p>
            {editExpense.bill_file && typeof editExpense.bill_file === 'string' && (
              <div className="flex justify-between items-center bg-green-50 p-3 rounded-md border border-green-200 mb-3">
                <span className="text-sm text-green-800">
                  📄 Current Bill: <a href={`${API_BASE_URL}${editExpense.bill_file}`} target="_blank" className="underline">View</a>
                </span>
              </div>
            )}
            {editExpense.voucher_file && typeof editExpense.voucher_file === 'string' && (
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md border border-blue-200 mb-6">
                <span className="text-sm text-blue-800">
                  📜 Current Voucher: <a href={`${API_BASE_URL}${editExpense.voucher_file}`} target="_blank" className="underline">View</a>
                </span>
                {editExpense.voucher_no && <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{editExpense.voucher_no}</span>}
              </div>
            )}

            <p className="text-sm font-semibold mb-3 text-gray-700">Update Files (Optional):</p>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Replace with new Bill</label>
                <input
                  type="file"
                  name="bill_file"
                  accept="image/*,application/pdf"
                  onChange={handleEditChange}
                  className="w-full border-b-2 border-dotted border-black p-2 text-sm"
                  disabled={editLoading}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">OR Replace with new Voucher</label>
                <input
                  type="file"
                  name="voucher_file"
                  accept="image/*,application/pdf"
                  onChange={handleEditChange}
                  className="w-full border-b-2 border-dotted border-black p-2 text-sm"
                  disabled={editLoading}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={editLoading}
                className="flex-1 bg-gray-500 text-white py-3 cursor-pointer rounded-xl hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="flex-1 bg-gradient-to-r from-green-600 cursor-pointer to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition font-bold shadow-lg"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 TOAST */}
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

export default Expenses;
