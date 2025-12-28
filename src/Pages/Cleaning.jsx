import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, AlertCircle, CheckCircle } from 'lucide-react'; 

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// --- Helper Components ---

/** Custom Toast Notification Component */
const ToastMessage = ({ message, type, onClose }) => {
    const isError = type === 'error';
    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white flex items-center z-[9999] transition-all duration-300 transform";
    const bgClass = isError ? "bg-red-600" : "bg-green-600";
    const Icon = isError ? AlertCircle : CheckCircle;

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

const Cleaning = () => {
    // Form state
    const [form, setForm] = useState({
        roomNo: "",
        startTime: "",
        endTime: "",
        products: [{ item_id: "", quantity: "" }],
        remarks: "",
        staff: "",
        date: new Date().toISOString().split("T")[0],
    });

    // Table and UI state
    const [entries, setEntries] = useState([]);
    const [productOptions, setProductOptions] = useState([]);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [sortOption, setSortOption] = useState("newest");
    const [loading, setLoading] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null);

    // --- Toast Handler ---
    const showToast = useCallback((message, type) => {
        setToast({ message, type });
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, []);

    // --- Auth Headers ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    };

    // --- API: Fetch Cleaning Products ---
    const fetchCleaningProducts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/staff-management/list-room-cleanings`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const products = (data.data || data.results || data).map((item) => ({
                id: item.id,
                name: item.name || item.item_name || item.title || `Item ${item.id}`,
            }));
            setProductOptions(products);
        } catch (err) {
            console.error("Error fetching cleaning products:", err);
            showToast("Failed to load product options", 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    // --- API: Fetch Cleaning Logs ---
    const fetchCleaningLogs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/staff-management/list-cleaning`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            setEntries(data.data || data.results || data || []);
        } catch (err) {
            console.error("Error fetching cleaning logs:", err);
            showToast("Failed to load cleaning entries", 'error');
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    // Initial load
    useEffect(() => {
        fetchCleaningProducts();
        fetchCleaningLogs();
    }, [fetchCleaningProducts, fetchCleaningLogs]);

    // --- Form Handlers ---
    const handleProductChange = (index, field, value) => {
        const updatedProducts = [...form.products];
        if (field === "name") {
            updatedProducts[index]["item_id"] = value;
        } else {
            updatedProducts[index][field] = value;
        }
        setForm({ ...form, products: updatedProducts });
    };

    const addProductField = () => {
        setForm({ ...form, products: [...form.products, { item_id: "", quantity: "" }] });
    };

    const removeProductField = (index) => {
        const updatedProducts = form.products.filter((_, i) => i !== index);
        setForm({ ...form, products: updatedProducts });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "startTime" && value) {
            const [hours, minutes] = value.split(":").map(Number);
            let endHours = hours;
            let endMinutes = minutes + 40;
            if (endMinutes >= 60) {
                endHours += Math.floor(endMinutes / 60);
                endMinutes %= 60;
            }
            if (endHours >= 24) {
                endHours %= 24;
            }
            const formattedEndTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
            setForm({ ...form, startTime: value, endTime: formattedEndTime });
            return;
        }

        setForm({ ...form, [name]: value });
    };

    const validateForm = () => {
        setError('');
        if (!form.roomNo || !form.startTime || !form.staff) {
            setError("Please fill in Room No., Start Time, and Staff Name.");
            return false;
        }
        if (form.products.length === 0 || form.products.some((p) => !p.item_id || !p.quantity || isNaN(p.quantity) || p.quantity <= 0)) {
            setError("Please provide valid product selections and positive quantities.");
            return false;
        }
        return true;
    };

    // --- API: Submit Cleaning Entry ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);

        const apiData = {
            room_number: form.roomNo,
            start_time: `${form.date}T${form.startTime}:00Z`,
            end_time: `${form.date}T${form.endTime}:00Z`,
            products_used: form.products.map(p => ({
                item_id: parseInt(p.item_id),
                quantity: parseInt(p.quantity),
            })),
            remarks: form.remarks,
            username: form.staff,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/staff-management/log-cleaning`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(apiData),
            });

            const result = await response.json();

            if (!response.ok) {
                const errorDetails = result.detail || result.message || result.error || JSON.stringify(result);
                throw new Error(errorDetails);
            }

            showToast("Cleaning entry logged successfully!", 'success');
            fetchCleaningLogs(); // Refresh table
            setForm({
                roomNo: "",
                startTime: "",
                endTime: "",
                products: [{ item_id: "", quantity: "" }],
                remarks: "",
                staff: "",
                date: new Date().toISOString().split("T")[0],
            });
            setError('');
        } catch (err) {
            console.error("Error logging cleaning entry:", err);
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Utility Functions ---
    const formatDateTime = (isoString) => {
        if (!isoString) return { date: "N/A", time: "N/A" };
        try {
            const dateObj = new Date(isoString);
            const date = dateObj.toLocaleDateString('en-CA', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
            }).replace(/-/g, '/');
            const time = dateObj.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            });
            return { date, time };
        } catch {
            return { date: "Invalid Date", time: "Invalid Time" };
        }
    };

    const getProductName = (itemId) => {
        const product = productOptions.find(p => p.id === parseInt(itemId));
        return product ? product.name : `ID: ${itemId}`;
    };

    const filteredEntries = entries
        .filter((entry) =>
            [entry.room_number, entry.remarks, entry.username]
                .some((field) => field && String(field).toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => {
            const dateTimeA = new Date(a.start_time);
            const dateTimeB = new Date(b.start_time);
            if (sortOption === "newest") return dateTimeB - dateTimeA;
            if (sortOption === "oldest") return dateTimeA - dateTimeB;
            return 0;
        });

    return (
        <div className='bg-[#F1F2F4] min-h-screen p-8'>
            <div className="flex gap-6 mx-auto max-w-8xl">
                {/* Add Cleaning Entry Form */}
                <form onSubmit={handleSubmit} className="bg-white border border-gray-300 rounded-xl p-8 shadow-md w-full max-w-lg h-fit">
                    <h2 className="text-xl font-semibold mb-6">Add Cleaning Entry</h2>
                    {error && <p className="text-red-600 text-sm mb-4"><AlertCircle size={16} className="inline mr-1"/>{error}</p>}
                    {loading && <p className="text-blue-600 text-sm mb-4">Processing...</p>}

                    {/* Date and Room No. */}
                    <div className="flex gap-3 mb-6">
                        <div className="flex-1">
                            <label className="text-sm font-medium">Date *</label>
                            <input
                                type="date"
                                name="date"
                                value={form.date}
                                disabled
                                className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium">Room No. *</label>
                            <input
                                type="text"
                                name="roomNo"
                                value={form.roomNo}
                                onChange={handleChange}
                                placeholder="Enter room number"
                                className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <label className="text-sm font-medium">
                        Time (Start - End) <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="time"
                        name="startTime"
                        value={form.startTime}
                        onChange={handleChange}
                        className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-1"
                        disabled={loading}
                    />
                    <p className="text-sm text-gray-500 mb-6">
                        {form.startTime && form.endTime ? `${form.startTime} - ${form.endTime}` : "Select start time"}
                    </p>

                    <label className="text-sm font-medium">
                        Products & Quantities <span className="text-red-600">*</span>
                    </label>
                    {form.products.map((prod, i) => (
                        <div key={i} className="flex gap-2 mb-4 items-center">
                            <select
                                value={prod.item_id}
                                onChange={(e) => handleProductChange(i, "name", e.target.value)}
                                className="flex-1 border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
                                disabled={loading}
                            >
                                <option value="">Select product</option>
                                {productOptions.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="1"
                                value={prod.quantity}
                                onChange={(e) => handleProductChange(i, "quantity", e.target.value)}
                                placeholder="Qty"
                                className="w-20 border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
                                disabled={loading}
                            />
                            {form.products.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeProductField(i)}
                                    className="text-red-600 font-bold px-1"
                                    disabled={loading}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addProductField}
                        className="mb-6 px-4 py-2 bg-black cursor-pointer text-white rounded-lg shadow-md transition-colors duration-300 disabled:opacity-50"
                        disabled={loading}
                    >
                       + Add Another Product 
                    </button>
                    <br />
                    <label className="text-sm font-medium">Remarks</label>
                    <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        placeholder="Add remarks..."
                        className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6"
                        disabled={loading}
                    />

                    <label className="text-sm font-medium">
                        Staff Name <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="text"
                        name="staff"
                        value={form.staff}
                        onChange={handleChange}
                        placeholder="Enter staff name"
                        className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
                        disabled={loading}
                    />

                    <button 
                        type="submit" 
                        className="w-full bg-black text-white cursor-pointer py-2 mt-8 rounded-md hover:bg-gray-900 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Adding...' : 'Add Entry'}
                    </button>
                </form>

                {/* Cleaning Entries Table */}
                <div className="w-full">
                    <div className="flex justify-between mb-3">
                        <div className="relative w-1/2">
                            <input 
                                type="text" 
                                placeholder="Search entries..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full" 
                            />
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        </div>
                        <select 
                            value={sortOption} 
                            onChange={e => setSortOption(e.target.value)} 
                            className="border border-gray-400 rounded-md px-3 py-2"
                        >
                            <option value="newest">Time (Newest → Oldest)</option>
                            <option value="oldest">Time (Oldest → Newest)</option>
                        </select>
                    </div>

                    <div className="overflow-auto bg-white rounded-lg shadow-md border border-gray-300 max-h-[70vh]">
                        <table className="w-full border-collapse">
                            <thead className="bg-black text-white sticky top-0">
                                <tr>
                                    <th className="border p-3 text-sm">Date</th>
                                    <th className="border p-3 text-sm">Room No.</th>
                                    <th className="border p-3 text-sm">Time (Start - End)</th>
                                    <th className="border p-3 text-sm">Products (Qty)</th>
                                    <th className="border p-3 text-sm">Remarks</th>
                                    <th className="border p-3 text-sm">Staff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && entries.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-6 text-blue-500">
                                            Loading cleaning entries...
                                        </td>
                                    </tr>
                                ) : filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-6 text-gray-500">
                                            No entries found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEntries.map((entry) => {
                                        const { date: startDate, time: startTime } = formatDateTime(entry.start_time);
                                        const { time: endTime } = formatDateTime(entry.end_time);

                                        return (
                                            <tr key={entry.id} className="hover:bg-gray-100">
                                                <td className="border p-3 text-sm">{startDate}</td>
                                                <td className="border p-3 text-sm">{entry.room_number}</td>
                                                <td className="border p-3 text-sm">{`${startTime} - ${endTime}`}</td>
                                                <td className="border p-3 text-sm">
                                                    {entry.products_used.map((p) => {
                                                        const name = p.item_name || getProductName(p.item_id);
                                                        return `${name} (${p.quantity})`;
                                                    }).join(", ")}
                                                </td>
                                                <td className="border p-3 text-sm">{entry.remarks}</td>
                                                <td className="border p-3 text-sm">{entry.username}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
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

export default Cleaning;
