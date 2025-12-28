import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// Match backend "type" field values
const incomeTypes = ["All", "Booking", "Sales Income", "Other Income"];

const IncomeReports = () => {
  const [allIncome, setAllIncome] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [openDetailsId, setOpenDetailsId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 🔥 NEW: Excel Export
  const exportExcel = () => {
    const wsData = [
      ["INCOME REPORT"],
      [`Type: ${selectedType}`],
      [`Date Range: ${dateFrom || "All"} to ${dateTo || "All"}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["ID", "Type", "Description", "Amount (₹)", "Date"]
    ];

    filteredData.forEach((row) => {
      wsData.push([
        row.id,
        row.sourceType,
        row.description,
        Number(row.amount || 0).toLocaleString("en-IN"),
        row.date
      ]);
    });

    // 🔥 Add totals
    wsData.push([]);
    wsData.push(["", "", "TOTAL INCOME", totalIncome.toLocaleString("en-IN"), ""]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 8 },   // ID
      { wch: 15 },  // Type
      { wch: 40 },  // Description
      { wch: 15 },  // Amount
      { wch: 12 }   // Date
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IncomeReport");
    XLSX.writeFile(wb, `IncomeReport_${selectedType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Excel exported successfully!");
  };

  // 🔥 NEW: PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INCOME REPORT", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Type: ${selectedType}`, 20, 35);
    doc.text(`Date: ${dateFrom || "All"} to ${dateTo || "All"}`, 20, 45);
    doc.text(`Total: ₹${totalIncome.toLocaleString("en-IN")}`, 20, 55);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65);

    doc.autoTable({
      startY: 75,
      head: [["ID", "Type", "Description", "Amount (₹)", "Date"]],
      body: filteredData.map((row) => [
        row.id,
        row.sourceType,
        row.description,
        Number(row.amount || 0).toLocaleString("en-IN"),
        row.date
      ]),
      theme: "grid",
      headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 10 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 20 },
        2: { cellWidth: 60 },
        3: { halign: "right", cellWidth: 25 },
        4: { cellWidth: 25 }
      }
    });

    doc.save(`IncomeReport_${selectedType}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("PDF exported successfully!");
  };

  // Fetch unified income
  useEffect(() => {
    const fetchIncome = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/staff-management/unified-income`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        const result = await res.json();

        const mapped =
          (result.data || []).map((item, idx) => ({
            id: idx + 1,
            backendId: item.id,
            sourceType: item.type,
            date: item.date,
            amount: Number(item.amount || 0),
            description: item.description || "",
            details: item.details || {},
          })) || [];

        setAllIncome(mapped);
        showToast(`Loaded ${mapped.length} income records`);
      } catch (err) {
        console.error("Fetch unified income error:", err);
        showToast(err.message || "Failed to load income data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchIncome();
  }, []);

  // Filter + search + sort
  const filteredData = useMemo(() => {
    let data = [...allIncome];

    if (selectedType !== "All") {
      data = data.filter((item) => item.sourceType === selectedType);
    }

    if (search.trim() !== "") {
      const lower = search.toLowerCase();
      data = data.filter((item) => {
        const idMatch = String(item.id || "").toLowerCase().includes(lower);
        const descMatch = String(item.description || "").toLowerCase().includes(lower);
        const typeMatch = String(item.sourceType || "").toLowerCase().includes(lower);
        const amountMatch = String(item.amount ?? "").toLowerCase().includes(lower);
        const detailsText = JSON.stringify(item.details || {}).toLowerCase();
        const detailsMatch = detailsText.includes(lower);
        return idMatch || descMatch || typeMatch || amountMatch || detailsMatch;
      });
    }

    let fromDate = null;
    let toDateVal = null;
    if (dateFrom) fromDate = new Date(dateFrom);
    if (dateTo) toDateVal = new Date(dateTo);
    if (fromDate) {
      data = data.filter((item) => new Date(item.date) >= fromDate);
    }
    if (toDateVal) {
      data = data.filter((item) => new Date(item.date) <= toDateVal);
    }

    data.sort((a, b) => {
      switch (sortOption) {
        case "date_newest":
          return new Date(b.date) - new Date(a.date);
        case "date_oldest":
          return new Date(a.date) - new Date(b.date);
        case "amount_low":
          return a.amount - b.amount;
        case "amount_high":
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

    return data;
  }, [allIncome, selectedType, search, dateFrom, dateTo, sortOption]);

  const totalIncome = useMemo(
    () => filteredData.reduce((acc, cur) => acc + (cur.amount || 0), 0),
    [filteredData]
  );

  const toggleDetails = (rowId) => {
    setOpenDetailsId((prev) => (prev === rowId ? null : rowId));
  };

  const renderDetails = (row) => {
    if (row.sourceType === "Booking") {
      const d = row.details || {};
      return (
        <div className="mt-2 text-xs text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-1">
          <div>Guest: {d.guest_name || "-"}</div>
          <div>Room: {d.room_no || "-"}</div>
          <div>Phone: {d.phone_number || "-"}</div>
          <div>Booking type: {d.booking_type || "-"}</div>
          <div>Check-in: {d.checkin_date || "-"}</div>
          <div>Check-out: {d.checkout_date || "-"}</div>
          <div>Paid amount: ₹ {Number(d.paid_amount || 0).toLocaleString()}</div>
          <div>Pending amount: ₹ {Number(d.pending_amount || 0).toLocaleString()}</div>
        </div>
      );
    }

    if (row.sourceType === "Sales Income") {
      const d = row.details || {};
      return (
        <div className="mt-2 text-xs text-gray-700">
          <div>Category: {d.category || "-"}</div>
        </div>
      );
    }

    if (row.sourceType === "Other Income") {
      const d = row.details || {};
      return (
        <div className="mt-2 text-xs text-gray-700">
          <div>Category: {d.category || "-"}</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-[#F1F2F4] p-6 min-h-screen max-w-full mx-auto rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Income Reports</h2>
        {toast && (
          <div
            className={`px-4 py-2 rounded text-white text-sm ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-xl font-semibold">
        Total Income: ₹ {totalIncome.toLocaleString()}
      </div>

      {/* Filters + Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4 items-end">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border border-gray-400 rounded-md p-2"
        >
          {incomeTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="border border-gray-400 rounded-md p-2 col-span-1 md:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-0.5">From date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-400 rounded-md p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-0.5">To date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-400 rounded-md p-2"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border border-gray-400 rounded-md p-2 flex-1"
          >
            <option value="">Sort</option>
            <option value="date_newest">Date (Newest → Oldest)</option>
            <option value="date_oldest">Date (Oldest → Newest)</option>
            <option value="amount_low">Amount (Low → High)</option>
            <option value="amount_high">Amount (High → Low)</option>
          </select>
          <button
            onClick={exportExcel}
            disabled={filteredData.length === 0 || loading}
            className="px-14 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
             Download as Excel
          </button>
          {/* <button
            onClick={exportPDF}
            disabled={filteredData.length === 0 || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            📄 PDF
          </button> */}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-md overflow-auto max-h-[65vh] text-sm">
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-black text-white">
              <tr>
                <th className="border p-3">ID</th>
                <th className="border p-3">Type</th>
                <th className="border p-3">Description</th>
                <th className="border p-3">Amount (₹)</th>
                <th className="border p-3">Date</th>
                <th className="border p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const isOpen = openDetailsId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-gray-100">
                        <td className="border p-3 font-mono">{row.id}</td>
                        <td className="border p-3">{row.sourceType}</td>
                        <td className="border p-3">{row.description}</td>
                        <td className="border p-3 font-semibold">
                          ₹ {Number(row.amount || 0).toLocaleString()}
                        </td>
                        <td className="border p-3">{row.date}</td>
                        <td className="border p-3 text-center">
                          <button
                            onClick={() => toggleDetails(row.id)}
                            className="text-xs px-2 py-1 rounded bg-yellow-400 text-white hover:bg-yellow-500"
                          >
                            {isOpen ? "Hide details" : "View details"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td
                            className="border px-3 py-2 bg-gray-50"
                            colSpan={6}
                          >
                            {renderDetails(row)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default IncomeReports;
