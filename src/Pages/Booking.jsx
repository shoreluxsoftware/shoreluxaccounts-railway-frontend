import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Printer, Plus, Edit, Trash2, Loader, AlertCircle, CheckCircle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getFormattedCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString) =>
  !dateString
    ? "N/A"
    : new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

const ToastMessage = ({ message, type, onClose }) => {
  const isError = type === 'error';
  const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white flex items-center z-[99999999] transition-all duration-300 transform";
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
      <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full">
        <X size={16} />
      </button>
    </div>
  );
};

// 🔥 DELETE CONFIRMATION MODAL
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, typeName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Delete Booking Type?
              </h3>
              <p className="text-sm text-gray-600">
                This will permanently delete <strong>"{typeName}"</strong>. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition font-medium flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// 🔥 BOOKING TYPE MANAGEMENT - RIGHT SIDE (ADMIN ONLY)
const BookingTypeManagement = ({ bookingTypes, fetchBookingTypes, showToast, isAdmin }) => {
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");
  const [newTypeGst, setNewTypeGst] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editGst, setEditGst] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, typeId: null, typeName: "" });

  if (!isAdmin) {
    return (
      <div className="w-full bg-white shadow-md border border-gray-300 rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm">
          Booking category management is available only for Admin users
        </p>
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypePrice.trim() || !newTypeGst.trim()) {
      return showToast("Name, price, and GST percentage are required.", 'error');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/create-booking-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ 
          name: newTypeName.trim(),
          default_price: parseFloat(newTypePrice),
          gst_percentage: parseFloat(newTypeGst)
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create booking type.");
      }

      showToast("Booking type created successfully!", 'success');
      setNewTypeName("");
      setNewTypePrice("");
      setNewTypeGst("");
      await fetchBookingTypes();

    } catch (err) {
      console.error(err);
      showToast(err.message || "Error creating type.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPrice.trim() || !editGst.trim()) {
      return showToast("Name, price, and GST percentage are required.", 'error');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/update-booking-type/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ 
          name: editName.trim(),
          default_price: parseFloat(editPrice),
          gst_percentage: parseFloat(editGst)
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update booking type.");
      }

      showToast("Booking type updated successfully!", 'success');
      setEditId(null);
      setEditName("");
      setEditPrice("");
      setEditGst("");
      await fetchBookingTypes();

    } catch (err) {
      console.error(err);
      showToast(err.message || "Error updating type.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const { typeId } = deleteModal;
    setDeleteLoadingId(typeId);
    setDeleteModal({ open: false, typeId: null, typeName: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/delete-booking-type/${typeId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete booking type.");
      }

      showToast("Booking type deleted successfully!", 'success');
      await fetchBookingTypes();

    } catch (err) {
      console.error(err);
      showToast(err.message || "Error deleting type.", 'error');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const startEdit = (type) => {
    setEditId(type.id);
    setEditName(type.name);
    setEditPrice(type.default_price || "");
    setEditGst(type.gst_percentage ? (type.gst_percentage * 100).toFixed(2) : "");
  };

  const openDeleteModal = (type) => {
    setDeleteModal({
      open: true,
      typeId: type.id,
      typeName: type.name
    });
  };

  return (
    <>
      <div className="w-full max-w-md bg-white shadow-md border border-gray-300 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6 border-b pb-2">
          Manage Booking Categories 🏷️
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            placeholder="Category Name"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <input
            type="number"
            placeholder="Price (₹)"
            value={newTypePrice}
            onChange={(e) => setNewTypePrice(e.target.value)}
            min="0"
            step="0.01"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <input
            type="number"
            placeholder="GST %"
            value={newTypeGst}
            onChange={(e) => setNewTypeGst(e.target.value)}
            min="0"
            max="100"
            step="0.01"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="md:col-span-3 flex items-center cursor-pointer justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
            disabled={loading}
          >
            {loading ? <Loader size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
            Add
          </button>
        </form>

        <div className="max-h-60 overflow-y-auto">
          {bookingTypes.length === 0 ? (
            <p className="text-gray-500 text-sm">No custom categories found. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {bookingTypes.map((type) => (
<li
  key={type.id}
  className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
>
{editId === type.id ? (
  <form
    onSubmit={handleUpdate}
    className="w-full bg-white border border-blue-200 rounded-lg p-4 shadow-sm"
  >
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end">
      
      {/* Category Name */}
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600 mb-1">
          Category Name
        </label>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-10 border border-blue-300 rounded-md px-3 text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Price */}
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600 mb-1">
          Price (₹)
        </label>
        <input
          type="number"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          min="0"
          step="0.01"
          className="h-10 border border-blue-300 rounded-md px-3 text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* GST */}
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600 mb-1">
          GST %
        </label>
        <input
          type="number"
          value={editGst}
          onChange={(e) => setEditGst(e.target.value)}
          min="0"
          max="100"
          step="0.01"
          className="h-10 border border-blue-300 rounded-md px-3 text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 md:justify-end">
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          Save
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setEditId(null);
            setEditName("");
            setEditPrice("");
            setEditGst("");
          }}
          className="h-10 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </form>
) : (

    <div className="flex items-center justify-between w-full">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-900">
          {type.name}
        </span>

        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          ₹{Number(type.default_price).toLocaleString("en-IN")}
        </span>

        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          {type.gst_percentage * 100}%
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => startEdit(type)}
          disabled={loading || deleteLoadingId}
          className="text-blue-600 hover:bg-blue-50 p-2 rounded"
        >
          <Edit size={16} />
        </button>

        <button
          onClick={() => openDeleteModal(type)}
          disabled={loading || deleteLoadingId === type.id}
          className="text-red-600 hover:bg-red-50 p-2 rounded"
        >
          {deleteLoadingId === type.id ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
    </div>
  )}
</li>

              ))}
            </ul>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, typeId: null, typeName: "" })}
        onConfirm={handleDeleteConfirm}
        typeName={deleteModal.typeName}
      />
    </>
  );
};

