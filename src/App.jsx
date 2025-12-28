import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom"; // Import Navigate

import Home from "./Pages/Home";
import Login from "./Login";
import Header from "./components/Header";
import Expenses from "./Pages/Expenses";
import Sales from "./Pages/Sales";
import Cleaning from "./Pages/Cleaning";
import Laundry from "./Pages/Laundry";
import StaffCreate from "./Pages/StaffCreate";
import Booking from "./Pages/Booking";
import StockManagement from "./Pages/StockManagement";
import BookingList from "./Pages/BookingList";
import OtherIncome from "./Pages/OtherIncome";
import DayBook from "./Pages/DayBook";
import Ledger from "./Pages/Ledger";
import IncomeReports from "./Reports/IncomeReports";
import ExpensesReports from "./Reports/Expensereports";
import VoucherCreate from "./Pages/VoucherCreate";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CafeExpense from "./Pages/CafeExpense";
import SalaryExpense from "./Pages/SalaryExpense";

// Helper function to check if the user is authenticated
const isAuthenticated = () => {
    // Check if the access token exists in localStorage
    return !!localStorage.getItem('access_token');
};

// Wrapper function for protected components
const getProtectedElement = (Component) => {
    return isAuthenticated() ? <Component /> : <Navigate to="/" replace />;
};

const App = () => {
    const location = useLocation();

    return (
        <div>
            {/* Show header only if not on login page */}
            {location.pathname !== "/" && <Header />}

            <ToastContainer
                position="top-center"
                autoClose={2500}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                pauseOnHover
                theme="dark"
                style={{ zIndex: 99999 }} // 🔥 Higher priority
            />

            <Routes>
                {/* Public Route: Login */}
                <Route path="/" element={<Login />} />

                {/* Protected Routes: Use the getProtectedElement wrapper function */}
                <Route path="/home" element={getProtectedElement(Home)} />
                <Route path="/expenses" element={getProtectedElement(Expenses)} />
                <Route path="/sales" element={getProtectedElement(Sales)} />
                <Route path="/cleaning" element={getProtectedElement(Cleaning)} />
                <Route path="/laundry" element={getProtectedElement(Laundry)} />
                <Route path="/staffcreation" element={getProtectedElement(StaffCreate)} />
                <Route path="/booking" element={getProtectedElement(Booking)} />
                <Route path="/stockmanage" element={getProtectedElement(StockManagement)} />
                <Route path="/bookinglist" element={getProtectedElement(BookingList)} />
                <Route path="/otherincome" element={getProtectedElement(OtherIncome)} />
                <Route path="/daybook" element={getProtectedElement(DayBook)} />
                <Route path="/ledger" element={getProtectedElement(Ledger)} />
                <Route path="/incomereports" element={getProtectedElement(IncomeReports)} />
                <Route path="/expensereports" element={getProtectedElement(ExpensesReports)} />
                <Route path="/vouchercreate" element={getProtectedElement(VoucherCreate)} />
                <Route path="/cafeteriaexpense" element={getProtectedElement(CafeExpense)} />
                <Route path="/salaryexpense" element={getProtectedElement(SalaryExpense)} />
            </Routes>
        </div>
    );
};

export default App;