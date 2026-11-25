/**
 * Notification Center - sinh thông báo HOÀN TOÀN LOCAL từ dữ liệu hiện có, không có
 * server/push nào cả. Chỉ tạo thông báo khi 1 RULE THỰC SỰ thỏa điều kiện (không spam theo
 * lịch, không tạo hàng loạt mỗi lần mở app) - xem `dedupKey` trong types/index.ts.
 */
import type { Product, Sale, Debt, AppNotification, NotificationType } from "../types";
import { getRevenueTrend, getSlowMovingProducts } from "../utils/aiInsights";
import { getStockStatus } from "../mock/products";
import { daysUntilExpiry, EXPIRY_WARNING_DAYS } from "../utils/expiry";
import { formatVND } from "../utils/format";
import { isShopOwes } from "../utils/saleAmounts";

export type NotificationCandidate = Omit<AppNotification, "id" | "createdAt" | "read">;

/** Ngưỡng % thay đổi tiền khách trả mới đáng để thông báo - tránh spam mỗi khi nhích 1-2%. */
const REVENUE_TREND_THRESHOLD_PERCENT = 20;

/** Số sản phẩm tối đa liệt kê tên ngay trong nội dung thông báo (còn lại gộp "và N sản phẩm khác"). */
const MAX_NAMES_IN_MESSAGE = 5;

function summarize(items: string[]): string {
  const shown = items.slice(0, MAX_NAMES_IN_MESSAGE).join(", ");
  const more = items.length > MAX_NAMES_IN_MESSAGE ? ` và ${items.length - MAX_NAMES_IN_MESSAGE} sản phẩm khác` : "";
  return shown + more;
}

function expiryLabel(days: number): string {
  if (days < 0) return "đã hết hạn";
  if (days === 0) return "hết hạn hôm nay";
  return `còn ${days} ngày`;
}

export function generateNotificationCandidates(
  products: Product[],
  sales: Sale[],
  debts: Debt[]
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  // SẮP HẾT - đúng định nghĩa của danh sách "Sắp hết" ở Trang chủ: tồn kho <= ngưỡng cảnh báo của
  // sản phẩm (kể cả đã hết hàng). Hết hàng xếp trước, rồi tới tồn ít nhất.
  const lowStock = products
    .filter((p) => getStockStatus(p) !== "in_stock")
    .sort((a, b) => a.stock - b.stock);
  if (lowStock.length > 0) {
    const outCount = lowStock.filter((p) => p.stock <= 0).length;
    candidates.push({
      type: "LOW_STOCK",
      severity: outCount > 0 ? "CRITICAL" : "WARNING",
      title:
        outCount > 0
          ? `${lowStock.length} sản phẩm sắp hết hàng (${outCount} đã hết)`
          : `${lowStock.length} sản phẩm sắp hết hàng`,
      message: summarize(
        lowStock.map((p) => `${p.name} (${p.stock <= 0 ? "hết hàng" : `còn ${p.stock} ${p.unit}`})`)
      ),
      dedupKey: "low-stock",
      actionRoute: "/products",
    });
  }

  // HẠN SỬ DỤNG - đúng định nghĩa của danh sách "HSD" ở Trang chủ: còn <= EXPIRY_WARNING_DAYS ngày
  // hoặc ĐÃ HẾT HẠN. Hết hạn/sát hạn nhất xếp trước.
  const expiring = products
    .filter((p) => !!p.expiryDate)
    .map((p) => ({ product: p, days: daysUntilExpiry(p.expiryDate)! }))
    .filter((x) => x.days <= EXPIRY_WARNING_DAYS)
    .sort((a, b) => a.days - b.days);
  if (expiring.length > 0) {
    const expiredCount = expiring.filter((x) => x.days < 0).length;
    candidates.push({
      type: "EXPIRY",
      severity: expiredCount > 0 ? "CRITICAL" : "WARNING",
      title:
        expiredCount > 0
          ? `${expiring.length} sản phẩm sắp/đã hết hạn (${expiredCount} đã hết hạn)`
          : `${expiring.length} sản phẩm sắp hết hạn`,
      message: summarize(expiring.map((x) => `${x.product.name} (${expiryLabel(x.days)})`)),
      dedupKey: "expiry",
      actionRoute: "/products",
    });
  }

  // Chỉ tính khoản KHÁCH nợ cửa hàng - khoản "Nợ khách" (cửa hàng nợ khách) là tiền phải trả đi, không phải tiền cần thu.
  const totalOutstandingDebt = debts
    .filter((d) => !isShopOwes(d))
    .reduce((sum, d) => sum + Math.max(0, d.totalPurchase - d.totalPaid), 0);
  if (totalOutstandingDebt > 0) {
    candidates.push({
      type: "DEBT",
      severity: "INFO",
      title: "Có công nợ chưa thu",
      message: `Tổng dư nợ hiện tại: ${formatVND(totalOutstandingDebt)}`,
      dedupKey: "debt-outstanding",
      actionRoute: "/debts",
    });
  }

  const trend = getRevenueTrend(sales);
  if (trend.percent !== null && Math.abs(trend.percent) >= REVENUE_TREND_THRESHOLD_PERCENT) {
    candidates.push({
      type: "REVENUE",
      severity: "INFO",
      title: trend.percent >= 0 ? "Tiền khách trả hôm nay tăng mạnh" : "Tiền khách trả hôm nay giảm mạnh",
      message: `${formatVND(trend.today)} (${trend.percent >= 0 ? "+" : ""}${trend.percent}% so với hôm qua)`,
      dedupKey: `revenue-trend-${new Date().toDateString()}`,
      actionRoute: "/",
    });
  }

  const slowMoving = getSlowMovingProducts(products, sales);
  if (slowMoving.length > 0) {
    candidates.push({
      type: "AI",
      severity: "INFO",
      title: `${slowMoving.length} sản phẩm bán chậm`,
      message: `${summarize(slowMoving.map((p) => p.name))} còn tồn nhiều nhưng chưa bán được gần đây.`,
      dedupKey: "ai-slow-moving",
      actionRoute: "/products",
    });
  }

  return candidates;
}

