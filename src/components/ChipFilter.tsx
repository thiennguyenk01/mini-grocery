import React from "react";

export interface ChipOption<T extends string> {
  label: string;
  value: T;
}

interface ChipFilterProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: React.CSSProperties;
}

/**
 * Dãy chip lọc CUỘN NGANG (không xuống dòng, không cắt chữ) - dùng khi số lựa chọn lọc nhiều
 * hơn mức 1 hàng ngang vừa màn hình có thể chứa (ví dụ 7 loại biến động kho). Thay cho antd
 * `Segmented` khi số option nhiều, vì `Segmented` chia đều chiều rộng nên chữ dễ bị cắt thành
 * "Tất...", "Nh..." khi có quá 4-5 lựa chọn trên màn hình hẹp - trải nghiệm khó đọc.
 * Cùng ngôn ngữ thiết kế với `CategoryChips` (pill bo tròn, xanh lá khi được chọn).
 */
function ChipFilter<T extends string>({ options, value, onChange, style }: ChipFilterProps<T>) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 2,
        WebkitOverflowScrolling: "touch",
        ...style,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flexShrink: 0,
              border: "none",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: active ? "#147f27" : "#f3f4f2",
              color: active ? "#fff" : "#475569",
              transition: "background .15s, color .15s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default ChipFilter;
