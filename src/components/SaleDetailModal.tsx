import React from "react";
import { Table, Tag, Descriptions, Button } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Product, Sale } from "../types";
import { formatVND } from "../utils/format";
import { getProductImage } from "../utils/avatar";
import { downloadReceiptImage } from "../utils/receipt";
import ResponsiveModal from "./ResponsiveModal";
import MobileRow from "./MobileRow";
import { useIsMobile } from "../hooks/useIsMobile";

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
  products: Product[];
}

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ sale, open, onClose, products }) => {
  const isMobile = useIsMobile();
  const productMap = React.useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  const handleDownloadImage = () => {
    if (!sale) return;
    downloadReceiptImage(sale, products);
  };

  return (
    <ResponsiveModal
      title={sale ? `Chi tiết đơn hàng ${sale.code}` : "Chi tiết đơn hàng"}
      open={open}
      onClose={onClose}
      width={640}
      destroyOnHidden
      footer={
        sale && (
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <Button style={{ flex: 1 }} icon={<PictureOutlined />} onClick={handleDownloadImage}>
              Tải hình ảnh
            </Button>
            <Button style={{ flex: 1 }} type="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        )
      }
      closable={false}
    >
      {sale && (
        <>
          <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Mã đơn">{sale.code}</Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {dayjs(sale.date).format("HH:mm DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Thanh toán">
              <Tag color={sale.paymentMethod === "cash" ? "green" : "blue"}>
                {sale.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số mặt hàng">{sale.items.length}</Descriptions.Item>
          </Descriptions>

          {isMobile ? (
            <div>
              {sale.items.map((it, idx) => {
                const p = productMap[it.productId];
                return (
                  <MobileRow
                    key={idx}
                    leading={
                      <img
                        src={getProductImage(p?.name ?? "?", p?.image)}
                        alt={p?.name ?? "?"}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }}
                      />
                    }
                    title={p?.name ?? "Sản phẩm đã xóa"}
                    subtitle={`${formatVND(it.sellingPrice)} x ${it.quantity}`}
                    trailing={formatVND(it.sellingPrice * it.quantity)}
                  />
                );
              })}
            </div>
          ) : (
            <Table
              rowKey={(_, idx) => String(idx)}
              dataSource={sale.items}
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Sản phẩm",
                  render: (_, it) => {
                    const p = productMap[it.productId];
                    return (
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                          src={getProductImage(p?.name ?? "?", p?.image)}
                          alt={p?.name ?? "?"}
                          style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
                        />
                        {p?.name ?? "Sản phẩm đã xóa"}
                      </span>
                    );
                  },
                },
                { title: "Đơn giá", dataIndex: "sellingPrice", render: formatVND, align: "right" },
                { title: "SL", dataIndex: "quantity", align: "right" },
                {
                  title: "Thành tiền",
                  align: "right",
                  render: (_, it) => formatVND(it.sellingPrice * it.quantity),
                },
              ]}
            />
          )}

          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              fontSize: 16,
              marginTop: 16,
              color: "#147f27",
            }}
          >
            Tổng cộng: {formatVND(sale.total)}
          </div>

          {/* Chi tiết tiền khách trả - chỉ có ở đơn tạo sau khi có tính năng nhập tiền khách trả */}
          {sale.amountPaid !== undefined && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#fafafa", borderRadius: 10, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Tiền khách trả</span>
                <b>{formatVND(sale.amountPaid)}</b>
              </div>
              {(sale.changeReturned ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Tiền trả khách</span>
                  <b style={{ color: "#147f27" }}>{formatVND(sale.changeReturned ?? 0)}</b>
                </div>
              )}
              {sale.surplusMode === "GIFT" && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Khách cho (tiền thừa)</span>
                  <b>{formatVND(sale.amountPaid - sale.total)}</b>
                </div>
              )}
              {(sale.owedToCustomer ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Nợ khách (ghi công nợ)</span>
                  <b style={{ color: "#d97706" }}>{formatVND(sale.owedToCustomer ?? 0)}</b>
                </div>
              )}
              {(sale.shortage ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tiền thiếu (ghi công nợ)</span>
                  <b style={{ color: "#dc2626" }}>{formatVND(sale.shortage ?? 0)}</b>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </ResponsiveModal>
  );
};

export default SaleDetailModal;