// 🔥 MAIN COMPONENT WITH CHECKIN/CHECKOUT TIME FIELDS
const Booking = () => {
  const [mockData, setMockData] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const initialCurrentDate = getFormattedCurrentDate();

  const [form, setForm] = useState({
    guestName: "",
    phoneNumber: "",
    booking_type_id: "",
    roomNo: "",
    checkInDate: "",
    checkInTime: "12:00", // 🔥 DEFAULT CHECKIN TIME
    checkOutDate: "",
    checkOutTime: "11:00", // 🔥 DEFAULT CHECKOUT TIME
    paidAmount: "",
    pendingAmount: "",
    bookingPrice: "",
    bookingDate: initialCurrentDate,
  });

  const [bookingTypes, setBookingTypes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);
  const [toast, setToast] = useState(null);
  
  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");
    setIsAdmin(role === "ADMIN");
  }, []);

  const fetchBookingTypes = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/list-booking-types`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || "Failed to fetch types");

      const types = result.data || [];
      setBookingTypes(types);
      
    } catch (err) {
      console.error("Fetch booking types error:", err);
    }
  }, []);

  const fetchInvoiceNumber = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/generate-invoice-number`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (response.ok) {
        setInvoiceNumber(result.next_invoice_no);
      }
    } catch (err) {
      console.error("Fetch invoice number error:", err);
    }
  }, []);

  useEffect(() => {
    fetchBookingTypes();
    fetchInvoiceNumber();
  }, [fetchBookingTypes, fetchInvoiceNumber]);

  const handleBookingTypeChange = (e) => {
    const selectedId = e.target.value;
    const selectedType = bookingTypes.find(type => type.id.toString() === selectedId);
    
    setForm(prev => ({
      ...prev,
      booking_type_id: selectedId,
      bookingPrice: selectedType ? selectedType.default_price.toString() : "",
      paidAmount: "",
      pendingAmount: ""
    }));
  };

  // 🔥 COMBINE DATE + TIME FOR DATETIME FIELDS
  const getFullCheckInDateTime = () => {
    if (!form.checkInDate || !form.checkInTime) return "";
    return `${form.checkInDate}T${form.checkInTime}`;
  };

  const getFullCheckOutDateTime = () => {
    if (!form.checkOutDate || !form.checkOutTime) return "";
    return `${form.checkOutDate}T${form.checkOutTime}`;
  };

  const validateForm = () => {
    if (
      !form.guestName.trim() ||
      !form.roomNo.trim() ||
      !form.checkInDate ||
      !form.checkInTime ||
      !form.checkOutDate ||
      !form.checkOutTime ||
      !form.bookingPrice ||
      form.paidAmount === "" ||
      form.pendingAmount === "" ||
      !form.booking_type_id
    ) {
      setError("Please fill all required fields and select a Booking Type.");
      return false;
    }
    
    const price = parseFloat(form.bookingPrice);
    const paid = parseFloat(form.paidAmount);
    const pending = parseFloat(form.pendingAmount);

    if (Math.abs(price - (paid + pending)) > 0.01) {
      setError("Total Price must equal Paid Amount + Pending Amount.");
      return false;
    }

    const checkin = new Date(getFullCheckInDateTime());
    const checkout = new Date(getFullCheckOutDateTime());
    if (checkout <= checkin) {
      setError("Check-out must be after check-in.");
      return false;
    }
    
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newForm = { ...form, [name]: value };

    if (name === "paidAmount") {
      const price = parseFloat(form.bookingPrice) || 0;
      const paid = parseFloat(value) || 0;
      newForm.pendingAmount = Math.max(0, price - paid).toFixed(2);
    }

    setForm(newForm);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    
    setLoadingForm(true);

    const selectedType = bookingTypes.find(t => t.id === parseInt(form.booking_type_id, 10));

    const apiData = {
      guest_name: form.guestName,
      phone_number: form.phoneNumber || null,
      booking_type: parseInt(form.booking_type_id, 10),
      room_no: form.roomNo,
      checkin_date: getFullCheckInDateTime(),  // 🔥 DATETIME WITH TIME
      checkout_date: getFullCheckOutDateTime(), // 🔥 DATETIME WITH TIME
      paid_amount: parseFloat(form.paidAmount),
      pending_amount: parseFloat(form.pendingAmount),
      booking_price: parseFloat(form.bookingPrice),
      booking_date: form.bookingDate,
      invoice_number: invoiceNumber,
      gst_percentage: selectedType?.gst_percentage || 0,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/create-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();
      
      if (response.ok) {
        showToast(`Booking ${result.data.id} (Invoice: ${invoiceNumber}) added successfully!`, 'success');
        
        await fetchInvoiceNumber();
        
        setForm({
          guestName: "",
          phoneNumber: "",
          booking_type_id: "",
          roomNo: "",
          checkInDate: "",
          checkInTime: "12:00",
          checkOutDate: "",
          checkOutTime: "11:00",
          paidAmount: "",
          pendingAmount: "",
          bookingPrice: "",
          bookingDate: getFormattedCurrentDate(),
        });

        setMockData({
          ...apiData,
          id: result.data.id,
          phoneNumber: form.phoneNumber,
          bookingType: selectedType?.name || "N/A",
          gst_percentage: selectedType?.gst_percentage || 0
        });
      } else {
        const errMessage = result.detail || result.non_field_errors?.[0] || JSON.stringify(result);
        throw new Error(errMessage);
      }
    } catch (err) {
      console.error("Booking submission error:", err);
      setError(`Submission failed: ${err.message}`);
      showToast(err.message || "Failed to add booking.", 'error');
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="bg-[#F1F2F4] px-6 py-8 min-h-screen flex flex-col lg:flex-row gap-6 justify-center items-start">
      {/* 🔥 LEFT SIDE: BOOKING FORM */}
      <div className="flex-1 max-w-2xl w-full order-2 lg:order-1">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md border border-gray-300 rounded-xl p-8 w-full"
        >
          <h2 className="text-2xl font-semibold mb-6">Add Booking</h2>
          
          {/* 🔥 INVOICE NUMBER DISPLAY */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Invoice Number</label>
            <input
              type="text"
              value={`#${invoiceNumber || 'Loading...'}`}
              readOnly
              className="
                w-full 
                border-b-2 border-dotted border-gray-500 
                px-0 py-1 
                text-sm 
                bg-gray-100 
                text-gray-700 
                cursor-not-allowed 
                font-semibold
                tracking-wide
              "
            />
          </div>
          
          {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">{error}</p>}
          {loadingForm && <p className="text-blue-600 text-sm mb-4 flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg"><Loader size={16} className="animate-spin mr-2" /> Submitting Booking...</p>}
          
          <div className="grid grid-cols-1 gap-y-8">
            <div>
              <label className="block mb-2 text-sm font-medium">Booking Date </label>
              <input
                name="bookingDate"
                type="date"
                value={form.bookingDate}
                readOnly
                className="w-full border-b-2 border-dotted border-gray-500 px-0 py-1 text-sm bg-transparent focus:outline-none bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Guest Name *</label>
                <input
                  name="guestName"
                  type="text"
                  value={form.guestName}
                  onChange={handleChange}
                  placeholder="Full name of guest"
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Phone Number</label>
                <input
                  name="phoneNumber"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full border-b-2 border-dotted border-gray-400 px-0 py-1 text-sm bg-transparent focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Room No. *</label>
                <input
                  name="roomNo"
                  type="text"
                  value={form.roomNo}
                  onChange={handleChange}
                  placeholder="Room Number"
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Booking Type *</label>
                <select
                  name="booking_type_id"
                  value={form.booking_type_id}
                  onChange={handleBookingTypeChange}
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent appearance-none cursor-pointer focus:outline-none"
                  disabled={loadingForm || bookingTypes.length === 0}
                >
                  {bookingTypes.length === 0 ? (
                    <option value="">
                      {isAdmin ? "No categories available - Add one on right" : "No categories available"}
                    </option>
                  ) : (
                    bookingTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} 
                        <span className="text-xs opacity-75 ml-2">(₹{Number(type.default_price).toLocaleString("en-IN")})</span>
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* 🔥 CHECK-IN DATE + TIME */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Check-in Date *</label>
                <input
                  type="date"
                  name="checkInDate"
                  value={form.checkInDate}
                  onChange={handleChange}
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent cursor-text focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Check-in Time *</label>
                <input
                  type="time"
                  name="checkInTime"
                  value={form.checkInTime}
                  onChange={handleChange}
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent cursor-text focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
            </div>

            {/* 🔥 CHECK-OUT DATE + TIME */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Check-out Date *</label>
                <input
                  type="date"
                  name="checkOutDate"
                  value={form.checkOutDate}
                  onChange={handleChange}
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent cursor-text focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Check-out Time *</label>
                <input
                  type="time"
                  name="checkOutTime"
                  value={form.checkOutTime}
                  onChange={handleChange}
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent cursor-text focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block mb-2 text-sm font-medium">
                  Booking Price (₹) <span className="text-xs text-gray-500">(Auto-filled)</span>
                </label>
                <input
                  type="number"
                  name="bookingPrice"
                  value={form.bookingPrice}
                  readOnly
                  className="w-full border-b-2 border-dotted border-green-500 px-0 py-1 text-sm bg-green-50 text-green-800 cursor-not-allowed focus:outline-none"
                  disabled={loadingForm}
                  title="Auto-filled from selected booking type"
                />
              </div>
              
              <div className="flex-1">
                <label className="block mb-2 text-sm font-medium">Paid Amount (₹) *</label>
                <input
                  type="number"
                  name="paidAmount"
                  value={form.paidAmount}
                  onChange={handleChange}
                  placeholder="Amount Paid"
                  min="0"
                  step="0.01"
                  className="w-full border-b-2 border-dotted border-black px-0 py-1 text-sm bg-transparent focus:outline-none"
                  disabled={loadingForm}
                />
              </div>
              <div className="flex-1">
                <label className="block mb-2 text-sm font-medium">Pending Amount (₹) *</label>
                <input
                  type="number"
                  name="pendingAmount"
                  value={form.pendingAmount}
                  readOnly
                  className="w-full border-b-2 border-dotted border-blue-500 px-0 py-1 text-sm bg-blue-50 text-blue-800 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4 mt-8 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 py-3 rounded-md bg-black text-white cursor-pointer hover:bg-gray-900 transition disabled:opacity-50 font-medium"
              disabled={loadingForm || bookingTypes.length === 0}
            >
              {loadingForm ? "Adding..." : "Add Booking"}
            </button>
          </div>
        </form>
      </div>

      {/* 🔥 RIGHT SIDE: CATEGORY MANAGEMENT - ADMIN ONLY */}
      <div className="w-full lg:w-96 order-1 lg:order-2 self-start">
        <BookingTypeManagement 
          bookingTypes={bookingTypes} 
          fetchBookingTypes={fetchBookingTypes}
          showToast={showToast}
          isAdmin={isAdmin}
        />
      </div>

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

export default Booking;
