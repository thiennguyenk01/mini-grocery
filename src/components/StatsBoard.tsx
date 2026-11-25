import React from "react";
import { Card, List, Tag, Empty, Button, Tabs } from "antd";
import { RiseOutlined, FallOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { formatVND } from "../utils/format";
import { EXPIRY_WARNING_DAYS } from "../utils/expiry";
import { EXPENSE_CATEGORY_LABELS } from "../types";
import type { Product, Sale } from "../types";
import type { RangeKey } from "../utils/salesStats";
import type { StatsBoardData } from "../hooks/useStatsBoard";
import ChipFilter from "./ChipFilter";
import DateBoxInput from "./DateBoxInput";

const RANGE_OPTIONS: { label: string; value: RangeKey }[] = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "7 ngày", value: "7days" },
  { label: "Tháng này", value: "month" },
  { label: "Tùy chỉnh", value: "custom" },
];

/**
 * THẺ TỔNG của bảng thống kê (đã gộp vào Trang chủ): chọn khoảng thời gian + "Tổng số tiền khách
 * trả" + vài số chính. Thiết kế để nhô lên đè mép banner xanh của Trang chủ.
 */
export const StatsSummaryCard: React.FC<{ board: StatsBoardData }> = ({ board }) => {
  const { range, setRange, fromDate, setFromDate, toDate, setToDate, rangeInvalid, summary, trend } = board;
  const miniStats: { label: string; value: string; color?: string }[] = [
    { label: "Tổng tiền hàng", value: formatVND(summary.orderValue) },
    { label: "Số đơn", value: `${summary.orderCount}` },
    { label: "Giá vốn", value: formatVND(summary.cogs) },
    { label: "Lợi nhuận", value: formatVND(summary.grossProfit), color: "#2563eb" },
  ];

  return (
    <Card
      className="stat-card"
      style={{ marginBottom: 14, borderRadius: 16 }}
      styles={{ body: { padding: "16px 18px" } }}
    >
      <ChipFilter options={RANGE_OPTIONS} value={range} onChange={setRange} style={{ marginBottom: 14 }} />

      {range === "custom" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Từ ngày</div>
            <DateBoxInput value={fromDate} onChange={setFromDate} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Đến ngày</div>
            <DateBoxInput value={toDate} onChange={setToDate} />
          </div>
          {rangeInvalid && (
            <div style={{ fontSize: 12, color: "#dc2626" }}>Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</div>
          )}
        </div>
      )}

      <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 2 }}>Tổng số tiền khách trả</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: "#0f5f1d", lineHeight: 1.15, letterSpacing: -0.5 }}>
        {formatVND(summary.received)}
      </div>
      {range === "today" && trend.percent !== null && (
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            fontWeight: 600,
            color: trend.percent >= 0 ? "#16a34a" : "#dc2626",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {trend.percent >= 0 ? <RiseOutlined /> : <FallOutlined />}
          {Math.abs(trend.percent)}% so với hôm qua
        </div>
      )}
      {summary.giftTotal > 0 && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
          Đã gồm khách cho (tiền thừa): <b style={{ color: "#147f27" }}>{formatVND(summary.giftTotal)}</b>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px 16px",
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px dashed #e5e7eb",
        }}
      >
        {miniStats.map((m) => (
          <div key={m.label}>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{m.label}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

/** Các tab chi tiết của bảng thống kê: Giao dịch / Bán chạy / Lợi nhuận / Tổng hợp / Sắp hết / HSD. */
export const StatsTabs: React.FC<{
  board: StatsBoardData;
  onOpenSale: (sale: Sale) => void;
  /** Tab đang mở (tuỳ chọn) - cho phép trang cha mở thẳng một tab, ví dụ từ khối "Cần xử lý". */
  activeKey?: string;
  onTabChange?: (key: string) => void;
}> = ({ board, onOpenSale, activeKey, onTabChange }) => {
  const {
    summary, expensesTotal, netProfit, expenseByCategory,
    lowStockProducts, expiringProducts, urgentExpiringCount, topProducts, recentTransactions,
    inventoryQty, inventoryValue, totalOutstandingDebt, customersWithDebt, debtCollectedInRange, shopOwesTotal,
  } = board;
  const orderValue = summary.orderValue;
  const cost = summary.cogs;
  const grossProfit = summary.grossProfit;

  const lowStockList = (
    <Card title="Sản phẩm sắp hết / hết hàng" className="page-card">
      {lowStockProducts.length === 0 ? (
        <Empty description="Không có sản phẩm sắp hết" />
      ) : (
        <List
          dataSource={lowStockProducts}
          renderItem={(p) => (
            <List.Item>
              <span>{p.name}</span>
              <Tag color={p.stock === 0 ? "red" : "gold"}>
                còn {p.stock} {p.unit}
              </Tag>
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const topProductsList = (
    <Card title="Sản phẩm bán chạy" className="page-card">
      <List
        dataSource={topProducts}
        locale={{ emptyText: "Chưa có dữ liệu bán hàng" }}
        renderItem={(item, idx) => (
          <List.Item>
            <span>
              <Tag>{idx + 1}</Tag> {item.product?.name}
            </span>
            <b>
              {item.qty} {item.product?.unit}
            </b>
          </List.Item>
        )}
      />
    </Card>
  );

  const summaryPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Tồn kho" className="page-card">
        <List
          dataSource={[
            { label: "Tổng số lượng tồn", value: `${inventoryQty}` },
            { label: "Giá trị tồn kho", value: formatVND(inventoryValue), bold: true },
          ]}
          renderItem={(row) => (
            <List.Item>
              <span style={{ fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
              <b>{row.value}</b>
            </List.Item>
          )}
        />
        <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 8 }}>
          Giá trị tính theo giá vốn từng lô hàng (nếu có theo dõi lô) hoặc giá nhập hiện tại.
        </div>
      </Card>

      <Card title="Công nợ" className="page-card">
        <List
          dataSource={[
            { label: "Tổng dư nợ", value: formatVND(totalOutstandingDebt), bold: true },
            { label: "Khách đang nợ", value: `${customersWithDebt}` },
            { label: "Đã thu (kỳ này)", value: formatVND(debtCollectedInRange), color: "#147f27" },
            ...(shopOwesTotal > 0 ? [{ label: "Nợ khách (cửa hàng đang nợ)", value: formatVND(shopOwesTotal), color: "#2563eb" }] : []),
          ]}
          renderItem={(row) => (
            <List.Item>
              <span style={{ fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
              <b style={{ color: row.color }}>{row.value}</b>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Chi phí theo loại" className="page-card">
        {expenseByCategory.length === 0 ? (
          <Empty description="Không có chi phí nào trong khoảng thời gian này" />
        ) : (
          <List
            dataSource={expenseByCategory}
            renderItem={([category, amount]) => (
              <List.Item>
                <span>{EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS]}</span>
                <b>{formatVND(amount)}</b>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );

  const profitBreakdown = (
    <Card title="Lợi nhuận" className="page-card">
      <List
        dataSource={[
          { label: "Tổng giá trị đơn hàng", value: orderValue, color: "#147f27" },
          { label: "Giá vốn hàng bán (COGS)", value: -cost, color: "#8c8c8c" },
          { label: "Lợi nhuận gộp", value: grossProfit, color: "#2563eb", bold: true },
          { label: "Chi phí vận hành", value: -expensesTotal, color: "#8c8c8c" },
          { label: "Lợi nhuận ròng", value: netProfit, color: netProfit >= 0 ? "#147f27" : "#dc2626", bold: true },
        ]}
        renderItem={(row) => (
          <List.Item>
            <span style={{ fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
            <b style={{ color: row.color }}>
              {row.value < 0 ? "-" : ""}
              {formatVND(Math.abs(row.value))}
            </b>
          </List.Item>
        )}
      />
      <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 8 }}>
        Lợi nhuận tính trên tổng giá trị đơn hàng (kể cả phần khách còn nợ) để không bị lệch khi có
        công nợ - số tiền khách thực trả xem ở ô tổng phía trên. Giá vốn tính theo giá nhập CHỐT tại
        thời điểm bán từng đơn - không đổi dù giá nhập hiện tại của sản phẩm sau này thay đổi. Chi
        phí lấy từ mục "Chi phí" trong cùng khoảng thời gian đang chọn ở trên.
      </div>
    </Card>
  );

  const expiringList = (
    <Card title="Hạn sử dụng gần nhất" className="page-card">
      {expiringProducts.length === 0 ? (
        <Empty description="Chưa có sản phẩm nào đặt hạn sử dụng" />
      ) : (
        (() => {
          const urgent = expiringProducts.filter((x) => x.days <= EXPIRY_WARNING_DAYS);
          const later = expiringProducts.filter((x) => x.days > EXPIRY_WARNING_DAYS);
          const renderRow = ({ product, days }: { product: Product; days: number }) => (
            <List.Item key={product.id}>
              <span>{product.name}</span>
              <Tag color={days < 0 ? "red" : days <= EXPIRY_WARNING_DAYS ? "orange" : "default"}>
                {dayjs(product.expiryDate).format("DD/MM/YYYY")}
                {days < 0 ? " · Đã hết hạn" : days <= EXPIRY_WARNING_DAYS ? ` · Còn ${days} ngày` : ""}
              </Tag>
            </List.Item>
          );
          return (
            <>
              {urgent.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, color: "#d46b08", marginBottom: 4 }}>
                    ⚠️ Cần chú ý (còn ≤ 1 tháng) - {urgent.length}
                  </div>
                  <List dataSource={urgent} renderItem={renderRow} />
                </>
              )}
              {later.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, color: "#8c8c8c", margin: urgent.length > 0 ? "16px 0 4px" : "0 0 4px" }}>
                    Còn hạn xa
                  </div>
                  <List dataSource={later} renderItem={renderRow} />
                </>
              )}
            </>
          );
        })()
      )}
    </Card>
  );

  const recentTransactionsList = (
    <Card title="Giao dịch gần đây" className="page-card">
      <List
        dataSource={recentTransactions}
        locale={{ emptyText: "Chưa có giao dịch nào" }}
        renderItem={(s) => (
          <List.Item>
            <span>
              <Button type="link" style={{ padding: 0 }} onClick={() => onOpenSale(s)}>
                {s.code}
              </Button>{" "}
              · {dayjs(s.date).format("HH:mm DD/MM")}
            </span>
            <b>{formatVND(s.total)}</b>
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <Card className="page-card" style={{ marginBottom: 16 }} styles={{ body: { padding: "4px 12px 12px" } }}>
      <Tabs
        activeKey={activeKey}
        onChange={onTabChange}
        items={[
          { key: "recent", label: "Giao dịch", children: recentTransactionsList },
          { key: "top", label: "Bán chạy", children: topProductsList },
          { key: "profit", label: "Lợi nhuận", children: profitBreakdown },
          { key: "summary", label: "Tổng hợp", children: summaryPanel },
          {
            key: "low",
            label: lowStockProducts.length > 0 ? `Sắp hết (${lowStockProducts.length})` : "Sắp hết",
            children: lowStockList,
          },
          {
            key: "expiring",
            label: urgentExpiringCount > 0 ? `HSD (${urgentExpiringCount})` : "HSD",
            children: expiringList,
          },
        ]}
      />
    </Card>
  );
};
