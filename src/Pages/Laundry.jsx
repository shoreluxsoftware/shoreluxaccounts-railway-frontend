import React, { useState, useEffect, useCallback } from "react";
import { Search, X, AlertCircle, CheckCircle } from 'lucide-react'; 

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

const Laundry = () => {
  const [sendForm, setSendForm] = useState({
    products: [{ item_id: "", quantity: "" }],
    description: "",
    company_name: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("send_date_newest"); // 🔥 DEFAULT: Send Newest
  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingItem, setUpdatingItem] = useState(null);
  
  const [editModal, setEditModal] = useState({ 
    open: false, 
    logId: null, 
    logProducts: [] 
  });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [receivedQuantity, setReceivedQuantity] = useState("");

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('access_token');
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  const getProductNameById = (id) => {
    const product = productOptions.find(p => p.id === Number(id));
    return product ? product.item_name : null;
  };

  const getProductDetailsById = (id) => {
    return productOptions.find(p => p.id === Number(id));
  };

  const fetchLaundryItems = useCallback(async () => {
    try {
      const url = `${API_BASE_URL}/staff-management/list-laundry-items`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to load laundry items");
      const result = await response.json();
      setProductOptions(result.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      showToast("Failed to load laundry product options", 'error');
    }
  }, [getAuthHeaders, showToast]);

  const fetchLaundryLogs = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/staff-management/list-laundry-logs`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to load laundry logs");
      const result = await response.json();
      setEntries(result.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      showToast("Failed to load laundry logs", 'error');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchLaundryItems();
    fetchLaundryLogs();
  }, [fetchLaundryItems, fetchLaundryLogs]);

  const handleSendProductChange = (index, field, value) => {
    const updated = [...sendForm.products];
    updated[index][field] = value;
    setSendForm({ ...sendForm, products: updated });
  };

  const addSendProductField = () => {
    setSendForm({
      ...sendForm,
      products: [...sendForm.products, { item_id: "", quantity: "" }],
    });
  };

  const removeSendProductField = (index) => {
    if (sendForm.products.length > 1) {
      const updated = sendForm.products.filter((_, i) => i !== index);
      setSendForm({ ...sendForm, products: updated });
    }
  };

  const handleSendChange = (e) => {
    setSendForm({ ...sendForm, [e.target.name]: e.target.value });
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();

    if (!sendForm.company_name.trim()) {
      showToast("Company name is required", 'error');
      return;
    }

    const validProducts = sendForm.products.filter(p => 
      p.item_id && p.quantity && parseInt(p.quantity) > 0
    );

    if (validProducts.length === 0) {
      showToast("Add at least one valid product", 'error');
      return;
    }

    if (!sendForm.description.trim()) {
      showToast("Description required", 'error');
      return;
    }

    const stockIssues = validProducts
      .map(p => {
        const product = getProductDetailsById(p.item_id);
        return {
          item_id: p.item_id,
          item_name: getProductNameById(p.item_id),
          requested: parseInt(p.quantity),
          available: product?.quantity || 0
        };
      })
      .filter(item => item.requested > item.available);

    if (stockIssues.length > 0) {
      const errorMsg = stockIssues.map(issue => 
        `${issue.item_name}: ${issue.requested} > ${issue.available}`
      ).join('\n');
      showToast("Stock exceeded:\n" + errorMsg, 'error');
      return;
    }

    setError("");
    setLoading(true);

    const productsUsedPayload = validProducts.map((p) => ({
      item_id: Number(p.item_id),
      quantity: Number(p.quantity),
      item_name: getProductNameById(p.item_id),
    }));

    const payload = {
      company_name: sendForm.company_name.trim(),
      description: sendForm.description.trim(),
      date: sendForm.date,
      products_used: productsUsedPayload, 
    };

    try {
      const response = await fetch(`${API_BASE_URL}/staff-management/log-laundry`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to log laundry");
      }
      
      showToast("✅ Laundry logged!", 'success');
      await fetchLaundryLogs();
      setSendForm({
        products: [{ item_id: "", quantity: "" }],
        description: "",
        company_name: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      showToast(err.message || "Failed to submit", 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (logId, logProducts) => {
    setEditModal({ open: true, logId, logProducts: logProducts || [] });
    setSelectedProductId("");
    setReceivedQuantity("");
  };

  const handleUpdateReceivedItem = async () => {
    if (!selectedProductId || !receivedQuantity || parseInt(receivedQuantity) <= 0) {
      showToast("Select product + valid quantity", 'error');
      return;
    }

    const selectedProduct = editModal.logProducts.find(p => p.item_id === parseInt(selectedProductId));
    if (!selectedProduct) {
      showToast("Product not found", 'error');
      return;
    }

    if (parseInt(receivedQuantity) > selectedProduct.quantity) {
      showToast(`Max: ${selectedProduct.quantity}`, 'error');
      return;
    }

    setUpdatingItem({ logId: editModal.logId, itemId: selectedProductId });
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/staff-management/update-laundry-received/${editModal.logId}/${selectedProductId}`, 
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            received_quantity: parseInt(receivedQuantity),
            received_date: new Date().toISOString().split("T")[0],
          }),
        }
      );
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      showToast(`✅ ${selectedProduct.item_name}: ${receivedQuantity} received`, 'success');
      await fetchLaundryLogs();
      setEditModal({ open: false, logId: null, logProducts: [] });
    } catch (err) {
      showToast(`❌ Update failed: ${err.message}`, 'error');
    } finally {
      setUpdatingItem(null);
    }
  };

  // 🔥 FILTER & SORT WITH DEFAULT SEND NEWEST
  const filteredEntries = entries
    .filter((entry) =>
      entry.description?.toLowerCase().includes(search.toLowerCase()) ||
      entry.company_name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "received_newest") {
        return new Date(b.received_date || 0) - new Date(a.received_date || 0);
      }
      if (sortOption === "received_oldest") {
        return new Date(a.received_date || 0) - new Date(b.received_date || 0);
      }
      if (sortOption === "send_date_newest") {
        return new Date(b.date) - new Date(a.date); // 🔥 DEFAULT: NEWEST FIRST
      }
      if (sortOption === "send_date_oldest") {
        return new Date(a.date) - new Date(b.date);
      }
      return new Date(b.date) - new Date(a.date); // 🔥 FALLBACK: Send Newest
    });

  const isFullyUpdated = (products_used) => {
    return products_used?.every(p => 
      p.received_quantity !== undefined && p.received_quantity === p.quantity
    ) || false;
  };

  return (
    <div className="flex gap-6 px-6 py-8 bg-[#F1F2F4]">
      {/* 🔥 FORM */}
      <form onSubmit={handleSendSubmit} className="bg-white border border-gray-300 rounded-xl p-8 shadow-md w-full max-w-lg overflow-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-6">Send Laundry</h2>
        {error && (
          <p className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded flex items-center">
            <AlertCircle size={16} className="mr-2" />{error}
          </p>
        )}
        {loading && <p className="text-blue-600 text-sm mb-4">Processing...</p>}
        


        <label className="text-sm font-medium">Date <span className="text-red-600">*</span></label>
        <input type="date" name="date" value={sendForm.date} readOnly className="w-full border-b-2 border-dotted border-black p-2 bg-gray-200 text-sm mb-6 cursor-not-allowed" />



                <label className="text-sm font-medium mb-1 block">Company Name <span className="text-red-600">*</span></label>
        <input 
          type="text" 
          name="company_name"
          value={sendForm.company_name}
          onChange={handleSendChange}
          placeholder="Enter company name (e.g., ABC Hotel)"
          className="w-full border-b-2 border-dotted border-black p-2 bg-transparent text-sm mb-6"
          disabled={loading}
        />

        <label className="text-sm font-medium">Products & Quantities <span className="text-red-600">*</span></label>
        {sendForm.products.map((p, i) => {
          const product = getProductDetailsById(p.item_id);
          const stockAvailable = product ? product.quantity : 0;
          const isOverStock = p.quantity && product && parseInt(p.quantity) > stockAvailable;
          
          return (
            <div key={i} className="flex gap-2 mb-4 items-center">
              <select 
                value={p.item_id} 
                onChange={(e) => handleSendProductChange(i, "item_id", e.target.value)} 
                className="flex-1 border-b-2 border-dotted border-black p-2 bg-transparent text-sm"
                disabled={loading}
              >
                <option value="">Select product</option>
                {productOptions.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.item_name} (Stock: {prod.quantity})
                  </option>
                ))}
              </select>
              <input 
                type="number" 
                min="1" 
                max={stockAvailable}
                value={p.quantity} 
                onChange={(e) => handleSendProductChange(i, "quantity", e.target.value)} 
                placeholder="Qty"
                className={`w-20 border-b-2 border-dotted p-2 bg-transparent text-sm ${
                  isOverStock ? 'border-red-500 text-red-600' : 'border-black'
                }`}
                disabled={loading}
              />
              {isOverStock && <span className="text-red-600 text-xs ml-1">⚠️ Max: {stockAvailable}</span>}
              {sendForm.products.length > 1 && (
                <button type="button" onClick={() => removeSendProductField(i)} className="text-red-600 font-bold px-1" disabled={loading}>×</button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={addSendProductField} className="mb-6 cursor-pointer px-4 py-2 bg-black text-white rounded-lg shadow-md hover:bg-gray-800 transition disabled:opacity-50" disabled={loading}>
          + Add Another Product
        </button>
        <br />

        <label className="text-sm font-medium">Description <span className="text-red-600">*</span></label>
        <textarea name="description" value={sendForm.description} onChange={handleSendChange} placeholder="Describe laundry items" className="w-full border-b-2 border-dotted border-black p-2 text-sm h-20 bg-transparent mb-6" disabled={loading} />

        <button type="submit" className="w-full bg-black cursor-pointer text-white py-2 mt-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50" disabled={loading}>
          {loading ? "Sending..." : "Send Laundry"}
        </button>
      </form>

      {/* 🔥 TABLE WITH INDEX COLUMN */}
      <div className="flex-1">
        <div className="flex justify-between mb-3">
          <div className="relative w-1/2">
            <input
              type="text"
              placeholder="Search description or company..."
              className="border border-gray-400 rounded-md pl-10 pr-3 py-2 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
          
          <select className="border border-gray-400 rounded-md px-3 py-2" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="send_date_newest">Send (Newest) ↑</option> {/* 🔥 DEFAULT SELECTED */}
            <option value="send_date_oldest">Send (Oldest)</option>
            <option value="received_newest">Received (Newest)</option>
            <option value="received_oldest">Received (Oldest)</option>
          </select>
        </div>

        <div className="overflow-auto bg-white rounded-lg shadow-md border border-gray-300 max-h-[70vh]">
<table className="w-full border-collapse">
  <thead className="bg-black text-white sticky top-0 z-100">
    <tr>
      <th className="border p-3 text-sm w-12">#</th> {/* 🔥 INDEX COLUMN */}
      <th className="border p-3 text-sm w-18">Company</th> {/* 🔥 SMALL WIDTH */}
      <th className="border p-3 text-sm">Send Date</th>
      <th className="border p-3 text-sm">Products(Quantity)</th>
      <th className="border p-3 text-sm">Description</th>
      <th className="border p-3 text-sm">Received</th>
      <th className="border p-3 text-sm">Action</th>
    </tr>
  </thead>
  <tbody>
    {loading && entries.length === 0 ? (
      <tr><td colSpan="7" className="text-center py-6 text-blue-500">Loading...</td></tr>
    ) : filteredEntries.length === 0 ? (
      <tr><td colSpan="7" className="text-center py-6 text-gray-500">No entries</td></tr>
    ) : (
      filteredEntries.map((entry, index) => {
        const fullyUpdated = isFullyUpdated(entry.products_used);
        
        return (
          <tr key={entry.id} className="hover:bg-gray-50 border-b">
            <td className="border p-3 text-sm font-bold bg-gray-100 text-center">
              {index + 1}
            </td>
            <td className="border p-3 text-sm w-18 font-semibold bg-gray-50 truncate"> {/* 🔥 TRUNCATE FOR SMALL WIDTH */}
              {entry.company_name}
            </td>
            <td className="border p-3 text-sm font-medium">{entry.date}</td>
            
            <td className="border p-3 text-sm max-w-xs">
              <div className="space-y-1">
                {entry.products_used?.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="font-medium text-xs truncate">{p.item_name}</span>
                    <span className="text-xs font-bold text-right">{p.quantity}</span>
                  </div>
                )) || "No products"}
                {entry.products_used?.length > 4 && (
                  <div className="text-xs text-gray-500 mt-2">+{entry.products_used.length - 4} more</div>
                )}
              </div>
            </td>
            
            <td className="border p-3 text-sm max-w-xs">{entry.description}</td>
            
            <td className="border p-3 text-sm max-w-xs">
              {entry.products_used?.filter(p => p.received_quantity > 0).length > 0 ? (
                <div className="space-y-1.5">
                  {entry.products_used?.filter(p => p.received_quantity > 0).slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-green-50 rounded border-l-4 border-green-400">
                      <span className="text-xs font-medium truncate flex-1">{p.item_name}</span>
                      <div className="text-xs text-right ml-2">
                        <div className="font-bold text-green-600">{p.received_quantity}</div>
                        <div className="text-green-500 text-[10px]">{p.received_date?.slice(5,10) || '-'}</div>
                      </div>
                    </div>
                  ))}
                  {entry.products_used?.filter(p => p.received_quantity > 0).length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-1">
                      +{entry.products_used.filter(p => p.received_quantity > 0).length - 3} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded">
                  No items received yet
                </div>
              )}
              {entry.products_used?.some(p => p.received_quantity === undefined || p.received_quantity === 0) && (
                <div className="mt-1 text-xs text-orange-500 text-center py-1 bg-orange-50/50 rounded border border-orange-200">
                  {entry.products_used.filter(p => p.received_quantity === undefined || p.received_quantity === 0).length} pending
                </div>
              )}
            </td>
            
            <td className="border p-3 text-sm whitespace-nowrap">
              <button
                onClick={() => !fullyUpdated && openEditModal(entry.id, entry.products_used || [])}
                disabled={fullyUpdated || updatingItem?.logId === entry.id}
                className={`px-4 py-2 cursor-pointer rounded text-xs font-bold transition-all w-full ${
                  fullyUpdated
                    ? 'bg-gray-200 text-black cursor-not-allowed opacity-75'
                    : updatingItem?.logId === entry.id
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {updatingItem?.logId === entry.id 
                  ? "Updating..." 
                  : fullyUpdated 
                  ? "UPDATED" 
                  : "Update Received"
                }
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

      {/* 🔥 MODAL */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-500">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-6">Update Received Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Product *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose from this laundry...</option>
                  {editModal.logProducts.map((product) => (
                    <option key={product.item_id} value={product.item_id}>
                      {product.item_name} (Sent: {product.quantity})
                    </option>
                  ))}
                </select>
              </div>
              {selectedProductId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Received Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    max={editModal.logProducts.find(p => p.item_id === parseInt(selectedProductId))?.quantity || 0}
                    value={receivedQuantity}
                    onChange={(e) => setReceivedQuantity(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditModal({ open: false, logId: null, logProducts: [] })}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                disabled={updatingItem !== null}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReceivedItem}
                disabled={!selectedProductId || !receivedQuantity || updatingItem !== null}
                className="px-6 py-2 bg-green-600 text-white cursor-pointer rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
              >
                {updatingItem !== null ? "Saving..." : "Save Received"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 TOAST */}
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

export default Laundry;
