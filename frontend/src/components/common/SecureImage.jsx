import { useState, useEffect } from "react";
import { FileImage } from "lucide-react";
import api from "../../services/api";

export default function SecureImage({ src, alt, className, fallback }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isPdf, setIsPdf] = useState(false);

    useEffect(() => {
        let active = true;

        const fetchImage = async () => {
            if (!src) {
                setLoading(false);
                setError(true);
                return;
            }

            try {
                setLoading(true);
                setError(false);
                const response = await api.get(src, { responseType: "blob" });
                
                if (active) {
                    const blob = response.data;
                    const url = URL.createObjectURL(blob);
                    setObjectUrl(url);
                    setIsPdf(blob.type === "application/pdf");
                    setLoading(false);
                }
            } catch (err) {
                console.error("SecureImage load error:", err);
                if (active) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        fetchImage();

        return () => {
            active = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 animate-pulse ${className}`}>
                <span className="loading loading-dots loading-xs text-gray-400"></span>
            </div>
        );
    }

    if (error || !objectUrl) {
        return fallback || (
             <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
                <FileImage size={24} className="opacity-50" />
                <span className="text-[10px] mt-1">No Image</span>
            </div>
        );
    }

    if (isPdf) {
        return (
            <div className={`flex flex-col items-center justify-center bg-base-200 text-red-500 ${className}`}>
                <FileImage size={32} />
                <span className="text-[10px] font-medium text-gray-500 mt-1">PDF Document</span>
            </div>
        );
    }

    return (
        <img
            src={objectUrl}
            alt={alt}
            className={className}
        />
    );
}
