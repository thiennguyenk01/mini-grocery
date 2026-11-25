import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAppData } from "../store/AppDataContext";
import { getStockStatus } from "../mock/products";
import { daysUntilExpiry, EXPIRY_WARNING_DAYS } from "../utils/expiry";
import { isShopOwes } from "../utils/saleAmounts";
import { getRevenueTrend } from "../utils/aiInsights";
import { isInSelectedRange, summarizeSales, type CustomRange, type RangeKey } from "../utils/salesStats";

/**
 * Toàn bộ số liệu của bảng thống kê (đã gộp vào Trang chủ), tính theo khoảng thời gian đang chọn.
 * Tách ra hook để thẻ tổng và các tab dùng CHUNG 1 bộ số liệu, không tính 2 lần.
 */
export function useStatsBoard() {
  const { products, sales, expenses, debts } = useAppData();
  const [range, setRange] = useState<RangeKey>("today");
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const rangeInvalid = !!fromDate && !!toDate && dayjs(fromDate).isAfter(dayjs(toDate));
  // Chỉ áp dụng khoảng tùy chỉnh khi CẢ 2 ngày đã nhập hợp lệ và "Từ" không sau "Đến".
  const customRange = useMemo<CustomRange>(
    () => (fromDate && toDate && !rangeInvalid ? [dayjs(fromDate), dayjs(toDate)] : null),
    [fromDate, toDate, rangeInvalid]
  );

  const filteredSales = useMemo(
    () => sales.filter((s) => isInSelectedRange(s.date, range, customRange)),
    [sales, range, customRange]
  );
  const summary = useMemo(() => summarizeSales(filteredSales), [filteredSales]);

  const expensesInRange = useMemo(
    () => expenses.filter((e) => isInSelectedRange(e.createdAt, range, customRange)),
    [expenses, range, customRange]
  );
  const expensesTotal = expensesInRange.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = summary.grossProfit - expensesTotal;
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expensesInRange.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expensesInRange]);

  // "Sắp hết" - cùng định nghĩa với thông báo Sắp hết (xem notificationService).
  const lowStockProducts = useMemo(() => products.filter((p) => getStockStatus(p) !== "in_stock"), [products]);

  // Sản phẩm có đặt hạn sử dụng, sắp theo HSD gần nhất trước - cùng định nghĩa với thông báo HSD.
  const expiringProducts = useMemo(
    () =>
      products
        .filter((p) => !!p.expiryDate)
        .map((p) => ({ product: p, days: daysUntilExpiry(p.expiryDate)! }))
        .sort((a, b) => a.days - b.days),
    [products]
  );
  const urgentExpiringCount = expiringProducts.filter((x) => x.days <= EXPIRY_WARNING_DAYS).length;

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach((s) =>
      s.items.forEach((it) => map.set(it.productId, (map.get(it.productId) ?? 0) + it.quantity))
    );
    return [...map.entries()]
      .map(([productId, qty]) => ({ product: products.find((p) => p.id === productId), qty }))
      .filter((x) => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales, products]);

  const recentTransactions = useMemo(
    () => [...sales].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()).slice(0, 6),
    [sales]
  );

  // Tổng giá trị tồn kho: ưu tiên tính theo unitCost của TỪNG LÔ (chính xác hơn) nếu sản phẩm
  // có theo dõi lô; sản phẩm chưa có lô nào thì tạm dùng purchasePrice hiện tại làm ước lượng.
  const inventoryQty = products.reduce((sum, p) => sum + p.stock, 0);
  const inventoryValue = products.reduce((sum, p) => {
    if (p.batches && p.batches.length > 0) return sum + p.batches.reduce((s, b) => s + b.quantity * b.unitCost, 0);
    return sum + p.stock * p.purchasePrice;
  }, 0);

  // Công nợ: tổng dư nợ là số liệu TẠI THỜI ĐIỂM HIỆN TẠI (không lọc theo kỳ), riêng "đã thu" lọc theo kỳ.
  // Khoản "Nợ khách" (cửa hàng nợ khách - tiền thừa chưa trả) tách riêng, KHÔNG cộng vào số khách nợ.
  const customerDebts = debts.filter((d) => !isShopOwes(d));
  const shopOwesTotal = debts
    .filter((d) => isShopOwes(d))
    .reduce((sum, d) => sum + Math.max(0, d.totalPurchase - d.totalPaid), 0);
  const totalOutstandingDebt = customerDebts.reduce((sum, d) => sum + Math.max(0, d.totalPurchase - d.totalPaid), 0);
  const customersWithDebt = customerDebts.filter((d) => d.totalPurchase - d.totalPaid > 0).length;
  const debtCollectedInRange = customerDebts.reduce(
    (sum, d) =>
      sum + d.history.filter((h) => isInSelectedRange(h.date, range, customRange)).reduce((s, h) => s + h.amount, 0),
    0
  );

  const trend = useMemo(() => getRevenueTrend(sales), [sales]);

  return {
    range, setRange, fromDate, setFromDate, toDate, setToDate, rangeInvalid,
    summary, expensesTotal, netProfit, expenseByCategory,
    lowStockProducts, expiringProducts, urgentExpiringCount, topProducts, recentTransactions,
    inventoryQty, inventoryValue,
    totalOutstandingDebt, customersWithDebt, debtCollectedInRange, shopOwesTotal,
    trend,
  };
}

export type StatsBoardData = ReturnType<typeof useStatsBoard>;
