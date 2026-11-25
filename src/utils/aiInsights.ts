/**
 * Engine phân tích tồn kho/doanh thu THUẦN, chạy 100% OFFLINE (không gọi API/internet nào).
 * Trước đây phục vụ trang "Trợ lý AI" (đã bị xóa theo yêu cầu người dùng) - nay chỉ còn
 * `getRevenueTrend` (Trang chủ) và `getSlowMovingProducts` (Trung tâm thông báo) còn được dùng.
 */
import dayjs from "dayjs";
import type { Product, Sale } from "../types";
import { saleReceived } from "./saleAmounts";

/** Tiền khách trả hôm nay so với hôm qua - tăng/giảm bao nhiêu % (tính theo tiền khách thực trả). */
export function getRevenueTrend(sales: Sale[]) {
  const today = sales
    .filter((s) => dayjs(s.date).isSame(dayjs(), "day"))
    .reduce((sum, s) => sum + saleReceived(s), 0);
  const yesterday = sales
    .filter((s) => dayjs(s.date).isSame(dayjs().subtract(1, "day"), "day"))
    .reduce((sum, s) => sum + saleReceived(s), 0);

  let percent: number | null = null;
  if (yesterday > 0) percent = Math.round(((today - yesterday) / yesterday) * 100);
  else if (today > 0) percent = 100;

  return { today, yesterday, percent };
}

/** Sản phẩm bán chậm/không bán được trong 30 ngày qua nhưng vẫn còn tồn nhiều - gợi ý xả hàng. */
export function getSlowMovingProducts(products: Product[], sales: Sale[]) {
  const since = dayjs().subtract(30, "day");
  const soldMap = new Map<string, number>();
  sales
    .filter((s) => dayjs(s.date).isAfter(since))
    .forEach((s) =>
      s.items.forEach((it) => soldMap.set(it.productId, (soldMap.get(it.productId) ?? 0) + it.quantity))
    );
  return products.filter((p) => p.stock >= p.lowStockThreshold && (soldMap.get(p.id) ?? 0) === 0);
}
