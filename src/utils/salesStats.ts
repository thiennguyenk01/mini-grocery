import dayjs, { type Dayjs } from "dayjs";
import type { Sale } from "../types";
import { saleReceived } from "./saleAmounts";

export type RangeKey = "today" | "yesterday" | "7days" | "month" | "custom";
export type CustomRange = [Dayjs, Dayjs] | null;

/** Dùng chung 1 bộ lọc khoảng thời gian cho đơn bán, chi phí, thu công nợ - tránh các nơi lọc lệch nhau. */
export function isInSelectedRange(dateISO: string, range: RangeKey, customRange: CustomRange): boolean {
  const d = dayjs(dateISO);
  if (range === "today") return d.isSame(dayjs(), "day");
  if (range === "yesterday") return d.isSame(dayjs().subtract(1, "day"), "day");
  if (range === "7days") return d.isAfter(dayjs().subtract(7, "day"));
  if (range === "month") return d.isSame(dayjs(), "month");
  if (range === "custom" && customRange) {
    return d.isAfter(customRange[0].startOf("day")) && d.isBefore(customRange[1].endOf("day"));
  }
  return true;
}

export interface SalesSummary {
  /** TỔNG SỐ TIỀN KHÁCH TRẢ: tiền thực nhận từ khách cho các đơn này. Gồm cả tiền thừa khách cho
   *  khi thanh toán tiền mặt (chọn A "khách cho"), vì cửa hàng giữ luôn phần đó. Xem saleReceived(). */
  received: number;
  /** Trong `received`, phần là tiền thừa KHÁCH CHO (chọn A khi thanh toán tiền mặt). */
  giftTotal: number;
  /** Tổng giá trị hàng của các đơn (kể cả phần khách còn nợ). */
  orderValue: number;
  /** Tổng giá vốn hàng bán, lấy giá vốn đã CHỐT lúc bán trong từng dòng đơn. */
  cogs: number;
  /** Lợi nhuận gộp = tổng giá trị đơn - giá vốn (tính theo giá trị đơn để đơn ghi nợ không bị tính lỗ oan). */
  grossProfit: number;
  orderCount: number;
}

export function summarizeSales(sales: Sale[]): SalesSummary {
  let received = 0;
  let giftTotal = 0;
  let orderValue = 0;
  let cogs = 0;
  for (const s of sales) {
    received += saleReceived(s);
    if (s.surplusMode === "GIFT") giftTotal += Math.max(0, (s.amountPaid ?? s.total) - s.total);
    orderValue += s.total;
    for (const it of s.items) cogs += it.costOfGoodsSold ?? 0;
  }
  return { received, giftTotal, orderValue, cogs, grossProfit: orderValue - cogs, orderCount: sales.length };
}
