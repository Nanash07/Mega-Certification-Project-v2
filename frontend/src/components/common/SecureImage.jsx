import { useState, useEffect, useRef } from "react";
import { FileImage } from "lucide-react";
import api from "../../services/api";

// Import PDF.js
import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs'; // Ensure worker is bundled

// Set worker source appropriately for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export default function SecureImage({ src, alt, className, fallback }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isPdf, setIsPdf] = useState(false);
    const [pdfRendered, setPdfRendered] = useState(false);
    const canvasRef = useRef(null);

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
                setPdfRendered(false); // Reset pdf rendered state
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
            // objectUrl cleanup is handled in the next effect or we can do it here if we want strictly one place
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // Cleanup effect for objectUrl
    useEffect(() => {
        return () => {
           if (objectUrl) {
               console.log("Revoking URL:", objectUrl); 
               URL.revokeObjectURL(objectUrl);
           }
        };
    }, [objectUrl]);


    // PDF Rendering Effect
    useEffect(() => {
        let active = true;
        let pdfDoc = null;

        const renderPdf = async () => {
            if (!isPdf || !objectUrl || !canvasRef.current) return;

            try {
                const pdf = await pdfjs.getDocument(objectUrl).promise;
                pdfDoc = pdf;
                
                if (!active) return;
                
                const page = await pdf.getPage(1);
                
                if (!active) return;

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                // Calculate scale to fit container width/height while maintaining aspect ratio?
                // Or just fixed scale. For thumbnail, a scale of 1.0 or 1.5 is usually fine.
                // To get crisp images, better to render larger and scale down with CSS.
                const viewport = page.getViewport({ scale: 1.5 });
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                if (active) {
                    setPdfRendered(true);
                }
                
            } catch (err) {
                console.error("PDF Render Error:", err);
                // Maybe set error?
            }
        };

        // Reset rendered state when these change
        setPdfRendered(false);
        renderPdf();

        return () => {
            active = false;
            if (pdfDoc) {
                pdfDoc.destroy();
            }
        };
    }, [isPdf, objectUrl]);

    // Effect to re-trigger render if canvas becomes available later (very edge case)
    // We simplify by relying on the main effect.

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
            <div className={`relative w-full h-full bg-white overflow-hidden ${className}`}>
                {/* Canvas for thumbnail */}
                <canvas 
                    ref={canvasRef} 
                    className={`w-full h-full object-cover transition-opacity duration-300 ${pdfRendered ? 'opacity-100' : 'opacity-0'}`}
                />
                {!pdfRendered && (
                     // Fallback/Loading state while canvas renders
                     <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <span className="loading loading-spinner loading-xs text-gray-300"></span>
                     </div>
                )}
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
