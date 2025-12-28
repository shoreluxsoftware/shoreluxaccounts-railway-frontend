import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const todayDateStr = new Date().toISOString().split("T")[0];

export default function DayBook() {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(todayDateStr);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchDaybook = useCallback(
    async (selectedDate) => {
      if (!selectedDate) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No access token found. Please login again.");

        const response = await fetch(
          `${API_BASE_URL}/staff-management/daybook-entries?date=${selectedDate}`,
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
        const mapped = (result.data || []).map((e) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          income: Number(e.credit || 0),
          expense: Number(e.debit || 0),
        }));
        setEntries(mapped);
        showToast(`Loaded ${mapped.length} entries for ${selectedDate}`);
      } catch (err) {
        console.error("Daybook fetch error:", err);
        showToast(err.message || "Failed to load daybook", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchDaybook(date);
  }, [date, fetchDaybook]);

  const filteredEntries = useMemo(() => {
    const lower = search.toLowerCase();
    let filtered = entries.filter(
      (e) =>
        e.description.toLowerCase().includes(lower) || e.date.includes(search)
    );

    switch (sortOption) {
      case "income_low":
        filtered.sort((a, b) => a.income - b.income);
        break;
      case "income_high":
        filtered.sort((a, b) => b.income - a.income);
        break;
      case "expense_low":
        filtered.sort((a, b) => a.expense - b.expense);
        break;
      case "expense_high":
        filtered.sort((a, b) => b.expense - a.expense);
        break;
      case "balance_low":
        filtered.sort((a, b) => a.balance - b.balance);
        break;
      case "balance_high":
        filtered.sort((a, b) => b.balance - a.balance);
        break;
      default:
        break;
    }
    return filtered;
  }, [entries, search, sortOption]);

  let runningBalance = 0;
  const entriesWithBalance = filteredEntries.map((e) => {
    runningBalance += (e.income || 0) - (e.expense || 0);
    return { ...e, balance: runningBalance };
  });

  // 🔥 NEW: Calculate totals
  const totals = useMemo(() => {
    const totalIncome = filteredEntries.reduce((sum, e) => sum + (e.income || 0), 0);
    const totalExpense = filteredEntries.reduce((sum, e) => sum + (e.expense || 0), 0);
    const finalBalance = entriesWithBalance[entriesWithBalance.length - 1]?.balance || 0;
    return { totalIncome, totalExpense, finalBalance };
  }, [filteredEntries, entriesWithBalance]);

  const exportExcel = () => {
    const wsData = [
      ["DAYBOOK REPORT"],
      [`Date: ${date}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["#", "Date", "Description", "Income (₹)", "Expense (₹)", "Balance (₹)"]
    ];

    entriesWithBalance.forEach((entry, index) => {
      wsData.push([
        index + 1,
        entry.date,
        entry.description,
        entry.income ? entry.income.toFixed(2) : 0,
        entry.expense ? entry.expense.toFixed(2) : 0,
        entry.balance.toFixed(2)
      ]);
    });

    // 🔥 Add totals row
    wsData.push([]);
    wsData.push(["", "", "TOTAL", totals.totalIncome.toFixed(2), totals.totalExpense.toFixed(2), totals.finalBalance.toFixed(2)]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 8 },  // #
      { wch: 12 }, // Date
      { wch: 40 }, // Description
      { wch: 12 }, // Income
      { wch: 12 }, // Expense
      { wch: 14 }  // Balance
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DayBook");
    XLSX.writeFile(wb, `DayBook_${date}.xlsx`);
    showToast("Excel exported successfully!");
  };

  return (
    <div className="flex flex-col gap-6 bg-[#F1F2F4] px-6 py-8 min-h-screen max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">DayBook</h1>
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by date or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-400 rounded-md px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border border-gray-400 rounded-md px-3 py-2 flex-1 sm:flex-none focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="">Sort by</option>
            <option value="income_low">Income (Low → High)</option>
            <option value="income_high">Income (High → Low)</option>
            <option value="expense_low">Expense (Low → High)</option>
            <option value="expense_high">Expense (High → Low)</option>
            <option value="balance_low">Balance (Low → High)</option>
            <option value="balance_high">Balance (High → Low)</option>
          </select>
          <button
            onClick={exportExcel}
            disabled={entriesWithBalance.length === 0 || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            Download as Excel
          </button>
        </div>
      </div>

      {/* 🔥 NEW: Totals Cards */}
      {entriesWithBalance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Income</h3>
            <p className="text-2xl font-bold text-green-600">
              ₹{totals.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Expense</h3>
            <p className="text-2xl font-bold text-red-600">
              ₹{totals.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Net Balance</h3>
            <p className={`text-2xl font-bold ${
              totals.finalBalance >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              ₹{Number(totals.finalBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                <th className="border p-3 text-sm">Date</th>
                <th className="border p-3 text-sm">Description</th>
                <th className="border p-3 text-sm text-right">Income (₹)</th>
                <th className="border p-3 text-sm text-right">Expense (₹)</th>
                <th className="border p-3 text-sm text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithBalance.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500 text-sm"
                  >
                    No entries found
                  </td>
                </tr>
              ) : (
                entriesWithBalance.map(
                  ({ id, date, description, income, expense, balance }, index) => (
                    <tr
                      key={id}
                      className="hover:bg-purple-50 transition duration-150"
                    >
                      <td className="border p-3 text-sm">{index + 1}</td>
                      <td className="border p-3 text-sm">{date}</td>
                      <td className="border p-3 text-sm">{description}</td>
                      <td className="border p-3 text-sm text-right text-green-700 font-semibold">
                        {income ? income.toFixed(2) : "-"}
                      </td>
                      <td className="border p-3 text-sm text-right text-red-600 font-semibold">
                        {expense ? expense.toFixed(2) : "-"}
                      </td>
                      <td className="border p-3 text-sm text-right font-bold">
                        {balance.toFixed(2)}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
