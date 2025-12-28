import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export default function Home() {
  const [period, setPeriod] = useState("weekly"); // 'weekly' | 'monthly'

  // metrics: bookings, income, expenses, profit, period label
  const [metrics, setMetrics] = useState({
    bookings: 0,
    income: 0,
    expenses: 0,
    profit: 0,
    periodLabel: "",
  });

  // bar chart: monthly income vs expenses
  const [barData, setBarData] = useState([]);

  // circle progress: booking progress %
  const [progress, setProgress] = useState(0);

  // line chart: monthly trend income/expenses/profit
  const [lineData, setLineData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---- API calls ----

  const fetchDashboardMetrics = useCallback(
    async (p) => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/admin-management/dashboard-metrics?period=${p}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Metrics ${res.status}: ${txt}`);
        }
        const data = await res.json();
        setMetrics({
          bookings: data.bookings || 0,
          income: data.income || 0,
          expenses: data.expenses || 0,
          profit: data.profit || 0,
          periodLabel: data.period || "",
        });
      } catch (err) {
        console.error(err);
        showToast(err.message || "Failed to load dashboard metrics", "error");
      }
    },
    [showToast]
  );

  const fetchMonthlyTrendBar = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin-management/monthly-trend`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Monthly trend ${res.status}: ${txt}`);
      }
      const data = await res.json();
      setBarData(data.data || []);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load monthly trend", "error");
    }
  }, [showToast]);

  const fetchBookingProgress = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin-management/booking-progress`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Progress ${res.status}: ${txt}`);
      }
      const data = await res.json();
      setProgress(data.progress_percentage || 0);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load booking progress", "error");
    }
  }, [showToast]);

  const fetchMonthlyTrendLine = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin-management/monthly-trend-line`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Trend line ${res.status}: ${txt}`);
      }
      const data = await res.json();
      setLineData(data.data || []);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load trend line", "error");
    }
  }, [showToast]);

  // Load all data when component mounts or period changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardMetrics(period),
        fetchMonthlyTrendBar(),
        fetchBookingProgress(),
        fetchMonthlyTrendLine(),
      ]);
      setLoading(false);
    };
    load();
  }, [period, fetchDashboardMetrics, fetchMonthlyTrendBar, fetchBookingProgress, fetchMonthlyTrendLine]);

  const cardsData = [
    {
      title: "Bookings",
      value: metrics.bookings,
      isMoney: false,
    },
    {
      title: "Income",
      value: metrics.income,
      isMoney: true,
    },
    {
      title: "Expenses",
      value: metrics.expenses,
      isMoney: true,
    },
    {
      title: "Profit",
      value: metrics.profit,
      isMoney: true,
    },
  ];

  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard User</h1>
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

      {loading && (
        <div className="w-full max-w-7xl mb-4 text-sm text-gray-500">
          Loading dashboard data…
        </div>
      )}

      {/* Cards */}
      <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
        {cardsData.map((card) => (
          <div
            key={card.title}
            className="bg-white text-gray-800 rounded-2xl shadow-xl p-6 flex flex-col justify-between min-h-[106px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{card.title}</span>
            </div>
            <span className="text-2xl font-extrabold text-gray-800">
              {card.isMoney
                ? `₹ ${Number(card.value || 0).toLocaleString()}`
                : card.value}
            </span>
            <div className="text-xs text-gray-500">
              {metrics.periodLabel || (period === "weekly" ? "This Week" : "This Month")}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
     <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-8 mb-10">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-700 text-lg">
            Income vs Expenses (Monthly Data)
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barGap={5} barCategoryGap={15}>
            <XAxis dataKey="month" />
            <YAxis
              yAxisId="left"
              stroke="#FBBF24"
              tickFormatter={(v) => v.toLocaleString()}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#274E9B"
              tickFormatter={(v) => v.toLocaleString()}
            />
            <Tooltip formatter={(value) => value.toLocaleString()} />
            <Legend />
            <Bar
              yAxisId="right"
              dataKey="income"
              name="Income"
              fill="#274E9B"
              radius={[5, 5, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="expenses"
              name="Expenses"
              fill="#FBBF24"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: line chart, circle, profit selector */}
      <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Line chart */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <span className="font-bold mb-2 text-gray-700">Monthly Trend</span>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={lineData}>
              <XAxis dataKey="month" />
              <YAxis hide />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#274E9B"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#FBBF24"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#16A34A"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Circle progress */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center">
          <span className="font-bold mb-2 text-gray-700">
            Booking Progress
          </span>
          <div className="relative inline-block mb-3">
<svg width="90" height="90">
  <circle
    cx="45"
    cy="45"
    r={circleRadius}
    stroke="#e5e7eb"
    strokeWidth="10"
    fill="none"
  />

  <circle
    cx="45"
    cy="45"
    r={circleRadius}
    stroke="#FBBF24"
    strokeWidth="10"
    fill="none"
    strokeDasharray={circumference}
    strokeDashoffset={
      circumference * (1 - Math.min(progress, 100) / 100)
    }
    style={{ transition: "stroke-dashoffset 0.8s" }}
  />
</svg>


<span className="absolute top-[29px] left-[29px] font-bold text-2xl text-gray-700">
  {Math.min(progress, 100)}%
</span>

          </div>
        </div>

        {/* Profit / period selector */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col justify-center">
          <span className="font-bold text-lg mb-4 text-gray-700">Profit</span>
          <span className="text-3xl font-extrabold mb-2 text-green-700">
            ₹ {Number(metrics.profit || 0).toLocaleString()}
          </span>
          <div className="text-gray-400 mb-3 text-sm">
            ({metrics.periodLabel ||
              (period === "weekly" ? "This Week" : "This Month")})
          </div>
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-gray-200 text-gray-800 rounded px-2 py-1 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
