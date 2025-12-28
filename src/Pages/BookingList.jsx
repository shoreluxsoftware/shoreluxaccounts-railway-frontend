import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Edit, Trash2, Loader, AlertCircle, CheckCircle, X, FileText, Save, Shield, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

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

// 🔥 UPDATED PDF - NOW INCLUDES INVOICE NUMBER & GST
const generateBillPDF = (booking) => {
  const doc = new jsPDF();
 
  // 🔥 LOAD LOGO FIRST (async)
  const generateWithLogo = async () => {
    try {
      const response = await fetch('/logo.png');
      const blob = await response.blob();
      const reader = new FileReader();
     
      return new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Logo fetch failed:', error);
      return null;
    }
  };

  generateWithLogo().then((logoData) => {
    if (logoData) {
      doc.addImage(logoData, "PNG", 20, 10, 30, 25);
      doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.text('SHORELUX HOTELS', 60, 22);
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); 
      doc.text('Beach Resort - Kovalam, Trivandrum', 60, 30);
      doc.text('info@shoreluxbeachresort.com  ||  +91 98953 87828', 60, 37);
    } else {
      doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text('SHORELUX HOTELS', 105, 20, { align: 'center' });
      doc.setFontSize(12); doc.setFont("helvetica", "italic");
      doc.text('Beach Resort - Kovalam, Trivandrum', 105, 30, { align: 'center' });
      doc.text('info@shoreluxbeachresort.com  ||  +91 98953 87828', 105, 37, { align: 'center' });
    }

    doc.setLineWidth(1); doc.line(20, 45, 190, 45);
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.text('INVOICE / BILL', 105, 65, { align: 'center' });

    // 🔥 SINGLE COLUMN - PERFECTLY ALIGNED COLONS AT 60px
    doc.setFontSize(11);
    let startY = 85;
    
    const COLON_X = 60;
    const VALUE_X = 70;
    
    // Invoice Number 🔥 NEW
    doc.setFont("helvetica", "bold"); doc.text('Invoice No.', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); 
    doc.setFont("helvetica", "bold"); 
    doc.text(String(booking.invoice_no || 'N/A'), VALUE_X, startY);
    startY += 8;
    
    // Guest Name
    doc.setFont("helvetica", "bold"); doc.text('Guest Name', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(String(booking.guest_name || 'N/A'), VALUE_X, startY);
    startY += 8;
    
    // Phone
    doc.setFont("helvetica", "bold"); doc.text('Phone No.', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(String(booking.phone_number || 'N/A'), VALUE_X, startY);
    startY += 8;
    
    // Room
    doc.setFont("helvetica", "bold"); doc.text('Room No.', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(String(booking.room_no || 'N/A'), VALUE_X, startY);
    startY += 8;

    // ⭐ GSTIN Number
    doc.setFont("helvetica", "bold"); doc.text('GSTIN', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY);
    doc.text(String(booking.gstin || '32ABCDE1234F1Z5'), VALUE_X, startY); 
    startY += 8;

    // ⭐ GST Percentage 🔥 NEW
    doc.setFont("helvetica", "bold"); doc.text('GST Rate', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY);
    doc.text(String(booking.gst_percentage ? (booking.gst_percentage) + '%' : '0%'), VALUE_X, startY);
    startY += 8;

    // Check-in
    doc.setFont("helvetica", "bold"); doc.text('Check-in', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(formatDate(booking.checkin_date), VALUE_X, startY);
    startY += 8;
    
    // Check-out
    doc.setFont("helvetica", "bold"); doc.text('Check-out', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(formatDate(booking.checkout_date), VALUE_X, startY);
    startY += 8;
    
    // Generated Date
    doc.setFont("helvetica", "bold"); doc.text('Bill Generated', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY);
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), VALUE_X, startY);

    // 🔥 FINANCIAL SUMMARY
    startY += 25;
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('FINANCIAL SUMMARY', 20, startY);

    const price = Number(booking.booking_price || 0);
    const paid = Number(booking.paid_amount || 0);
    const pending = Number(booking.pending_amount || 0);

    startY += 20; doc.setFontSize(11);
    
    // Total Amount
    doc.setFont("helvetica", "bold"); doc.text('Total Amount', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(`${price.toLocaleString('en-IN')}`, VALUE_X, startY);
    startY += 8;
    
    // Paid
    doc.setFont("helvetica", "bold"); doc.setTextColor(0, 150, 0); doc.text('Paid', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(`${paid.toLocaleString('en-IN')}`, VALUE_X, startY);
    startY += 8;
    
    // Pending
    doc.setTextColor(255, 0, 0); doc.text('Pending', 20, startY);
    doc.setFont("helvetica", "normal"); doc.text(':', COLON_X, startY); doc.text(`${pending.toLocaleString('en-IN')}`, VALUE_X, startY);
    startY += 8;
    
    doc.setLineWidth(2); doc.line(20, startY + 2, 140, startY + 2);
    
    startY += 15;
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(`AMOUNT DUE: ${pending.toLocaleString('en-IN')}`, 20, startY);
    
    // Footer
    doc.setTextColor(0, 0, 0); doc.setFontSize(11);
    doc.setLineWidth(1); doc.line(20, startY + 20, 190, startY + 20);
    doc.text('Thank you for choosing ShoreLux Hotels!', 105, startY + 35, { align: 'center' });
    doc.text('We look forward to serving you again.', 105, startY + 42, { align: 'center' });

    doc.save(`ShoreLux_Bill_${booking.id || 'BOOKING'}.pdf`);
  });
};

// 🔥 EXCEL EXPORT FUNCTION
const exportToExcel = (filteredBookings, showToast) => {
  try {
    const exportData = filteredBookings.map(booking => ({
      'Invoice #': booking.invoice_no || 'N/A',
      'Guest Name': booking.guest_name || 'N/A',
      'Phone': booking.phone_number || 'N/A',
      'Room No': booking.room_no || 'N/A',
      'GST %': booking.gst_percentage ? (booking.gst_percentage) + '%' : '0%',
      'Check In': formatDate(booking.checkin_date),
      'Check Out': formatDate(booking.checkout_date),
      'Price (₹)': Number(booking.booking_price || 0).toLocaleString('en-IN'),
      'Paid (₹)': Number(booking.paid_amount || 0).toLocaleString('en-IN'),
      'Pending (₹)': Number(booking.pending_amount || 0).toLocaleString('en-IN'),
      'Booking Date': formatDate(booking.booking_date),
      // 'ID': booking.id
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    
    // Auto-fit columns
    const colWidths = exportData[0] ? Object.keys(exportData[0]).map(() => ({ wch: 15 })) : [];
    ws['!cols'] = colWidths;

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `ShoreLux_Bookings_${today}.xlsx`);
    showToast("Excel exported successfully!", 'success');
  } catch (error) {
    console.error("Excel export error:", error);
    showToast("Failed to export Excel", 'error');
  }
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, bookingName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Booking?</h3>
              <p className="text-sm text-gray-600">
                This will permanently delete booking for <strong>"{bookingName}"</strong>. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 flex justify-end gap-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition font-medium flex items-center gap-2">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingList = ({ onViewDetails = () => {} }) => {
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('booking_date_desc');
  const [deleteModal, setDeleteModal] = useState({ open: false, bookingId: null, guestName: "" });
  const [editModal, setEditModal] = useState({ open: false, booking: null });
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ paid_amount: '', pending_amount: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [pendingBooking, setPendingBooking] = useState(null);
  
  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/list-bookings`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch bookings");
      setBookings(result.data || []);
    } catch (err) {
      console.error("Fetch bookings error:", err);
      showToast(err.message || "Failed to load bookings", 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // 🔥 OTP Functions
  const requestOtp = async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-management/request-otp`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verification_type: 'booking_edit',
          object_id: bookingId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to request OTP");
      showToast("OTP sent to admin email", 'success');
    } catch (err) {
      console.error("Request OTP error:", err);
      showToast(err.message || "Failed to send OTP", 'error');
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return;
    
    setOtpLoading(true);
    setOtpError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin-management/verify-otp`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp: otp.trim(),
          verification_type: 'booking_edit',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invalid OTP");
      
      showToast("OTP verified successfully!", 'success');
      setOtpModalVisible(false);
      setOtp('');
      
      // Proceed with edit
      if (pendingBooking) {
        openEditModal(pendingBooking);
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setOtpError(err.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const openOtpModal = (booking) => {
    setPendingBooking(booking);
    requestOtp(booking.id);
    setOtpModalVisible(true);
    setOtp('');
    setOtpError('');
  };

  const cancelOtpEdit = () => {
    setOtpModalVisible(false);
    setOtp('');
    setOtpError('');
    setPendingBooking(null);
  };

  const handleUpdateBooking = async (bookingId) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/update-booking/${bookingId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paid_amount: Number(editForm.paid_amount),
          pending_amount: Number(editForm.pending_amount),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update booking");
      showToast("Booking updated successfully!", 'success');
      setEditModal({ open: false, booking: null });
      setEditForm({ paid_amount: '', pending_amount: '' });
      await fetchBookings();
    } catch (err) {
      console.error("Update error:", err);
      showToast(err.message || "Failed to update booking", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const { bookingId } = deleteModal;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/delete-booking/${bookingId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete booking");
      showToast("Booking deleted successfully!", 'success');
      setDeleteModal({ open: false, bookingId: null, guestName: "" });
      await fetchBookings();
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to delete booking", 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    let result = [...bookings];
    
    if (searchQuery) {
      result = result.filter(booking =>
        booking.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.phone_number?.includes(searchQuery) ||
        booking.room_no?.includes(searchQuery) ||
        booking.invoice_no?.includes(searchQuery) ||
        String(booking.id || '').includes(searchQuery)
      );
    }
    
    result.sort((a, b) => {
      switch (sortOption) {
        case 'guestName_asc': 
          return (a.guest_name || '').localeCompare(b.guest_name || '');
        case 'booking_date_asc': 
          return new Date(a.booking_date || 0) - new Date(b.booking_date || 0);
        case 'booking_date_desc': 
          return new Date(b.booking_date || 0) - new Date(a.booking_date || 0);
        case 'pending_amount_desc': 
          return (Number(b.pending_amount) || 0) - (Number(a.pending_amount) || 0);
        default: 
          return new Date(b.booking_date || 0) - new Date(a.booking_date || 0);
      }
    });
    
    return result;
  }, [bookings, searchQuery, sortOption]);

  const openEditModal = (booking) => {
    setEditForm({
      paid_amount: booking.paid_amount || '',
      pending_amount: booking.pending_amount || ''
    });
    setEditModal({ open: true, booking });
  };

  const openDeleteModal = (booking) => {
    setDeleteModal({
      open: true,
      bookingId: booking.id,
      guestName: booking.guest_name || ''
    });
  };

  return (
    <div className="bg-[#F1F2F4] px-6 py-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Booking List Overview</h2>

        {toast && (
          <ToastMessage 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Search and Sort + Excel Export */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-300 gap-4">
          <div className="relative w-full lg:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Guest, Phone, Room, Invoice, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={loading}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="booking_date_desc">Booking Date (Newest)</option>
                <option value="booking_date_asc">Booking Date (Oldest)</option>
                <option value="guestName_asc">Guest Name (A-Z)</option>
                <option value="pending_amount_desc">Pending (High-Low)</option>
              </select>
            </div>
            <button
              onClick={() => exportToExcel(filteredAndSortedBookings, showToast)}
              disabled={loading || filteredAndSortedBookings.length === 0}
              className="flex items-center gap-2 px-4 py-2 cursor-pointer bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 shadow-md transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to Excel"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin h-10 w-10 text-blue-600" />
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gradient-to-r from-gray-900 to-black text-white">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Room No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">GST</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Pending</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Booking Date</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedBookings.length > 0 ? (
                    filteredAndSortedBookings.map((booking, index) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-purple-600 bg-purple-50">
                          {booking.invoice_no || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.guest_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{booking.phone_number || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold text-blue-600">{booking.room_no}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            booking.gst_percentage 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {booking.gst_percentage ? (booking.gst_percentage) + '%' : '0%'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">{formatDate(booking.checkin_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-700 font-medium">{formatDate(booking.checkout_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                          ₹{Number(booking.booking_price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                          ₹{Number(booking.paid_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                          ₹{Number(booking.pending_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatDate(booking.booking_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                          <div className="flex justify-center items-center gap-2">
                            {/* 🔥 OTP PROTECTED EDIT BUTTON */}
                            <button
                              onClick={() => openOtpModal(booking)}
                              title="Verify OTP to Edit Amounts"
                              className={`px-3 py-1 rounded text-xs cursor-pointer font-medium transition-all flex items-center gap-1 ${
                                loading 
                                  ? "bg-gray-400 text-gray-700 cursor-not-allowed opacity-70" 
                                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md"
                              }`}
                              disabled={loading}
                            >
                              <Shield size={12} className="flex-shrink-0" />
                              {loading ? "Loading" : "Edit"}
                            </button>

                            {/* 🔥 DOWNLOAD BUTTON */}
                            <button
                              onClick={() => generateBillPDF(booking)}
                              title="Generate PDF Bill"
                              className={`px-3 py-1 rounded text-xs cursor-pointer font-medium transition-all flex items-center gap-1 ${
                                loading 
                                  ? "bg-gray-400 text-gray-700 cursor-not-allowed opacity-70" 
                                  : "bg-green-600 text-white hover:bg-green-700 shadow-md"
                              }`}
                              disabled={loading}
                            >
                              <FileText size={12} />
                              {loading ? "Loading" : "Bill"}
                            </button>

                            <button
                              onClick={() => openDeleteModal(booking)}
                              title="Delete Booking"
                              className="text-red-600 hover:text-red-900 cursor-pointer p-2 rounded-lg hover:bg-red-50 transition-all"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12" className="text-center py-12 text-gray-500">
                        No bookings found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 🔥 OTP MODAL */}
        {otpModalVisible && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-[1000]">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
              <h3 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Verify Edit
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Enter OTP sent to admin number (expires in 10 min)
                <br />
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                  Booking ID: {pendingBooking?.id}
                </span>
              </p>
              {otpError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="inline mr-2 text-red-500" />
                  <span className="text-sm text-red-700">{otpError}</span>
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
                  onClick={cancelOtpEdit}
                  className="px-8 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
                  disabled={otpLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={verifyOtp}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all text-sm font-bold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={otpLoading || !otp.trim()}
                >
                  {otpLoading ? (
                    <Loader className="animate-spin w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/60 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Edit Booking Amounts</h3>
                <p className="text-sm text-gray-600">
                  Update paid and pending amounts for <strong>{editModal.booking?.guest_name}</strong>
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.paid_amount}
                    onChange={(e) => setEditForm({...editForm, paid_amount: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pending Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.pending_amount}
                    onChange={(e) => setEditForm({...editForm, pending_amount: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div className="p-6 pt-0 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditModal({ open: false, booking: null });
                    setEditForm({ paid_amount: '', pending_amount: '' });
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateBooking(editModal.booking.id)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader className="animate-spin h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        <DeleteConfirmModal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, bookingId: null, guestName: "" })}
          onConfirm={handleDeleteConfirm}
          bookingName={deleteModal.guestName}
        />
      </div>
    </div>
  );
};

export default BookingList;
