import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    staffCode: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      login_type: role === "admin" ? "ADMIN" : "STAFF",
      username: form.username,
      password: form.password,
      ...(role === "staff" && { staff_unique_id: form.staffCode }),
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/login/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "❌ Login failed");
        setLoading(false);
        return;
      }

      // Save data
      localStorage.setItem("access_token", data.token.access);
      localStorage.setItem("refresh_token", data.token.refresh);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);

      // ---- Toast Message ----
      if (data.role === "ADMIN") {
        toast.success(` Welcome Admin`);
      } else {
        toast.success(` Welcome ${form.staffCode}`);
      }

      // Redirect after success
      setTimeout(() => navigate("/home"), 1200);

    } catch (error) {
      console.error("Login Error:", error);
      toast.error("⚠️ Something went wrong! Try again later.");
    }

    setLoading(false);
  };

  return (
    <>
      <div className="w-screen h-screen bg-[#F1F2F4] flex justify-center items-center">
        <div className="bg-white p-10 rounded-lg shadow-lg w-[380px] border border-gray-100">
          <h2 className="text-xl font-semibold text-center text-black mb-6">
            Shorelux | Secure Login
          </h2>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-black rounded-md p-2 mb-4 w-full outline-none focus:ring-1 bg-white"
          >
            <option value="admin">ADMIN</option>
            <option value="staff">STAFF</option>
          </select>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              className="border border-black rounded-md p-2 outline-none bg-white"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="border border-black rounded-md p-2 w-full outline-none bg-white"
                required
              />
              <span
                className="absolute right-3 top-3 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            {role === "staff" && (
              <input
                type="text"
                name="staffCode"
                placeholder="Staff Code"
                value={form.staffCode}
                onChange={handleChange}
                className="border border-black rounded-md p-2 outline-none bg-white"
                required
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white cursor-pointer py-2 rounded-md hover:bg-gray-900 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-gray-500 text-xs text-center mt-6">
            © {new Date().getFullYear()} Shorelux Kovalam | Confidential Access
          </p>
        </div>
      </div>
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default Login;
