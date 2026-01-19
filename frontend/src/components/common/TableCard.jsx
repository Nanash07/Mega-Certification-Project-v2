import Pagination from "./Pagination";
export default function TableCard({ children, pagination, showPagination = true }) {
    return (
        <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                    {children}
                </table>
            </div>
            {showPagination && pagination && (
                <div className="border-t border-gray-100 p-3">
                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        totalElements={pagination.totalElements}
                        rowsPerPage={pagination.rowsPerPage}
                        onPageChange={pagination.onPageChange}
                        onRowsPerPageChange={pagination.onRowsPerPageChange}
                    />
                </div>
            )}
        </div>
    );
}