/** Các loại thông báo mô tả 1 TÌNH TRẠNG hiện tại (không phải 1 sự kiện): khi tình trạng hết đúng
 *  (đã nhập hàng, đã thu nợ...) thì thông báo tự biến mất thay vì nằm lại báo sai. Thông báo
 *  doanh thu là SỰ KIỆN trong ngày nên được giữ lại như lịch sử. */
const RESOLVABLE_TYPES: NotificationType[] = ["LOW_STOCK", "EXPIRY", "DEBT", "AI"];

/**
 * Gộp danh sách thông báo hiện có với kết quả quét rule mới nhất (hàm thuần):
 * - Rule mới thỏa mà CHƯA có thông báo cùng `dedupKey` -> thêm mới (chưa đọc).
 * - Đã có cùng `dedupKey` -> CẬP NHẬT nội dung tại chỗ cho khớp tình hình hiện tại (không tạo bản
 *   thứ 2). Nếu TIÊU ĐỀ đổi (vd số sản phẩm sắp hết đổi từ 3 thành 4) -> đặt lại chưa đọc để báo
 *   lại; nếu chỉ chi tiết đổi (vd số lượng còn lại) -> giữ nguyên trạng thái đã đọc.
 * - Thông báo loại "tình trạng" mà rule không còn đúng -> xóa.
 */
export function mergeNotifications(
  prev: AppNotification[],
  candidates: NotificationCandidate[],
  makeId: () => string,
  nowISO: string
): AppNotification[] {
  const candidateByKey = new Map(candidates.map((c) => [c.dedupKey, c]));
  const seen = new Set<string>();
  const kept: AppNotification[] = [];
  let changed = false;

  for (const n of prev) {
    const c = candidateByKey.get(n.dedupKey);
    if (!c) {
      if (RESOLVABLE_TYPES.includes(n.type)) {
        changed = true; // tình trạng đã hết đúng -> bỏ thông báo
        continue;
      }
      kept.push(n);
      continue;
    }
    seen.add(n.dedupKey);
    if (
      n.title !== c.title ||
      n.message !== c.message ||
      n.severity !== c.severity ||
      n.actionRoute !== c.actionRoute
    ) {
      changed = true;
      kept.push({
        ...n,
        title: c.title,
        message: c.message,
        severity: c.severity,
        actionRoute: c.actionRoute,
        read: n.title === c.title ? n.read : false,
      });
    } else {
      kept.push(n);
    }
  }

  const added: AppNotification[] = candidates
    .filter((c) => !seen.has(c.dedupKey))
    .map((c) => ({ ...c, id: makeId(), createdAt: nowISO, read: false }));
  if (added.length > 0) changed = true;

  return changed ? [...added, ...kept] : prev;
}
