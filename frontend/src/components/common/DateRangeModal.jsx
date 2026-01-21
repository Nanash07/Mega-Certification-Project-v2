import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export default function DateRangeModal({ open, title, range, onChange, onClose }) {
  if (!open) return null;

  return (
    <dialog className="modal" open={open}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-3">{title}</h3>
        <DateRange
          ranges={range}
          onChange={(item) => onChange(item[range[0].key])}
          moveRangeOnFirstSelection={false}
          editableDateInputs={true}
          rangeColors={["#3b82f6"]}
        />
        <div className="modal-action">
          <button className="btn btn-sm btn-ghost rounded-lg border border-gray-200" onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Terapkan
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}