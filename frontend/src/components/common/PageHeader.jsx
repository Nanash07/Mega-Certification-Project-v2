// src/components/common/PageHeader.jsx
/**
 * Reusable page header component with title, subtitle, and action buttons
 *
 * @example
 * <PageHeader title="Kelola User" subtitle="456 pengguna terdaftar">
 *   <button className="btn btn-sm btn-primary">Tambah User</button>
 * </PageHeader>
 */
export default function PageHeader({ title, subtitle, children }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
            {children && <div className="flex flex-wrap gap-2">{children}</div>}
        </div>
    );
}
