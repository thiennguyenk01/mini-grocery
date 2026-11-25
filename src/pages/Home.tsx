import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button } from "antd";
import { useNavigate } from "react-router-dom";
import {
  SettingOutlined,
  BellOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  ImportOutlined,
  UserOutlined,
  HistoryOutlined,
  RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppData } from "../store/AppDataContext";
import { useStatsBoard } from "../hooks/useStatsBoard";
import SaleDetailModal from "../components/SaleDetailModal";
import { StatsSummaryCard, StatsTabs } from "../components/StatsBoard";
import { formatVND } from "../utils/format";
import type { Sale } from "../types";
import logo from "../assets/logo.png";

const SHOP_NAME = "Tạp Hóa Nga Cư";
const GREEN = "#147f27";
const GREEN_DEEP = "#0f5f1d";

interface QuickAction {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// Lối tắt phụ dùng một màu duy nhất (xanh của app); "Bán hàng" là nút chính riêng bên trên.
const QUICK_ACTIONS: QuickAction[] = [
  { key: "/products", label: "Sản phẩm", icon: <ShoppingOutlined /> },
  { key: "/purchases", label: "Nhập hàng", icon: <ImportOutlined /> },
  { key: "/debts", label: "Công nợ", icon: <UserOutlined /> },
  { key: "/sales/history", label: "Lịch sử", icon: <HistoryOutlined /> },
];

interface TodoRow {
  key: string;
  tone: string;
  title: string;
  detail: string;
  onClick: () => void;
}

/**
 * Trang chủ = tên tiệm + tổng tiền hôm nay + "Cần xử lý" (sắp hết, sắp hết hạn, khách nợ)
 * + nút Bán hàng + lối tắt phụ + các tab chi tiết.
 * Danh mục / Máy tính / Cài đặt không có lối tắt ở đây - vào từ "Thêm" (mobile) hoặc menu bên trái
 * (desktop); nút ⚙️ ở đầu trang vẫn mở Cài đặt.
 */
const Home: React.FC = () => {
  const { products, notifications, syncNotifications } = useAppData();
  const navigate = useNavigate();
  const board = useStatsBoard();
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [tab, setTab] = useState("recent");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Quét thông báo mới mỗi khi mở Trang chủ (không tạo trùng - xem mergeNotifications).
  useEffect(() => {
    syncNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const greeting = useMemo(() => {
    const hour = dayjs().hour();
    if (hour < 11) return "Chào buổi sáng";
    if (hour < 13) return "Chào buổi trưa";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  const openTab = (key: string) => {
    setTab(key);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const todos: TodoRow[] = [];
  if (board.lowStockProducts.length > 0) {
    const out = board.lowStockProducts.filter((p) => p.stock <= 0).length;
    todos.push({
      key: "low",
      tone: "#dc2626",
      title: `${board.lowStockProducts.length} mặt hàng sắp hết`,
      detail: out > 0 ? `${out} đã hết hàng` : "Cần nhập thêm",
      onClick: () => openTab("low"),
    });
  }
  if (board.urgentExpiringCount > 0) {
    todos.push({
      key: "expiring",
      tone: "#d97706",
      title: `${board.urgentExpiringCount} mặt hàng sắp hết hạn`,
      detail: "Còn dưới 30 ngày hoặc đã quá hạn",
      onClick: () => openTab("expiring"),
    });
  }
  if (board.customersWithDebt > 0) {
    todos.push({
      key: "debt",
      tone: GREEN,
      title: `${board.customersWithDebt} khách đang nợ`,
      detail: `Tổng ${formatVND(board.totalOutstandingDebt)}`,
      onClick: () => navigate("/debts"),
    });
  }

  return (
    <div>
      {/* Đầu trang: logo + tên tiệm + lời chào + chuông + cài đặt */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img
            src={logo}
            alt="Logo"
            style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: GREEN_DEEP }}>{SHOP_NAME}</div>
            <div style={{ fontSize: 12.5, color: "#667085" }}>{greeting}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Badge count={unreadCount} size="small" offset={[-4, 4]}>
            <Button
              type="text"
              aria-label="Thông báo"
              icon={<BellOutlined style={{ fontSize: 20 }} />}
              onClick={() => navigate("/notifications")}
            />
          </Badge>
          <Button
            type="text"
            aria-label="Cài đặt"
            icon={<SettingOutlined style={{ fontSize: 20 }} />}
            onClick={() => navigate("/settings")}
          />
        </div>
      </div>

      {/* Tổng tiền khách trả theo khoảng thời gian */}
      <StatsSummaryCard board={board} />

      {/* Cần xử lý: việc phải làm hôm nay, chạm để mở */}
      <div className="page-card" style={{ marginBottom: 14, padding: "6px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", padding: "10px 0 4px" }}>Cần xử lý</div>
        {todos.length === 0 ? (
          <div style={{ padding: "8px 0 14px", color: "#667085", fontSize: 14 }}>
            Không có việc nào cần xử lý. Tồn kho, hạn dùng và công nợ đều ổn.
          </div>
        ) : (
          todos.map((t, i) => (
            <button
              key={t.key}
              type="button"
              onClick={t.onClick}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                minHeight: 56,
                background: "none",
                border: "none",
                borderTop: i === 0 ? "none" : "1px solid #eef0ee",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.tone, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{t.title}</span>
                <span style={{ display: "block", fontSize: 12.5, color: "#667085" }}>{t.detail}</span>
              </span>
              <RightOutlined style={{ color: "#98a2b3", fontSize: 12 }} />
            </button>
          ))
        )}
      </div>

      {/* Nút chính + lối tắt phụ */}
      <Button
        type="primary"
        size="large"
        block
        icon={<ShoppingCartOutlined />}
        onClick={() => navigate("/sales")}
        style={{ height: 52, fontSize: 16, fontWeight: 700, borderRadius: 14, marginBottom: 10 }}
      >
        Bán hàng
      </Button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => navigate(action.key)}
            style={{
              background: "#fff",
              border: "1px solid #e4e9e4",
              borderRadius: 14,
              padding: "12px 4px",
              minHeight: 64,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              color: GREEN,
              font: "inherit",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{action.icon}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1f2933" }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Các tab chi tiết: Giao dịch / Bán chạy / Lợi nhuận / Tổng hợp / Sắp hết / HSD */}
      <div ref={tabsRef} style={{ scrollMarginTop: 8 }}>
        <StatsTabs board={board} onOpenSale={setDetailSale} activeKey={tab} onTabChange={setTab} />
      </div>

      <SaleDetailModal
        sale={detailSale}
        open={!!detailSale}
        onClose={() => setDetailSale(null)}
        products={products}
      />
    </div>
  );
};

export default Home;
