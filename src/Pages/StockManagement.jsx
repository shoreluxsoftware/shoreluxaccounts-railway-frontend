import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle, Download } from 'lucide-react'; 
import * as XLSX from 'xlsx';

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// --- Helper Components ---

/** * Custom Toast Notification Component (Updated Position)
 */
const ToastMessage = ({ message, type, onClose }) => {
    const isError = type === 'error';
    // CHANGED: top-5 right-5 instead of bottom-5 right-5
    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white flex items-center z-[9999] transition-all duration-300 transform";
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

/** * Custom Delete Confirmation Modal Component
 */
const DeleteConfirmationModal = ({ item, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-red-600">Confirm Deletion</h3>
            <p className="mb-6">
                Are you sure you want to delete the item: <strong className="font-mono">{item.item_name}</strong> (ID: {item.id})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    className="px-4 py-2 border border-gray-400 rounded-md text-sm hover:bg-gray-100 transition"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition"
                    onClick={() => onConfirm(item.id)}
                >
                    Delete Item
                </button>
            </div>
        </div>
    </div>
);

// 🔥 EXCEL EXPORT FUNCTION
const exportToExcel = (filteredItems, showToast) => {
  try {
    const exportData = filteredItems.map(item => ({
      'ID': item.id,
      'S.No': filteredItems.indexOf(item) + 1,
      'Date Added': item.date || 'N/A',
      'Item Name': item.item_name || 'N/A',
      'Category': item.category_name || 'N/A',
      'Quantity': item.quantity || 0,
      'Description': item.description || 'N/A'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Stock Items");
    
    // Auto-fit columns
    const colWidths = [
      { wch: 8 },  // ID
      { wch: 8 },  // S.No
      { wch: 12 }, // Date
      { wch: 20 }, // Item Name
      { wch: 15 }, // Category
      { wch: 12 }, // Quantity
      { wch: 30 }  // Description
    ];
    ws['!cols'] = colWidths;

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `ShoreLux_Stock_Items_${today}.xlsx`);
    showToast("Stock items exported to Excel successfully!", 'success');
  } catch (error) {
    console.error("Excel export error:", error);
    showToast("Failed to export Excel file", 'error');
  }
};

const StockManagement = () => {
  // Default form structure for adding new items
  const initialFormState = {
    dateAdded: new Date().toISOString().split("T")[0], 
    itemName: '',
    category: '', // Will store the category ID
    quantity: '',
    description: '',
  };

  const [form, setForm] = useState(initialFormState);
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingItem, setEditingItem] = useState(null); 
    
    // New State for Toasts and Delete Confirmation
    const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' }
    const [deleteConfirm, setDeleteConfirm] = useState(null); // Item object to confirm deletion

    // --- Toast Handler ---
    const showToast = useCallback((message, type) => {
        setToast({ message, type });
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, []);

  // Helper function to get auth token
  const getAuthHeaders = () => {
    // CORRECT: Accessing access_token from localStorage
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  // --- API: Fetch Categories (FIXED: Handles array response) ---
  const fetchCategories = useCallback(async () => {
    try {
      // ADDED: Authorization header
      const headers = getAuthHeaders(); 
      
      const response = await fetch(`${API_BASE_URL}/staff-management/list-categories`, {
        headers: headers,
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        const errorMessage = errorResult.detail || response.statusText;
        throw new Error(`Failed to fetch categories: ${errorMessage}`);
      }
      
      // CORRECTED: API returns an array of objects directly
      const result = await response.json();
      setCategories(result || []); 
    } catch (err) {
      console.error("Error fetching categories:", err);
      showToast("Failed to load categories. (Requires Auth)", 'error');
    }
  }, [showToast]);

  // --- API: Fetch Stock Items (Ensure Authorization Header is Passed) ---
  const fetchStockItems = useCallback(async () => {
    setLoading(true);
    try {
      // ADDED: Authorization header
      const headers = getAuthHeaders(); 
      const response = await fetch(`${API_BASE_URL}/staff-management/list-items`, {
        headers: headers, 
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        const errorMessage = errorResult.detail || response.statusText;
        throw new Error(`HTTP error! status: ${response.status}. Detail: ${errorMessage}`);
      }
      
      const result = await response.json();
      setStockItems(result.data || []);
    } catch (err) {
      console.error("Error fetching stock items:", err);
      showToast("Failed to load stock data from the server. (Requires Auth)", 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]); 

  // --- Initial Load Effect ---
  useEffect(() => {
    fetchCategories();
    fetchStockItems();
  }, [fetchCategories, fetchStockItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (editingItem) {
      setEditingItem({ ...editingItem, [name]: value });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const validateForm = (data) => {
    // Clear old inline error
    setError(''); 
    if (!data.itemName || !data.category || !data.quantity || !data.description || !data.dateAdded) {
      setError("Please fill all required fields.");
      return false;
    }
    if (isNaN(data.quantity) || Number(data.quantity) <= 0) {
      setError("Quantity must be a positive number.");
      return false;
    }
    return true;
  };

  // --- API: Submit New Stock Item (AddStockItemAPIView) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    setLoading(true);

    const payload = {
        item_name: form.itemName, // API expects item_name
        category: Number(form.category), 
        quantity: Number(form.quantity),
        description: form.description,
        date: form.dateAdded, 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/staff-management/add-item`, {
          method: 'POST',
          // ADDED: Authorization header
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorDetails = result.detail || result.message || JSON.stringify(result.errors || result);
          showToast(`Failed to add item: ${errorDetails}`, 'error'); 
          return;
        }
        
        setStockItems([result.data, ...stockItems]);
        setForm(initialFormState); 
        showToast(`Item '${result.data.item_name}' added successfully!`, 'success');

    } catch (err) {
      console.error("Submission error:", err);
      showToast("An unexpected error occurred. Please check the network.", 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // --- API: Add New Category (AddCategoryAPIView) ---
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      const payload = { name: newCategoryName.trim() };
      const response = await fetch(`${API_BASE_URL}/staff-management/add-category`, {
        method: 'POST',
        // ADDED: Authorization header
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();

      if (!response.ok) {
        const errorDetails = result.message || JSON.stringify(result);
        showToast(`Failed to add category: ${errorDetails}`, 'error'); 
        return;
      }

      setCategories([...categories, result.data]); 
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      showToast(`Category '${result.data.name}' added successfully!`, 'success'); 
    } catch (err) {
      console.error("Category submission error:", err);
      showToast("An unexpected error occurred while adding the category.", 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Edit Handlers (FIXED: Ensure date is in YYYY-MM-DD format for input) ---
  const startEdit = (item) => {
    // Find the category ID based on the category name returned in the list.
    const categoryId = categories.find(c => c.name === item.category_name)?.id || item.category;
    // Format the date to YYYY-MM-DD for the date input field
    const formattedDate = item.date ? new Date(item.date).toISOString().split('T')[0] : '';

    setEditingItem({
      id: item.id,
      dateAdded: formattedDate, // Use the formatted date
      itemName: item.item_name,
      category: categoryId || '', 
      quantity: item.quantity.toString(),
      description: item.description,
    });
    setIsEditModalOpen(true);
    setError('');
  };

  // --- API: Update Stock Item (FIXED: Correctly passes ID and Auth) ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem || !validateForm(editingItem)) return;
    setLoading(true);

    const payload = {
      item_name: editingItem.itemName,
      category: Number(editingItem.category), 
      quantity: Number(editingItem.quantity),
      description: editingItem.description,
      date: editingItem.dateAdded,
    };

    try {
        // CORRECTED: Passing editingItem.id in the URL
        const response = await fetch(`${API_BASE_URL}/staff-management/update-item/${editingItem.id}`, {
          method: 'PUT', 
          // ADDED: Authorization header
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorDetails = result.detail || result.message || JSON.stringify(result.errors || result);
          setError(`Failed to update item: ${errorDetails}`); 
          return;
        }
        
        setStockItems(stockItems.map(item => item.id === editingItem.id ? result.data : item));
        setIsEditModalOpen(false);
        setEditingItem(null);
        showToast(`Item '${result.data.item_name}' updated successfully!`, 'success');
        setError('');

    } catch (err) {
      console.error("Update error:", err);
      setError("An unexpected error occurred during update.");
    } finally {
      setLoading(false);
    }
  };

  // --- API: Delete Stock Item (Integrated with Modal) ---
    // This function is triggered by the modal's confirm button
  const executeDelete = async (id) => {
    setLoading(true);
    setDeleteConfirm(null); // Close the modal immediately

    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/delete-item/${id}`, {
        method: 'DELETE',
        // ADDED: Authorization header
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const errorDetails = result.detail || result.message || response.statusText;
        showToast(`Failed to delete item: ${errorDetails}`, 'error'); 
        return;
      }
      
      // Success: Remove item from local state
      const deletedItemName = stockItems.find(item => item.id === id)?.item_name || 'Item';
      setStockItems(stockItems.filter(item => item.id !== id));
      showToast(`${deletedItemName} deleted successfully.`, 'success');

    } catch (err) {
      console.error("Delete error:", err);
      showToast("An unexpected error occurred during deletion.", 'error');
    } finally {
      setLoading(false);
    }
  };
    
    // This function starts the confirmation flow
    const startDelete = (item) => {
        setDeleteConfirm(item);
    };

  // --- Filtering and Sorting Logic (Unchanged) ---
  const filteredItems = stockItems
    .filter(item => {
        const itemName = item.item_name ?? ''; 
        const description = item.description ?? '';
        const categoryName = item.category_name ?? '';

        return itemName.toLowerCase().includes(search.toLowerCase()) || 
               description.toLowerCase().includes(search.toLowerCase()) ||
               categoryName.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortOption === "quantity_low") return a.quantity - b.quantity;
      if (sortOption === "quantity_high") return b.quantity - a.quantity;
      
        if (sortOption === "name_asc") {
            const nameA = a.item_name ?? '';
            const nameB = b.item_name ?? '';
            return nameA.localeCompare(nameB);
        }
      if (sortOption === "name_desc") {
            const nameA = a.item_name ?? '';
            const nameB = b.item_name ?? '';
            return nameB.localeCompare(nameA);
        }
      return 0;
    });

  // --- Render Form Helper (Unchanged) ---
  const renderFormFields = (data, isEdit = false) => (
    <>
     
      {/* Date & Category - One Row */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <label className="text-sm font-medium">Date Added *</label>
          <input 
            type="date" 
            name="dateAdded" 
            value={data.dateAdded} 
            onChange={handleChange}
            className={`w-full border-b-2 border-dotted border-black p-2 text-sm ${isEdit ? 'bg-white' : 'bg-gray-200'}`}
          />
        </div>
        <div className="flex-1 flex gap-1 items-end">
          <div className="flex-grow">
            <label className="text-sm font-medium">Category *</label>
            <select 
              name="category" 
              value={data.category} 
              onChange={handleChange} 
              className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          {!isEdit && (
            <button 
              type="button" 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex-shrink-0 p-2 hidden bg-black text-white rounded-md mb-1 ml-2 hover:bg-black/50 transition"
              title="Add New Category"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Item Name */}
      <label className="text-sm font-medium">Item Name *</label>
      <input 
        type="text" 
        name="itemName" 
        value={data.itemName} 
        onChange={handleChange} 
        placeholder="Item Name"
        className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6" 
      />

      {/* Quantity */}
      <label className="text-sm font-medium">Quantity *</label>
      <input 
        type="number" 
        name="quantity" 
        value={data.quantity} 
        onChange={handleChange} 
        placeholder="Enter current quantity..."
        className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6" 
      />

      {/* Description */}
      <label className="text-sm font-medium">Description *</label>
      <textarea 
        name="description" 
        value={data.description} 
        onChange={handleChange} 
        placeholder="Write short description/details..." 
        className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6" 
      />
    </>
  );

  return (
    <div className='bg-[#F1F2F4] min-h-screen p-8'>
        
        {/* Main Content Container with Max Width and Auto Margins (mx-auto) */}
      <div className="flex gap-6 mx-auto max-w-8xl">
      
      {/* 1. Add Stock Item Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-300 rounded-xl p-8 shadow-md w-full max-w-lg h-fit">
        <h2 className="text-xl font-semibold mb-6">Add Stock Item</h2>

        {error && !isEditModalOpen && <p className="text-red-600 text-sm mb-4"><AlertCircle size={16} className="inline mr-1"/>{error}</p>}
        {loading && !isEditModalOpen && <p className="text-blue-600 text-sm mb-4">Processing request...</p>}

        {renderFormFields(form, false)}

        <button 
          type="submit" 
          className="w-full bg-black cursor-pointer text-white py-2 mt-8 rounded-md hover:bg-gray-900 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Stock'}
        </button>
      </form>

      {/* 2. Stock Items Table */}
      <div className="w-full">
        
        {/* Search, Sort Controls + Excel Export 🔥 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 bg-white border border-gray-300 rounded-xl p-4 shadow-md">
          <div className="relative w-full lg:w-1/2">
            <input 
              type="text" 
              placeholder="Search by Name, Category, or Description..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              disabled={loading}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <select 
              value={sortOption} 
              onChange={e => setSortOption(e.target.value)} 
              className="border border-gray-400 rounded-md px-3 py-2 flex-1 lg:flex-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Sort by</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="quantity_low">Quantity (Low → High)</option>
              <option value="quantity_high">Quantity (High → Low)</option>
            </select>
            
            {/* 🔥 EXCEL EXPORT BUTTON */}
            <button
              onClick={() => exportToExcel(filteredItems, showToast)}
              disabled={loading || filteredItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r cursor-pointer from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 shadow-md transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="Export filtered stock items to Excel"
            >
              <Download size={16} />
              Excel ({filteredItems.length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-md overflow-auto max-h-[70vh]">
          <h2 className="text-lg font-semibold mb-4 text-center">
            Stock Items ({filteredItems.length})
          </h2>

          <table className="w-full border-collapse text-sm">
            <thead className="bg-black text-white sticky top-0 z-10">
              <tr>
                <th className="border p-3">ID</th>
                <th className="border p-3">Date Added</th>
                <th className="border p-3">Item Name</th>
                <th className="border p-3">Category</th>
                <th className="border p-3">Quantity</th>
                <th className="border p-3 max-w-xs">Description</th>
                <th className="border p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && stockItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-blue-500">
                    Loading stock items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No stock items added or matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b">
                    {/* Hidden Real ID */}
                    <td className="border p-3 font-mono hidden">{item.id}</td>

                    {/* Display Index */}
                    <td className="border p-3 font-mono">{index + 1}</td>

                    <td className="border p-3">{item.date}</td>

                    <td className="border p-3 font-semibold">{item.item_name}</td>

                    <td className="border p-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        {item.category_name}
                      </span>
                    </td>

                    <td className="border p-3">{item.quantity}</td>

                    <td
                      className="border p-3 max-w-xs truncate"
                      title={item.description}
                    >
                      {item.description}
                    </td>

                    <td className="border p-3 flex gap-2 justify-center">
                      {/* Edit Button */}
                      <button
                        onClick={() => startEdit(item)}
                        className="bg-blue-600 text-white cursor-pointer px-6 py-1 font-bold rounded text-xs hover:bg-blue-700 shadow-md transition"
                        disabled={loading}
                        title="Edit Item"
                      >
                         Edit 
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => startDelete(item)}
                        className="bg-red-600 text-white cursor-pointer px-3 py-1 rounded text-xs hover:bg-red-700 shadow-md transition"
                        disabled={loading}
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
    
    {/* --- Modals and Toasts --- */}

      {/* 3. Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Add New Category</h3>
            <label className="text-sm font-medium">Category Name</label>
            <input
              type="text"
              placeholder="Enter category name..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="w-full p-3 border border-gray-400 rounded-md mb-6 mt-1"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 rounded-md text-sm hover:bg-gray-100 transition"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-700 transition disabled:opacity-50"
                disabled={loading}
                onClick={handleAddCategory}
              >
                {loading ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Stock Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-xl p-8 max-w-lg w-full shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">Edit Stock Item</h3>
                    <button type="button" onClick={() => {setIsEditModalOpen(false); setEditingItem(null); setError('');}}>
                        <X size={24} className="text-gray-500 hover:text-black"/>
                    </button>
                </div>

                {error && <p className="text-red-600 text-sm mb-4"><AlertCircle size={16} className="inline mr-1"/>{error}</p>}
                {loading && <p className="text-blue-600 text-sm mb-4">Updating item...</p>}

                {renderFormFields(editingItem, true)}

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 rounded-md text-sm hover:bg-gray-100 transition"
                onClick={() => {setIsEditModalOpen(false); setEditingItem(null); setError('');}}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
      
    {/* 5. Delete Confirmation Modal */}
    {deleteConfirm && (
        <DeleteConfirmationModal
            item={deleteConfirm}
            onConfirm={executeDelete}
            onCancel={() => setDeleteConfirm(null)}
        />
    )}

    {/* 6. Toast Notification Renderer */}
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

export default StockManagement;
