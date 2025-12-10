import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../../services/authService";

const currentYear = new Date().getFullYear();

const Login = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await login({
                username: form.username.trim(),
                password: form.password,
            });

            // simpan token
            localStorage.setItem("token", res.token);

            // simpan user
            const userPayload = {
                id: res.id ?? null,
                username: res.username ?? "",
                email: res.email ?? "",
                role: res.role ?? null,
                employeeId: res.employeeId ?? null,
                isFirstLogin: res.isFirstLogin ?? false,
            };
            localStorage.setItem("user", JSON.stringify(userPayload));

            navigate("/dashboard", { replace: true });
        } catch (err) {
            const msg =
                err?.response?.data?.message || err?.response?.data?.error || "Login gagal. Cek username/password!";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-300">
            <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body gap-4">
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold text-accent">Mega Certification</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* USERNAME */}
                        <label className="form-control">
                            <span className="label-text font-semibold pb-1 text-base-content/70">Username</span>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Username"
                                autoFocus
                                required
                                value={form.username}
                                onChange={handleChange("username")}
                            />
                        </label>

                        {/* SPACING ANTAR FIELD */}
                        <div className="h-0.5"></div>

                        {/* PASSWORD */}
                        <label className="form-control">
                            <span className="label-text font-semibold pb-1 text-base-content/70">Password</span>
                            <input
                                type="password"
                                className="input input-bordered w-full"
                                placeholder="Password"
                                required
                                value={form.password}
                                onChange={handleChange("password")}
                            />
                        </label>

                        {/* FORGOT PASSWORD LINK */}
                        <div className="flex items-center justify-between text-xs">
                            <div />
                            <Link to="/forgot-password" className="link link-primary">
                                Lupa password?
                            </Link>
                        </div>

                        {/* LOGIN BUTTON */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-block rounded-xl font-bold"
                            disabled={loading}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>

                        {/* ERROR MESSAGE */}
                        {error && <p className="text-error text-center text-xs mt-1">{error}</p>}
                    </form>

                    <p className="text-xs text-base-content/60 mt-4 text-center">
                        © {currentYear} Bank Mega. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
