import React, { useState } from "react";
import axios from "axios";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            // Call API ke backend lo
            const res = await axios.post("http://localhost:8080/api/auth/login", {
                username,
                password,
            });

            // Simpan token, role, username, email ke localStorage
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("username", res.data.username || "");
            localStorage.setItem("email", res.data.email || "");
            // Role bisa array atau string, cek responsenya
            if (res.data.roles) {
                localStorage.setItem("role", res.data.roles[0]);
            } else if (res.data.role) {
                localStorage.setItem("role", res.data.role);
            }

            // Redirect ke dashboard
            window.location.href = "/dashboard";
        } catch (err) {
            setError(err.response?.data?.message || "Login gagal. Cek username/password!");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-300">
            <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body">
                    <h2 className="text-center text-2xl font-bold mb-2 text-primary">Mega Certification</h2>
                    <form onSubmit={handleLogin} className="space-y-3">
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold pb-1">Username</span>
                            </label>
                            <input
                                className="input input-bordered w-full"
                                type="text"
                                placeholder="Username"
                                autoFocus
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold pb-1">Password</span>
                            </label>
                            <input
                                className="input input-bordered w-full"
                                type="password"
                                placeholder="Password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <a href="/forgot-password" className="link link-primary text-sm flex justify-end mb-2">
                            Lupa password?
                        </a>
                        <button className="btn btn-primary btn-block rounded-xl font-bold text-lg">Login</button>
                        {error && <div className="text-error text-center text-xs mt-2">{error}</div>}
                    </form>
                    <span className="text-xs text-base-content/60 mt-6 block text-center">
                        © {new Date().getFullYear()} Bank Mega. All rights reserved.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Login;
