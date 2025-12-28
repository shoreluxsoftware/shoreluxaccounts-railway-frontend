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

const expenseCategories = [
  "Laundry",
  "Cleaning",
  "Cafeteria",
  "Mess",
  "Rental",
  "Salary",
  "Miscellaneous",
  "Maintenance",
  "Capital",
  "Other Expenses",
];

const ExpensesReports = () => {
  const [allExpenses, setAllExpenses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 🔥 NEW: Excel Export
  const exportExcel = () => {
    const wsData = [
      ["EXPENSES REPORT"],
      [`Category: ${selectedCategory || "All"}`],
      [`Date Range: ${dateFrom || "All"} to ${dateTo || "All"}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["ID", "Category", "Description", "Amount (₹)", "Date"]
    ];

    filteredData.forEach((item) => {
      wsData.push([
        item.id,
        item.category,
        item.description,
        Number(item.amount || 0).toLocaleString("en-IN"),
        item.date
      ]);
    });

    // 🔥 Add totals
    wsData.push([]);
    wsData.push(["", "", "TOTAL EXPENSES", totalExpenses.toLocaleString("en-IN"), ""]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 8 },   // ID
      { wch: 15 },  // Category
      { wch: 40 },  // Description
      { wch: 15 },  // Amount
      { wch: 12 }   // Date
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ExpensesReport");
    XLSX.writeFile(wb, `ExpensesReport_${selectedCategory || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Excel exported successfully!");
  };

  // 🔥 NEW: PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("EXPENSES REPORT", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Category: ${selectedCategory || "All"}`, 20, 35);
    doc.text(`Date: ${dateFrom || "All"} to ${dateTo || "All"}`, 20, 45);
    doc.text(`Total: ₹${totalExpenses.toLocaleString("en-IN")}`, 20, 55);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65);

    doc.autoTable({
      startY: 75,
      head: [["ID", "Category", "Description", "Amount (₹)", "Date"]],
      body: filteredData.map((item) => [
        item.id,
        item.category,
        item.description,
        Number(item.amount || 0).toLocaleString("en-IN"),
        item.date
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

    doc.save(`ExpensesReport_${selectedCategory || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("PDF exported successfully!");
  };

  // Fetch from backend
  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/staff-management/list-expenses`,
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
          (result.data || []).map((e, idx) => ({
            id: idx + 1,
            category: e.category,
            description: e.description,
            amount: Number(e.amount || 0),
            date: e.date,
          })) || [];

        setAllExpenses(mapped);
        showToast(`Loaded ${mapped.length} expense records`);
      } catch (err) {
        console.error("Fetch expenses error:", err);
        showToast(err.message || "Failed to load expenses", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  // Filter + search + sort
  const filteredData = useMemo(() => {
    let data = [...allExpenses];

    if (selectedCategory) {
      data = data.filter((item) => item.category === selectedCategory);
    }

    if (search.trim() !== "") {
      const lower = search.toLowerCase();
      data = data.filter((item) => {
        const idMatch = String(item.id || "").toLowerCase().includes(lower);
        const descMatch = String(item.description || "").toLowerCase().includes(lower);
        const catMatch = String(item.category || "").toLowerCase().includes(lower);
        const amtMatch = String(item.amount ?? "").toLowerCase().includes(lower);
        const dateMatch = String(item.date || "").includes(lower);
        return idMatch || descMatch || catMatch || amtMatch || dateMatch;
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
  }, [allExpenses, selectedCategory, search, dateFrom, dateTo, sortOption]);

  const totalExpenses = useMemo(
    () => filteredData.reduce((acc, cur) => acc + (cur.amount || 0), 0),
    [filteredData]
  );

  const isInRange = (dateStr) => {
    if (!dateFrom && !dateTo) return false;
    const d = new Date(dateStr);
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  return (
    <div className="bg-[#F1F2F4] p-6 min-h-screen max-w-full mx-auto rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Expenses Reports</h2>
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

      <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-xl font-semibold text-red-600">
        Total Expenses: ₹ {totalExpenses.toLocaleString()}
      </div>

      {/* Filters + Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4 items-end">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-400 rounded-md p-2"
        >
          <option value="">All Categories</option>
          {expenseCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
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
                <th className="border p-3">Category</th>
                <th className="border p-3">Description</th>
                <th className="border p-3">Amount (₹)</th>
                <th className="border p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const highlight = isInRange(item.date);
                  return (
                    <tr
                      key={item.id}
                      className={
                        "hover:bg-gray-100 " +
                        (highlight ? "bg-yellow-50" : "")
                      }
                    >
                      <td className="border p-3 font-mono">{item.id}</td>
                      <td className="border p-3">{item.category}</td>
                      <td className="border p-3">{item.description}</td>
                      <td className="border p-3 font-semibold text-red-600">
                        ₹ {Number(item.amount || 0).toLocaleString()}
                      </td>
                      <td className="border p-3">{item.date}</td>
                    </tr>
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

export default ExpensesReports;
