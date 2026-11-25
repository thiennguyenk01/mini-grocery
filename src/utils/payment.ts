import type { SurplusMode } from "../types";

export interface PaymentBreakdown {
  /** Tiền khách đưa (đã chặn số âm). */
  amountPaid: number;
  /** Khách thiếu bao nhiêu (> 0 -> ghi Công nợ, khách nợ). */
  shortage: number;
  /** Khách đưa dư bao nhiêu (trước khi quyết định trả lại / cho / nợ). */
  surplus: number;
  /** Cách xử lý tiền thừa - chỉ có khi `surplus` > 0. */
  surplusMode?: SurplusMode;
  /** "Tiền trả khách": chỉ > 0 khi chọn trả lại tiền thừa. */
  changeReturned: number;
  /** Phần cửa hàng nợ khách: chỉ > 0 khi chọn B "nợ khách". */
  owedToCustomer: number;
}

/**
 * Nguồn sự thật DUY NHẤT cho phép tính thanh toán - cả màn hình giỏ hàng (hiển thị tức thì) lẫn
 * `checkout()` (lưu vào đơn) đều gọi hàm này nên số hiển thị và số lưu không bao giờ lệch nhau.
 */
export function computePayment(
  total: number,
  amountPaid: number,
  surplusMode: SurplusMode = "RETURN"
): PaymentBreakdown {
  const paid = Math.max(0, Math.round(amountPaid));
  const shortage = Math.max(0, total - paid);
  const surplus = Math.max(0, paid - total);
  const mode = surplus > 0 ? surplusMode : undefined;
  return {
    amountPaid: paid,
    shortage,
    surplus,
    surplusMode: mode,
    changeReturned: mode === "RETURN" ? surplus : 0,
    owedToCustomer: mode === "OWE" ? surplus : 0,
  };
}
