import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function PaginationSimple({ page, totalPages, totalElements, rowsPerPage = 10, onPageChange }) {
    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const endIdx = Math.min(page * rowsPerPage, totalElements);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-3 py-2 text-xs">
            {/* Info */}
            <span className="text-gray-500">
                {startIdx} - {endIdx} of {totalElements}
            </span>

            {/* Controls */}
            <div className="flex items-center gap-1">
                <button className="btn btn-xs btn-ghost" onClick={() => onPageChange(1)} disabled={page === 1}>
                    <ChevronsLeft size={16} />
                </button>

                <button className="btn btn-xs btn-ghost" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
                    <ChevronLeft size={16} />
                </button>

                <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                >
                    <ChevronRight size={16} />
                </button>

                <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}
