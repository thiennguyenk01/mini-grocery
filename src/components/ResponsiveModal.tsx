import React from "react";
import { Modal, Drawer } from "antd";
import { useIsMobile } from "../hooks/useIsMobile";

interface ResponsiveModalProps {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  width?: number;
  /** Footer tùy biến (nút Lưu/Hủy...). Bỏ qua = không có footer (dùng cho màn xem chi tiết). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  destroyOnHidden?: boolean;
  /** Ẩn nút X đóng mặc định ở góc - dùng khi đã có nút "Đóng" riêng trong `footer` để tránh có
   *  2 cách đóng trùng lặp trên cùng 1 màn hình. Mặc định `true` (giữ hành vi cũ). */
  closable?: boolean;
}

/**
 * Trên desktop: hiển thị như Modal ở giữa màn hình (giữ nguyên UX cũ).
 * Trên mobile: hiển thị dạng bottom sheet trượt lên từ dưới, bo góc trên,
 * đúng pattern Android quen thuộc thay vì 1 popup nhỏ giữa màn hình.
 */
const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  open,
  title,
  onClose,
  width = 560,
  footer,
  children,
  destroyOnHidden,
  closable = true,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer
        title={title}
        open={open}
        onClose={onClose}
        placement="bottom"
        height="90%"
        push={false}
        destroyOnHidden={destroyOnHidden}
        closable={closable}
        styles={{
          content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
          body: { paddingBottom: 20 },
        }}
        footer={footer}
      >
        {children}
      </Drawer>
    );
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={footer ?? null}
      width={width}
      destroyOnHidden={destroyOnHidden}
      closable={closable}
    >
      {children}
    </Modal>
  );
};

export default ResponsiveModal;
