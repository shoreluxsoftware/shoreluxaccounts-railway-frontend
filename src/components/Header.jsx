import React, { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png"; // Update path if needed
import { Menu, X, ChevronDown, LogOut } from "lucide-react"; 
import { useNavigate, useLocation } from "react-router-dom";

const Header = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // *** NEW: useRef to hold the timeout ID for the delay ***
  const dropdownTimeoutRef = useRef(null); 

  // 1. Initialize role state from localStorage on first render
  const [role, setRole] = useState(props.role || localStorage.getItem("role") || "GUEST");

  // 2. Use useEffect to listen for role changes (optional, but good for dynamic updates)
  useEffect(() => {
    const updateRole = () => {
        setRole(localStorage.getItem("role") || "GUEST");
    };

    window.addEventListener('roleChange', updateRole);
    updateRole();

    return () => {
        window.removeEventListener('roleChange', updateRole);
        if (dropdownTimeoutRef.current) {
            clearTimeout(dropdownTimeoutRef.current);
        }
    };
  }, []);

  // --- Timeout Handlers for Desktop Menu ---
  const handleMouseEnter = (menuTitle) => {
      if (dropdownTimeoutRef.current) {
          clearTimeout(dropdownTimeoutRef.current);
      }
      setActiveDropdown(menuTitle);
  };

  const handleMouseLeave = () => {
      dropdownTimeoutRef.current = setTimeout(() => {
          setActiveDropdown(null);
      }, 100);
  };
  // ------------------------------------------

  // --- Logout Handler ---
  const handleLogout = () => {
    localStorage.removeItem("access_token"); 
    localStorage.removeItem("user_role"); 
    localStorage.removeItem("role"); 
    setRole("GUEST");
    navigate("/"); 
    setMobileOpen(false); 
  };
  // ------------------------

  // 🔥 NEW MENU STRUCTURE
  const menus = [
    { title: "Dashboard", path: "/home" },
    {
      title: "Bookings",
      children: [
        { name: "Add Booking", path: "/booking" },
        { name: "Booking List", path: "/bookinglist" },
      ],
    },
    { title: "Create Voucher", path: "/vouchercreate" },
    { title: "Expenses", path: "/expenses" },
    
    // 🔥 CAFETERIA DROPDOWN
    {
      title: "Cafeteria",
      children: [
        { name: "Cafeteria Sales", path: "/sales" },
        { name: "Cafeteria Expense", path: "/cafeteriaexpense" },
      ],
    },
    
    // 🔥 SALARY EXPENSE
    { title: "Salary Expense", path: "/salaryexpense" },
    
    {
      title: "Income",
      children: [
        { name: "Other Income", path: "/otherincome" },
      ],
    },
    { title: "Stock Management", path: "/stockmanage" },
    {
      title: "Operations",
      children: [
        { name: "Laundry", path: "/laundry" },
        { name: "Room Cleaning", path: "/cleaning" },
      ],
    },
    
    // 🔥 LEDGER + DAYBOOK DROPDOWN
    {
      title: "Accounts",
      children: [
        { name: "Daybook", path: "/daybook" },
        { name: "Ledger", path: "/ledger" },
      ],
    },
    
    // Staff Creation: visible ONLY if role is "ADMIN"
    ...(role === "ADMIN" ? [{ title: "Staff Creation", path: "/staffcreation" }] : []),
    
    {
      title: "Reports",
      children: [
        { name: "Income Reports", path: "/incomereports" },
        { name: "Expense Reports", path: "/expensereports" },
      ],
    },
  ];
  // -----------------------------------------------------------

  const isActive = (menu) => {
    if (menu.path && location.pathname === menu.path) return true;
    if (menu.children) {
      return menu.children.some((child) => location.pathname === child.path);
    }
    return false;
  };
  
  const isChildActive = (path) => location.pathname === path;

  return (
    <header className="w-full bg-white shadow-md border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-50">
      {/* <img
        src={logo}
        alt="Shorelux Logo"
        className="h-12 w-auto cursor-pointer"
        onClick={() => navigate("/home")}
      /> */}

      {/* Desktop Menu */}
      <nav className="hidden md:flex gap-6">
        {menus.map((menu, i) => (
          <div
            key={i}
            className="relative"
            onMouseEnter={() => menu.children && handleMouseEnter(menu.title)}
            onMouseLeave={() => menu.children && handleMouseLeave()}
          >
            <span
              className={`cursor-pointer flex items-center gap-1 transition ${
                isActive(menu)
                  ? "font-bold text-black"
                  : "text-black hover:text-gray-500"
              }`}
              onClick={() => !menu.children && navigate(menu.path)}
            >
              {menu.title}
              {menu.children && <ChevronDown size={14} />}
            </span>
            {/* Dropdown menu */}
            {menu.children && activeDropdown === menu.title && (
              <div
                className={`absolute mt-2 bg-white shadow-lg border border-gray-200 rounded-md w-44 z-50
                  ${i > menus.length - 4 ? "right-0" : "left-0"}`}
              >
                {menu.children.map((child, j) => (
                  <div
                    key={j}
                    className={`px-3 py-2 text-sm cursor-pointer transition ${
                      isChildActive(child.path)
                        ? "font-semibold text-blue-600 bg-gray-100"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => navigate(child.path)}
                  >
                    {child.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Right-aligned actions (Logout + Mobile Menu Toggle) */}
      <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="text-gray-600 cursor-pointer hover:text-red-600 transition p-2 rounded-full hover:bg-gray-100"
            aria-label="Logout"
          >
            <LogOut size={24} />
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-black p-2"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
      </div>

      {/* Mobile Sidebar Menu */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-xl w-64 p-5 transition-transform duration-300 md:hidden overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <h2 className="font-semibold mb-6 text-lg border-b pb-4">
          <img src={logo} alt="Shorelux Logo" className="h-8 w-auto inline-block" />
        </h2>
        {menus.map((menu, i) => (
          <div key={i} className="pb-3 border-b">
            <div
              className={`flex justify-between items-center py-2 cursor-pointer transition ${
                isActive(menu)
                  ? "font-bold text-blue-600"
                  : "text-black hover:text-gray-700"
              }`}
              onClick={() =>
                menu.children
                  ? setActiveDropdown(
                      activeDropdown === menu.title ? null : menu.title
                    )
                  : (navigate(menu.path), setMobileOpen(false))
              }
            >
              <span>{menu.title}</span>
              {menu.children && <ChevronDown size={16} />}
            </div>
            {menu.children && activeDropdown === menu.title && (
              <div className="ml-3 text-sm text-gray-700 overflow-hidden transition-all max-h-40">
                {menu.children.map((child, j) => (
                  <p
                    key={j}
                    className={`py-1 cursor-pointer transition ${
                      isChildActive(child.path)
                        ? "font-semibold text-blue-600"
                        : "hover:text-black"
                    }`}
                    onClick={() => {
                      navigate(child.path);
                      setMobileOpen(false);
                    }}
                  >
                    {child.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </header>
  );
};

export default Header;
