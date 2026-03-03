import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Calendar, Download } from "lucide-react";
import * as XLSX from "xlsx";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    "Content-Type": "application/json"
  };
};

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchMonthlyLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      const response = await fetch(
        `${API_BASE_URL}/staff-management/monthly-ledger-summary?${params}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      setEntries(result.results || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      showToast("Failed to load ledger", "error");
    } finally {
      setLoading(false);
    }
  }, [year, showToast]);

  useEffect(() => {
    fetchMonthlyLedger();
  }, [year, fetchMonthlyLedger]);

  const filteredEntries = useMemo(() => {
    const lower = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.month.toLowerCase().includes(lower) || 
        e.source_type.toLowerCase().includes(lower)
    );
  }, [entries, search]);

  const totals = useMemo(() => {
    const totalCredit = filteredEntries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
    const totalDebit = filteredEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
    return { totalCredit, totalDebit, netBalance: totalCredit - totalDebit };
  }, [filteredEntries]);

  const years = Array.from({length: 10}, (_, i) => (new Date().getFullYear() - i).toString());

  const formatSource = (src) => {
    if (!src) return "N/A";
    return src.replace(/expense|income/gi, (match) => ` ${match}`).trim().replace(/^\w/, (c) => c.toUpperCase());
  };

  // 🔥 NEW: Export to Excel Function
  const exportExcel = () => {
    const wsData = [
      ["YEARLY LEDGER REPORT"],
      [`Year: ${year}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["#", "Month", "Account Source", "Credit (₹)", "Debit (₹)", "Balance (₹)"]
    ];

    filteredEntries.forEach((entry, index) => {
      const credit = Number(entry.credit || 0);
      const debit = Number(entry.debit || 0);
      wsData.push([
        index + 1,
        entry.month,
        formatSource(entry.source_type),
        credit.toFixed(2),
        debit.toFixed(2),
        (credit - debit).toFixed(2)
      ]);
    });

    wsData.push([]);
    wsData.push([
      "", 
      "", 
      "TOTAL", 
      totals.totalCredit.toFixed(2), 
      totals.totalDebit.toFixed(2), 
      totals.netBalance.toFixed(2)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 8 },  // #
      { wch: 15 }, // Month
      { wch: 25 }, // Account Source
      { wch: 15 }, // Credit
      { wch: 15 }, // Debit
      { wch: 18 }  // Balance
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `Yearly_Ledger_${year}.xlsx`);
    showToast("Excel exported successfully!");
  };

  return (
    <div className="flex flex-col gap-6 bg-[#F1F2F4] px-6 py-8 min-h-screen max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Yearly Ledger Overview</h1>
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

      {/* Controls - Styled like Daybook */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 border border-gray-400 rounded-md px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-purple-600">
            <Calendar size={18} className="text-gray-500" />
            <select 
              value={year} 
              onChange={(e) => setYear(e.target.value)} 
              className="focus:outline-none bg-transparent font-medium"
            >
              {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search month or source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-md outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={exportExcel}
          disabled={filteredEntries.length === 0 || loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Download size={18} />
          Download as Excel
        </button>
      </div>

      {/* Totals Cards - Styled like Daybook */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Credit</h3>
          <p className="text-2xl font-bold text-green-600">
            ₹{totals.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Debit</h3>
          <p className="text-2xl font-bold text-red-600">
            ₹{totals.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Net Balance</h3>
          <p className={`text-2xl font-bold ${totals.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            ₹{Math.abs(totals.netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            {totals.netBalance < 0 ? "" : ""}
          </p>
        </div>
      </div>

      {/* Table Section - Exact Daybook Style */}
      <div className="overflow-auto bg-white rounded-lg shadow-md border border-gray-300">
        <table className="w-full border-collapse">
          <thead className="bg-black text-white sticky top-0">
            <tr>
              <th className="border p-3 text-sm">#</th>
              <th className="border p-3 text-sm">Month</th>
              <th className="border p-3 text-sm text-left">Account Source</th>
              <th className="border p-3 text-sm text-right">Credit (₹)</th>
              <th className="border p-3 text-sm text-right">Debit (₹)</th>
              <th className="border p-3 text-sm text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">Loading...</td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500 text-sm">No records found</td>
              </tr>
            ) : (
              filteredEntries.map((entry, idx) => {
                const credit = Number(entry.credit || 0);
                const debit = Number(entry.debit || 0);
                return (
                  <tr 
                    key={idx} 
                    className="hover:bg-purple-50 transition duration-150"
                  >
                    <td className="border p-3 text-sm">{idx + 1}</td>
                    <td className="border p-3 text-sm font-bold whitespace-nowrap">{entry.month}</td>
                    <td className="border p-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold uppercase text-gray-600">
                        {formatSource(entry.source_type)}
                      </span>
                    </td>
                    <td className="border p-3 text-sm text-right text-green-700 font-semibold">
                      {credit > 0 ? credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                    </td>
                    <td className="border p-3 text-sm text-right text-red-600 font-semibold">
                      {debit > 0 ? debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                    </td>
                    <td className="border p-3 text-sm text-right font-bold">
                      {(credit - debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}