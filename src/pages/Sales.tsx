import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Empty, Button, Radio, notification, Tag, Popconfirm, Alert } from "antd";
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../store/AppDataContext";
import { formatVND } from "../utils/format";
import { getProductImage } from "../utils/avatar";
import { useIsMobile } from "../hooks/useIsMobile";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { findByBarcode } from "../utils/batches";
import ResponsiveModal from "../components/ResponsiveModal";
import SaleDetailModal from "../components/SaleDetailModal";
import SearchBar, { SearchActionButton } from "../components/SearchBar";
import CategoryChips from "../components/CategoryChips";
import MoneyInput from "../components/MoneyInput";
import { computePayment } from "../utils/payment";
import type { PaymentMethod, Sale, SurplusMode } from "../types";
import vietqr from "../assets/vietqr.png";

interface CartLine {
  productId: string;
  quantity: number;
  /** Có giá trị khi dòng này được thêm bằng cách quét đúng mã vạch của 1 lô cụ thể. */
  batchId?: string;
}

const Sales: React.FC = () => {
  const { products, categories, checkout } = useAppData();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [api, contextHolder] = notification.useNotification();
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  // Tiền khách đưa: null = "khách đưa đủ" (tự theo tổng cộng, đổi theo khi thêm/bớt hàng).
  const [paidInput, setPaidInput] = useState<number | null>(null);
  const [surplusMode, setSurplusMode] = useState<SurplusMode>("RETURN");
  const { scanOnce } = useBarcodeScanner();

  const filteredProducts = products.filter(
    (p) =>
      p.stock > 0 &&
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase())) &&
      (categoryFilter === null || p.categoryId === categoryFilter)
  );

  const addToCart = (productId: string, batchId?: string) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      const product = products.find((p) => p.id === productId);
      if (!product) return prev;
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + 1, batchId: batchId ?? l.batchId } : l
        );
      }
      return [...prev, { productId, quantity: 1, batchId }];
    });
  };

  const handleScanBarcode = async () => {
    const code = await scanOnce();
    if (!code) return; // người dùng hủy quét hoặc không đọc được mã

    const match = findByBarcode(products, code);
    const product = match?.product ?? products.find((p) => p.code === code);

    if (!product) {
      api.warning({
        message: "Chưa có sản phẩm với mã vạch này",
        description: `Mã quét được: ${code}. Bấm để tạo phiếu nhập cho sản phẩm này.`,
        btn: (
          <Button
            size="small"
            type="primary"
            onClick={() => navigate("/purchases", { state: { newBarcode: code } })}
          >
            Nhập hàng mới
          </Button>
        ),
      });
      return;
    }

    if (product.stock <= 0) {
      api.warning({ message: "Sản phẩm đã hết hàng", description: product.name });
      return;
    }

    addToCart(product.id, match?.batch.id);
    api.success({
      message: "Đã thêm vào giỏ hàng",
      description: `${product.name} · ${formatVND(product.sellingPrice)}`,
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId));

  const clearCart = () => {
    setCart([]);
    setCartSheetOpen(false);
    api.info({ message: "Đã làm mới giỏ hàng" });
  };

  const cartDetails = useMemo(
    () =>
      cart.map((line) => {
        const product = products.find((p) => p.id === line.productId)!;
        return { ...line, product, lineTotal: product.sellingPrice * line.quantity };
      }),
    [cart, products]
  );

  const totalQty = cartDetails.reduce((sum, l) => sum + l.quantity, 0);
  const total = cartDetails.reduce((sum, l) => sum + l.lineTotal, 0);
  const qtyInCart = (productId: string) => cart.find((l) => l.productId === productId)?.quantity ?? 0;

  // Gợi ý tiền khách đưa: các mệnh giá tiền Việt lớn hơn hoặc bằng tổng đơn, lấy tối đa 3 mức gần nhất.
  const BANKNOTES = [10000, 20000, 50000, 100000, 200000, 500000];
  const cashSuggestions = BANKNOTES.filter((n) => n > total).slice(0, 3);

  // Giỏ hàng trống (xóa hết / xóa từng món / vừa thanh toán xong) -> bỏ số tiền khách trả đã nhập
  // dở, tránh dính sang đơn kế tiếp.
  useEffect(() => {
    if (cart.length === 0) {
      setPaidInput(null);
      setSurplusMode("RETURN");
    }
  }, [cart.length]);

  // Chỉ TIỀN MẶT mới nhập tiền khách trả (có thể thiếu/dư). CHUYỂN KHOẢN luôn coi là khách chuyển
  // đủ tổng đơn - chỉ hiện mã QR, không có tiền khách trả/tiền thiếu.
  const isCash = paymentMethod === "cash";
  // Phép tính dùng chung với checkout() - số hiển thị ở đây chính là số sẽ được lưu vào đơn.
  // Ô tiền khách trả ĐỂ TRỐNG (null) = chưa nhập -> không báo thiếu/thừa, khi thanh toán coi như
  // khách trả đủ (tránh lỡ tay để trống mà cả đơn bị đẩy hết vào công nợ).
  const pay = computePayment(total, isCash ? paidInput ?? total : total, surplusMode);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const sale = checkout(cart, paymentMethod, isCash ? { amountPaid: pay.amountPaid, surplusMode } : undefined);
    const parts = [`Tổng tiền: ${formatVND(total)}`, `Khách trả: ${formatVND(pay.amountPaid)}`];
    if (pay.changeReturned > 0) parts.push(`Trả lại khách: ${formatVND(pay.changeReturned)}`);
    if (pay.shortage > 0) parts.push(`Thiếu ${formatVND(pay.shortage)} - đã ghi vào Công nợ (${sale.code})`);
    if (pay.owedToCustomer > 0) parts.push(`Nợ khách ${formatVND(pay.owedToCustomer)} - đã ghi vào Công nợ (${sale.code})`);
    api.success({ message: "Thanh toán thành công", description: parts.join(" · ") });
    setCart([]);
    setCartSheetOpen(false);
    setCompletedSale(sale);
    setPaidInput(null);
    setSurplusMode("RETURN");
  };

  const cartContent = (
    <>
      {cartDetails.length === 0 ? (
        <Empty description="Chưa có sản phẩm trong giỏ" />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Popconfirm
              title="Làm mới giỏ hàng?"
              description="Toàn bộ sản phẩm đang chọn sẽ bị xóa khỏi giỏ."
              okText="Xóa hết"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
              onConfirm={clearCart}
            >
              <Button size="small" danger icon={<ClearOutlined />}>
                Làm mới giỏ hàng
              </Button>
            </Popconfirm>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cartDetails.map((l) => (
              <div key={l.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <img
                  src={getProductImage(l.product.name, l.product.image)}
                  alt={l.product.name}
                  style={{ width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 8, objectFit: "cover" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{l.product.name}</div>
                  <div style={{ color: "#888", fontSize: 12 }}>{formatVND(l.product.sellingPrice)} / {l.product.unit}</div>
                </div>
                <Button size={isMobile ? "middle" : "small"} icon={<MinusOutlined />} onClick={() => changeQty(l.productId, -1)} />
                <span style={{ width: 24, textAlign: "center" }}>{l.quantity}</span>
                <Button size={isMobile ? "middle" : "small"} icon={<PlusOutlined />} onClick={() => changeQty(l.productId, 1)} disabled={l.quantity >= l.product.stock} />
                <b style={{ width: 80, textAlign: "right", fontSize: isMobile ? 13 : 14 }}>{formatVND(l.lineTotal)}</b>
                <Button size={isMobile ? "middle" : "small"} danger icon={<DeleteOutlined />} onClick={() => removeLine(l.productId)} />
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 16, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span>Tạm tính</span>
          <span>{formatVND(total)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          <span>Tổng cộng</span>
          <span style={{ color: "#147f27" }}>{formatVND(total)}</span>
        </div>

        <Radio.Group
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            // Đổi phương thức -> bỏ số tiền khách trả đã nhập dở, tránh dính sang phương thức kia.
            setPaidInput(null);
            setSurplusMode("RETURN");
          }}
          style={{ marginBottom: 16, width: "100%" }}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="cash" style={{ width: "50%", textAlign: "center" }}>
            Tiền mặt
          </Radio.Button>
          <Radio.Button value="transfer" style={{ width: "50%", textAlign: "center" }}>
            Chuyển khoản
          </Radio.Button>
        </Radio.Group>

        {paymentMethod === "transfer" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 16,
              padding: 12,
              background: "#fafafa",
              borderRadius: 12,
            }}
          >
            <img src={vietqr} alt="Mã QR chuyển khoản" style={{ width: 200, maxWidth: "100%", borderRadius: 12 }} />
            <span style={{ marginTop: 8, color: "#888", fontSize: 13, textAlign: "center" }}>
              Đưa mã này cho khách quét để chuyển khoản {formatVND(total)}
            </span>
          </div>
        )}

        {isCash && cart.length > 0 && (
          <div style={{ background: "#fafafa", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Tiền khách trả</div>
            <MoneyInput
              size="large"
              allowEmpty
              placeholder="Nhập số tiền khách đưa"
              value={paidInput ?? undefined}
              onChange={(v) => setPaidInput(v)}
              onClear={() => setPaidInput(null)}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {[{ label: "Vừa đủ", value: null as number | null }, ...cashSuggestions.map((n) => ({ label: formatVND(n), value: n as number | null }))].map((c) => {
                const active = paidInput === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setPaidInput(c.value)}
                    style={{
                      border: `1px solid ${active ? "#147f27" : "#d7ddd7"}`,
                      background: active ? "#147f27" : "#fff",
                      color: active ? "#fff" : "#1f2933",
                      borderRadius: 999,
                      padding: "8px 14px",
                      minHeight: 40,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div style={{ borderTop: "1px dashed #e5e7eb", marginTop: 12, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Tiền trả khách</span>
                <b style={{ color: pay.changeReturned > 0 ? "#147f27" : undefined }}>{formatVND(pay.changeReturned)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tiền thiếu</span>
                <b style={{ color: pay.shortage > 0 ? "#dc2626" : undefined }}>{formatVND(pay.shortage)}</b>
              </div>
            </div>

            {pay.surplus > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 6 }}>
                  Khách đưa dư {formatVND(pay.surplus)} - xử lý thế nào?
                </div>
                <Radio.Group
                  value={surplusMode}
                  onChange={(e) => setSurplusMode(e.target.value)}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Radio value="RETURN">Trả lại tiền thừa cho khách</Radio>
                  <Radio value="GIFT">
                    <b>A</b> · Khách cho <span style={{ color: "#8c8c8c" }}>(tiền thừa)</span>
                  </Radio>
                  <Radio value="OWE">
                    <b>B</b> · Nợ khách <span style={{ color: "#8c8c8c" }}>(lần sau quay lại bù vào)</span>
                  </Radio>
                </Radio.Group>
                {surplusMode === "OWE" && (
                  <div style={{ fontSize: 12, color: "#d97706", marginTop: 6 }}>
                    Sẽ ghi vào Công nợ (Nợ khách), tên khách là mã hóa đơn.
                  </div>
                )}
              </div>
            )}

            {pay.shortage > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 12, borderRadius: 10 }}
                message="Khách còn thiếu - số tiền thiếu sẽ tự ghi vào Công nợ, tên khách là mã hóa đơn."
              />
            )}
          </div>
        )}

        {!isMobile && (
          <Button type="primary" block size="large" disabled={cart.length === 0} onClick={handleCheckout}>
            Thanh toán
          </Button>
        )}
      </div>
    </>
  );

  const categoryChips = (
    <CategoryChips
      categories={categories}
      value={categoryFilter}
      onChange={(v) => setCategoryFilter(v ?? null)}
      allValue={null}
    />
  );

  const productGrid = (
    <>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Tìm sản phẩm..."
        size={isMobile ? "large" : "middle"}
        style={{ marginBottom: 14 }}
        actions={
          <SearchActionButton
            icon={<QrcodeOutlined />}
            onClick={handleScanBarcode}
            size={isMobile ? "large" : "middle"}
            label={isMobile ? undefined : "Quét mã"}
          />
        }
      />
      {categoryChips}
      <Row gutter={[12, 12]}>
        {filteredProducts.map((p) => {
          const inCart = qtyInCart(p.id);
          const maxed = inCart >= p.stock;
          const low = p.stock <= p.lowStockThreshold;
          return (
            <Col xs={12} sm={8} md={8} key={p.id}>
              <Card
                hoverable={!maxed}
                size="small"
                role="button"
                tabIndex={0}
                aria-label={`Thêm ${p.name} vào giỏ${inCart ? `, đang có ${inCart}` : ""}`}
                onClick={() => addToCart(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    addToCart(p.id);
                  }
                }}
                style={{
                  position: "relative",
                  textAlign: "center",
                  borderRadius: 12,
                  cursor: maxed ? "not-allowed" : "pointer",
                  opacity: maxed ? 0.55 : 1,
                  borderColor: inCart > 0 ? "#147f27" : undefined,
                  boxShadow: inCart > 0 ? "0 0 0 1px #147f27" : undefined,
                }}
              >
                {inCart > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      minWidth: 26,
                      height: 26,
                      padding: "0 7px",
                      borderRadius: 13,
                      background: "#147f27",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      lineHeight: "26px",
                    }}
                  >
                    {inCart}
                  </span>
                )}
                <img
                  src={getProductImage(p.name, p.image)}
                  alt=""
                  style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", marginBottom: 6 }}
                />
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: "#147f27", fontWeight: 700, marginTop: 4 }}>
                  {formatVND(p.sellingPrice)}
                </div>
                <Tag color={low ? "red" : undefined} style={{ marginTop: 6 }}>
                  {maxed ? "Đã lấy hết" : `còn ${p.stock} ${p.unit}`}
                </Tag>
              </Card>
            </Col>
          );
        })}
        {filteredProducts.length === 0 && (
          <Col span={24}>
            <Empty description="Không tìm thấy sản phẩm" />
          </Col>
        )}
      </Row>
    </>
  );

  const historyButton = (
    <Button icon={<HistoryOutlined />} onClick={() => navigate("/sales/history")}>
      Lịch sử giao dịch
    </Button>
  );

  return (
    <>
      {contextHolder}

      {isMobile ? (
        <div style={{ paddingBottom: cart.length > 0 ? 78 : 0 }}>
          <Card
            className="page-card"
            title="Chọn sản phẩm"
            extra={
              <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => navigate("/sales/history")}>
                Lịch sử
              </Button>
            }
          >
            {productGrid}
          </Card>
        </div>
      ) : (
        <Row gutter={16}>
          <Col xs={24} lg={15}>
            <Card className="page-card" title="Chọn sản phẩm" extra={historyButton}>
              {productGrid}
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card className="page-card" title={<span><ShoppingCartOutlined /> Giỏ hàng</span>}>
              {cartContent}
            </Card>
          </Col>
        </Row>
      )}

      {/* Thanh giỏ hàng dính ở dưới, nổi trên bottom nav (chỉ mobile) */}
      {isMobile && cart.length > 0 && (
        <div
          onClick={() => setCartSheetOpen(true)}
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
            zIndex: 95,
            background: "#147f27",
            color: "#fff",
            borderRadius: 14,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 6px 16px rgba(22,163,74,0.4)",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <ShoppingCartOutlined style={{ fontSize: 18 }} />
            {totalQty} sản phẩm
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
            {formatVND(total)} <span style={{ fontSize: 12, fontWeight: 400 }}>Xem giỏ</span>
          </span>
        </div>
      )}

      <ResponsiveModal
        title={<span><ShoppingCartOutlined /> Giỏ hàng</span>}
        open={cartSheetOpen}
        onClose={() => setCartSheetOpen(false)}
        footer={
          <Button type="primary" block size="large" style={{ height: 48 }} disabled={cart.length === 0} onClick={handleCheckout}>
            Thanh toán {cart.length > 0 && formatVND(total)}
          </Button>
        }
      >
        {cartContent}
      </ResponsiveModal>

      <SaleDetailModal
        sale={completedSale}
        open={!!completedSale}
        onClose={() => setCompletedSale(null)}
        products={products}
      />
    </>
  );
};

export default Sales;
