import type { Debt, Sale } from "../types";

/**
 * Số tiền KHÁCH THỰC TRẢ cho 1 đơn (tiền thực nhận) - dùng cho mọi thống kê "tiền khách trả":
 *   khách đưa  -  tiền trả lại khách  -  phần cửa hàng nợ khách (chọn B)
 *
 * Ví dụ đơn 50.000đ:
 * - Khách đưa 52.000đ, trả lại 2.000đ          -> 50.000đ
 * - Khách đưa 52.000đ, chọn A "khách cho"      -> 52.000đ (cửa hàng giữ luôn phần thừa)
 * - Khách đưa 52.000đ, chọn B "nợ khách"       -> 50.000đ (2.000đ là khoản cửa hàng nợ, không phải thu nhập)
 * - Khách đưa 40.000đ (thiếu 10.000đ -> công nợ) -> 40.000đ
 *
 * Đơn cũ (trước khi có tính năng nhập tiền khách trả) không có `amountPaid` -> coi như khách trả đủ
 * tổng đơn, nên số liệu lịch sử không bị đổi.
 */
export function saleReceived(sale: Sale): number {
  if (sale.amountPaid === undefined) return sale.total;
  return sale.amountPaid - (sale.changeReturned ?? 0) - (sale.owedToCustomer ?? 0);
}

/** Khoản nợ này là cửa hàng nợ khách (tiền thừa chưa trả)? Khoản cũ không có `kind` = khách nợ. */
export function isShopOwes(debt: Debt): boolean {
  return debt.kind === "SHOP_OWES";
}
