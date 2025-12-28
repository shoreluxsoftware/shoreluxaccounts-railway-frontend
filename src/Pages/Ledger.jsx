import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Download, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// 🔥 YOUR EXACT ACCOUNTS DATA
const ACCOUNTS = [
  { label: "Sales Income", value: "salesincome" },
  { label: "Other Income", value: "otherincome" },
  { label: "Booking Income", value: "booking" },
  { label: "Laundry Expense", value: "laundryexpense" },
  { label: "Cleaning Expense", value: "cleaningexpense" },
  { label: "Mess Expense", value: "messexpense" },
  { label: "Cafeteria Expense", value: "cafeteriaexpense" },
  { label: "Rental Expense", value: "rentalexpense" },
  { label: "Salary Expense", value: "salaryexpense" },
  { label: "Miscellaneous Expense", value: "miscellaneousexpense" },
  { label: "Maintenance Expense", value: "maintenanceexpense" },
  { label: "Capital Expense", value: "capitalexpense" },
  { label: "Other Expense", value: "otherexpense" }
];

// 🔥 TOKEN HELPER FUNCTIONS
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    "Content-Type": "application/json"
  };
};

export default function Ledger() {
  const [account, setAccount] = useState(""); 
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 🔥 Fetch Monthly Ledger Summary API
  const fetchMonthlyLedger = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        account: account,
        year: year
      });
      
      const response = await fetch(
        `${API_BASE_URL}/staff-management/monthly-ledger-summary?${params}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const result = await response.json();
      setEntries(result.results || []);
      showToast(`Loaded ${result.results?.length || 0} months for ${account} (${year})`);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load monthly ledger", "error");
    } finally {
      setLoading(false);
    }
  }, [account, year, showToast]);

  // 🔥 Fetch data when account or year changes
  useEffect(() => {
    if (account) fetchMonthlyLedger();
  }, [account, year, fetchMonthlyLedger]);

  const filteredEntries = useMemo(() => {
    const lower = search.toLowerCase();
    let filtered = entries.filter(
      (e) =>
        e.month.toLowerCase().includes(lower) || 
        String(e.year).includes(search)
    );

    switch (sortOption) {
      case "credit_low":
        filtered.sort((a, b) => Number(a.credit || 0) - Number(b.credit || 0));
        break;
      case "credit_high":
        filtered.sort((a, b) => Number(b.credit || 0) - Number(a.credit || 0));
        break;
      case "debit_low":
        filtered.sort((a, b) => Number(a.debit || 0) - Number(b.debit || 0));
        break;
      case "debit_high":
        filtered.sort((a, b) => Number(b.debit || 0) - Number(a.debit || 0));
        break;
      case "balance_low":
        filtered.sort((a, b) => Number(b.credit || 0) - Number(a.debit || 0) - (Number(b.credit || 0) - Number(a.debit || 0)));
        break;
      case "balance_high":
        filtered.sort((a, b) => (Number(b.credit || 0) - Number(a.debit || 0)) - (Number(a.credit || 0) - Number(b.debit || 0)));
        break;
      default:
        break;
    }
    return filtered;
  }, [entries, search, sortOption]);

  // 🔥 Calculate totals
  const totals = useMemo(() => {
    const totalCredit = filteredEntries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
    const totalDebit = filteredEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
    const netBalance = totalCredit - totalDebit;
    return { totalCredit, totalDebit, netBalance };
  }, [filteredEntries]);

  const exportExcel = () => {
    if (!account || filteredEntries.length === 0) return;

    const selectedAccount = ACCOUNTS.find(acc => acc.value === account);
    const wsData = [
      ["MONTHLY LEDGER SUMMARY"],
      [`Account: ${selectedAccount?.label || account}`],
      [`Year: ${year}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["#", "Month", "Year", "Credit (₹)", "Debit (₹)", "Net (₹)"]
    ];

    filteredEntries.forEach((entry, index) => {
      wsData.push([
        index + 1,
        entry.month,
        entry.year,
        Number(entry.credit || 0).toLocaleString("en-IN"),
        Number(entry.debit || 0).toLocaleString("en-IN"),
        Number(entry.credit - entry.debit || 0).toLocaleString("en-IN")
      ]);
    });

    // 🔥 TOTALS ROW
    wsData.push([]);
    wsData.push([
      "", "TOTAL", "", 
      totals.totalCredit.toLocaleString("en-IN"), 
      totals.totalDebit.toLocaleString("en-IN"), 
      totals.netBalance.toLocaleString("en-IN")
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 8 },  // #
      { wch: 15 }, // Month
      { wch: 10 }, // Year
      { wch: 15 }, // Credit
      { wch: 15 }, // Debit
      { wch: 15 }  // Net
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MonthlyLedger");
    XLSX.writeFile(wb, `Monthly_Ledger_${account}_${year}.xlsx`);
    showToast("Excel exported successfully!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("MONTHLY LEDGER SUMMARY", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    const selectedAccount = ACCOUNTS.find(acc => acc.value === account);
    doc.text(`Account: ${selectedAccount?.label || account}`, 20, 35);
    doc.text(`Year: ${year} | Generated: ${new Date().toLocaleDateString()}`, 20, 45);

    doc.autoTable({
      startY: 55,
      head: [["#", "Month", "Year", "Credit (₹)", "Debit (₹)", "Net (₹)"]],
      body: filteredEntries.map((e, index) => [
        index + 1,
        e.month,
        e.year,
        Number(e.credit || 0).toLocaleString("en-IN"),
        Number(e.debit || 0).toLocaleString("en-IN"),
        Number(e.credit - e.debit || 0).toLocaleString("en-IN")
      ]),
      theme: "grid",
      headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15 },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" }
      }
    });

    doc.save(`Monthly_Ledger_${account}_${year}.pdf`);
    showToast("PDF exported successfully!");
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 10; i--) {
    years.push(i.toString());
  }

  return (
    <div className="flex flex-col gap-6 bg-[#F1F2F4] px-6 py-8 min-h-screen max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Monthly Ledger Summary</h1>
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="">Select Account</option>
              {ACCOUNTS.map((acc) => (
                <option key={acc.value} value={acc.value}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              disabled={!account}
            >
              {years.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by month name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border border-gray-400 rounded-md px-3 py-3 flex-1 sm:flex-none focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="">Sort by</option>
            <option value="credit_low">Credit (Low → High)</option>
            <option value="credit_high">Credit (High → Low)</option>
            <option value="debit_low">Debit (Low → High)</option>
            <option value="debit_high">Debit (High → Low)</option>
            <option value="balance_low">Balance (Low → High)</option>
            <option value="balance_high">Balance (High → Low)</option>
          </select>
          <button
            onClick={exportExcel}
            disabled={!account || filteredEntries.length === 0 || loading}
            className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            title="Export Excel"
          >
            <Download size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* 🔥 Totals Cards */}
      {account && filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Credit</h3>
            <p className="text-2xl font-bold text-green-600">
              ₹{totals.totalCredit.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Debit</h3>
            <p className="text-2xl font-bold text-red-600">
              ₹{totals.totalDebit.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Net Balance</h3>
            <p className={`text-2xl font-bold ${
              totals.netBalance >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              ₹{Number(totals.netBalance).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-auto bg-white rounded-lg shadow-md border border-gray-300">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-black text-white sticky top-0">
              <tr>
                <th className="border p-3 text-sm">#</th>
                <th className="border p-3 text-sm">Month</th>
                <th className="border p-3 text-sm">Year</th>
                <th className="border p-3 text-sm text-right">Credit (₹)</th>
                <th className="border p-3 text-sm text-right">Debit (₹)</th>
                <th className="border p-3 text-sm text-right">Net Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500 text-sm"
                  >
                    {account ? `No monthly summary found for ${account} (${year})` : "Please select an account and year."}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => (
                  <tr
                    key={`${entry.year}-${entry.month}`}
                    className="hover:bg-purple-50 transition duration-150"
                  >
                    <td className="border p-3 text-sm font-mono">{index + 1}</td>
                    <td className="border p-3 text-sm font-semibold">{entry.month}</td>
                    <td className="border p-3 text-sm">{entry.year}</td>
                    <td className="border p-3 text-sm text-right text-green-700 font-semibold">
                      ₹{Number(entry.credit || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="border p-3 text-sm text-right text-red-600 font-semibold">
                      ₹{Number(entry.debit || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="border p-3 text-sm text-right font-bold">
                      ₹{Number(entry.credit - entry.debit || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
