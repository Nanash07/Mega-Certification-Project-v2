import { Link } from "react-router-dom";

const currentYear = new Date().getFullYear();

const ResetPasswordInvalid = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-300">
            <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body gap-4 text-center">
                    {/* HEADER */}
                    <h1 className="text-2xl font-bold text-error">Token Tidak Valid</h1>

                    {/* DESCRIPTION */}
                    <p className="text-xs text-base-content/70 leading-relaxed">
                        Token reset password Anda sudah <b>kadaluarsa</b>, <b>tidak valid</b>, atau sudah{" "}
                        <b>pernah digunakan</b>.
                    </p>

                    {/* ACTION BUTTON */}
                    <Link to="/forgot-password" className="btn btn-primary btn-block rounded-xl font-bold">
                        Kirim Ulang Reset Password
                    </Link>

                    {/* BACK LINK */}
                    <Link to="/login" className="link link-primary text-xs mt-1">
                        Kembali ke Login
                    </Link>

                    {/* FOOTER */}
                    <p className="text-xs text-base-content/60">© {currentYear} Bank Mega. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordInvalid;
