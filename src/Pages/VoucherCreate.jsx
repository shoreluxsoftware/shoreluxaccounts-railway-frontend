import React, { useState, useEffect, useCallback } from "react";
import { Search, X, AlertCircle, CheckCircle } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// 🔥 CUSTOM TOAST COMPONENT
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

const VoucherCreate = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("");
  
  const [form, setForm] = useState({
    voucher_no: "",
    date: new Date().toISOString().slice(0, 10),
    paid_to: "",
    amount: "",
    being: "",
    paid_by: "Cash",
    bank_details: "",
    online_payment_mode: "",
    authorized_by: "",
    receiver_signature_name: "",
    receiver_signature: "",
  });

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  const transformVoucherData = (data) => ({
    ...data,
    paid_to: data.paid_to || "",
    paid_by: data.paid_by || "Cash",
    bank_details: data.bank_details || "",
    online_payment_mode: data.online_payment_mode || "",
    authorized_by: data.authorized_by || "",
    receiver_signature_name: data.receiver_signature_name || "",
    receiver_signature: data.receiver_signature || "",
  });

// 🔥 ENHANCED HEADER WITH FULL COMPANY DETAILS
const downloadVoucherPDF = (voucher) => {
  setLoadingPDF(true);
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Helper function to generate logo (you'll need to implement this)
    const generateWithLogo = async () => {
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    generateWithLogo().then((logoData) => {
      if (logoData) {
        // ✅ WITH LOGO - LEFT ALIGNED
        doc.addImage(logoData, "PNG", 20, 10, 30, 25);
        doc.setFontSize(20); 
        doc.setFont("helvetica", "bold"); 
        doc.text('SHORELUX HOTELS', 60, 22);
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal"); 
        doc.text('Beach Resort - Kovalam, Trivandrum', 60, 30);
        doc.text('info@shoreluxbeachresort.com  ||  +91 9656500755', 60, 37);
        
        // Header underline
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);
        
        let yPos = 55;
        
        // Rest of content...
        renderVoucherContent(doc, voucher, yPos);
        
      } else {
        // ✅ NO LOGO - CENTERED
        doc.setFontSize(24); 
        doc.setFont("helvetica", "bold"); 
        doc.text('SHORELUX HOTELS', 105, 20, { align: 'center' });
        doc.setFontSize(12); 
        doc.setFont("helvetica", "italic");
        doc.text('Beach Resort - Kovalam, Trivandrum', 105, 30, { align: 'center' });
        doc.text('info@shoreluxbeachresort.com  ||  +91 9656500755', 105, 37, { align: 'center' });
        
        // Header underline
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);
        
        let yPos = 55;
        
        // Rest of content...
        renderVoucherContent(doc, voucher, yPos);
      }
      
      doc.save(`Voucher_${voucher.voucher_no}.pdf`);
      showToast("✅ Voucher PDF generated successfully!", "success");
      setLoadingPDF(false);
    });
    
  } catch (err) {
    showToast("❌ Failed to generate PDF", "error");
    setLoadingPDF(false);
  }
};

// 🔥 HELPER FUNCTION FOR VOUCHER CONTENT
const renderVoucherContent = (doc, voucher, startY) => {
  let yPos = startY;

  // Helper function for clean fields
  const addField = (label, value, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label + ":", 15, y);
    
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", 60, y, { maxWidth: 130 });
  };

  // Format amount
  const amountNum = Number(voucher.amount || 0);
  const formattedAmount = amountNum.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Payment method with details
  let paymentMethod = voucher.paid_by;
  if (voucher.paid_by === "Cheque" && voucher.bank_details) {
    paymentMethod += ` (${voucher.bank_details})`;
  } else if (voucher.paid_by === "Online" && voucher.online_payment_mode) {
    paymentMethod += ` (${voucher.online_payment_mode})`;
  }

  // All fields
  addField("Voucher No.", voucher.voucher_no, yPos); yPos += 10;
  addField("Date", voucher.date, yPos); yPos += 10;
  addField("Paid To", voucher.paid_to, yPos); yPos += 10;
  addField("Amount", `${formattedAmount}`, yPos); yPos += 10;
  addField("Description", voucher.being, yPos); yPos += 12;
  addField("Payment Method", paymentMethod, yPos); 
  yPos += 12;

  // Signatures section
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Authorized By:", 20, yPos);
  doc.text("Receiver's Name:", 110, yPos);
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(voucher.authorized_by || "_______________________", 20, yPos);
  doc.text(voucher.receiver_signature_name || "_______________________", 110, yPos);
  
  yPos += 6;
  doc.setFontSize(10);
  doc.text("Signature", 25, yPos);
  doc.text("Signature", 120, yPos);

  // Footer text only
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("© Shorelux Kovalam | Confidential Document", 105, 202, { align: "center" });
};



  const fetchNextVoucherNo = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/staff-management/generate-payment-voucher`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (res.ok && data.next_voucher_no) {
        setForm((prev) => ({ ...prev, voucher_no: data.next_voucher_no }));
      }
    } catch {
      showToast("Error fetching next voucher number", 'error');
    }
  };

  const fetchVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/staff-management/list-payment-vouchers`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (res.ok && data.data) {
        setVouchers(data.data.map(transformVoucherData));
      }
    } catch {
      showToast("Error fetching vouchers", 'error');
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    fetchNextVoucherNo();
    fetchVouchers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let newForm = { ...form, [name]: value };
    
    if (name === "paid_by") {
      newForm.bank_details = "";
      newForm.online_payment_mode = "";
    }
    
    setForm(newForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingCreate(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/staff-management/create-payment-voucher`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();

      if (res.ok) {
        showToast("Voucher created successfully!", 'success');
        fetchVouchers();
        fetchNextVoucherNo();
        setForm((prev) => ({
          ...prev,
          paid_to: "",
          amount: "",
          being: "",
          paid_by: "Cash",
          bank_details: "",
          online_payment_mode: "",
          authorized_by: "",
          receiver_signature_name: "",
          receiver_signature: "",
          date: new Date().toISOString().slice(0, 10),
        }));
      } else {
        if (data.bank_details) {
          showToast(data.bank_details[0] || "Bank details required for Cheque", 'error');
        } else if (data.online_payment_mode) {
          showToast(data.online_payment_mode[0] || "Online payment mode required", 'error');
        } else {
          showToast(data.detail || "Failed to create voucher", 'error');
        }
      }
    } catch (err) {
      showToast("Error creating voucher", 'error');
    } finally {
      setLoadingCreate(false);
    }
  };

  const filteredVouchers = vouchers
    .filter((voucher) =>
      voucher.paid_to?.toLowerCase().includes(search.toLowerCase()) ||
      voucher.being?.toLowerCase().includes(search.toLowerCase()) ||
      voucher.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
      voucher.receiver_signature_name?.toLowerCase().includes(search.toLowerCase()) ||
      voucher.online_payment_mode?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "date_newest") return new Date(b.date) - new Date(a.date);
      if (sortOption === "date_oldest") return new Date(a.date) - new Date(b.date);
      if (sortOption === "amount_high") return Number(b.amount) - Number(a.amount);
      if (sortOption === "amount_low") return Number(a.amount) - Number(b.amount);
      return 0;
    });

  return (
    <div className="bg-[#F1F2F4] min-h-screen py-10 px-5 flex flex-col lg:flex-row gap-8">
      <form
        onSubmit={handleSubmit}
        className="w-full lg:w-[500px] bg-white border border-gray-300 rounded-xl p-8 shadow-md"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Payment Voucher
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 rounded flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}

        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 text-sm font-medium">
              Voucher No. (Auto Generated) *
            </label>
            <input
              className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-transparent"
              type="text"
              name="voucher_no"
              value={form.voucher_no}
              readOnly
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 text-sm font-medium">Date</label>
            <input
              className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-gray-100 cursor-not-allowed"
              type="date"
              name="date"
              value={form.date}
              disabled
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Paid To</label>
          <input
            className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-transparent"
            type="text"
            name="paid_to"
            value={form.paid_to}
            onChange={handleChange}
            placeholder="Receiver Name"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">
            Amount (in ₹)
          </label>
          <input
            className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-transparent"
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">
            Being (Description)
          </label>
          <textarea
            className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-transparent resize-none"
            name="being"
            rows={2}
            value={form.being}
            onChange={handleChange}
            placeholder="Describe purpose of payment"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">Payment Method *</label>
          <select
            className="w-full border-b-2 border-dotted border-black py-2 px-3 bg-transparent text-sm"
            name="paid_by"
            value={form.paid_by}
            onChange={handleChange}
          >
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Online">Online Payment</option>
          </select>

          {form.paid_by === "Cheque" && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="block mb-1 text-xs font-medium text-gray-600">Bank Details *</label>
              <input
                className="w-full border-b-2 border-dotted border-black py-1 px-2 text-sm bg-transparent"
                type="text"
                name="bank_details"
                value={form.bank_details}
                onChange={handleChange}
                placeholder="Bank Name / Cheque No."
              />
            </div>
          )}

          {form.paid_by === "Online" && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="block mb-1 text-xs font-medium text-gray-600">Payment Mode *</label>
              <input
                className="w-full border-b-2 border-dotted border-black py-1 px-2 text-sm bg-transparent"
                type="text"
                name="online_payment_mode"
                value={form.online_payment_mode}
                onChange={handleChange}
                placeholder="GPay / PhonePe / UPI ID / etc."
              />
            </div>
          )}
        </div>

        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 text-sm font-medium">
              Authorized By
            </label>
            <input
              className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-transparent"
              name="authorized_by"
              value={form.authorized_by}
              onChange={handleChange}
              placeholder="Authorizing person name"
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 text-sm font-medium">
              Receiver Name
            </label>
            <input
              className="w-full border-b-2 border-dotted border-black p-2 text-sm bg-transparent"
              name="receiver_signature_name"
              value={form.receiver_signature_name}
              onChange={handleChange}
              placeholder="Receiver's full name"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium">
            Receiver's Signature (Optional)
          </label>
          <input
            className="w-full border-b-2 border-dotted border-gray-400 p-2 text-sm bg-transparent"
            name="receiver_signature"
            value={form.receiver_signature}
            onChange={handleChange}
            placeholder="Signature or remarks"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-md cursor-pointer bg-black text-white hover:bg-gray-900 mt-6 disabled:opacity-50 font-semibold text-lg"
          disabled={loadingCreate}
        >
          {loadingCreate ? "Creating..." : "Create Voucher"}
        </button>
      </form>

      <div className="flex-1 w-full">
        <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-3">
            <div className="relative w-full sm:w-1/2">
              <input
                type="text"
                placeholder="Search paid to, receiver, description, voucher no, payment mode..."
                className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>
            
            <select
              className="border border-gray-400 rounded-md px-3 py-2 w-full sm:w-auto"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="">Sort by</option>
              <option value="date_newest">Date (Newest)</option>
              <option value="date_oldest">Date (Oldest)</option>
              <option value="amount_high">Amount (High → Low)</option>
              <option value="amount_low">Amount (Low → High)</option>
            </select>
          </div>

          <h2 className="text-lg font-semibold mb-4 text-center">
            Created Vouchers ({filteredVouchers.length})
          </h2>
          
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-black text-white sticky top-0">
                <tr>
                  <th className="border p-2">No.</th>
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Paid To</th>
                  <th className="border p-2">Amount (₹)</th>
                  <th className="border p-2">Receiver</th>
                  <th className="border p-2">Payment Method</th>
                  <th className="border p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingVouchers ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center font-semibold text-blue-500">
                      Loading vouchers...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500">
                      {search ? "No matching vouchers" : "No vouchers created yet"}
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => {
                    let paymentDisplay = v.paid_by;
                    if (v.paid_by === "Cheque" && v.bank_details) {
                      paymentDisplay += ` (${v.bank_details})`;
                    } else if (v.paid_by === "Online" && v.online_payment_mode) {
                      paymentDisplay += ` (${v.online_payment_mode})`;
                    }
                    
                    return (
                      <tr key={v.id} className="hover:bg-gray-50 border-b">
                        <td className="border p-2 font-mono">{v.voucher_no}</td>
                        <td className="border p-2">{v.date}</td>
                        <td className="border p-2 max-w-xs truncate">{v.paid_to}</td>
                        <td className="border p-2 font-semibold">
                          ₹{Number(v.amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="border p-2 max-w-xs truncate">
                          {v.receiver_signature_name || "-"}
                        </td>
                        <td className="border p-2 max-w-xs truncate" title={paymentDisplay}>
                          {paymentDisplay}
                        </td>
                        <td className="border p-2 whitespace-nowrap">
                          <button
                            onClick={() => downloadVoucherPDF(v)}
                            disabled={loadingPDF}
                            className="px-3 py-1 bg-blue-600 cursor-pointer text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition"
                          >
                            {loadingPDF ? "PDF..." : "Print PDF"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
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

export default VoucherCreate;
