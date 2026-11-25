import React, { useRef, useState } from "react";
import { Card, Button, Space, Modal, message, Alert } from "antd";
import {
  LockOutlined,
  InfoCircleOutlined,
  RightOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  ClearOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../store/AppDataContext";
import { validateBackup, readFileAsText, downloadTextFile } from "../services/backupService";
import { formatVND } from "../utils/format";
import { saleReceived } from "../utils/saleAmounts";
import MobileRow from "../components/MobileRow";
import type { BackupPayload } from "../types";

function iconSquare(icon: React.ReactNode, color: string, bg: string) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
      }}
    >
      {icon}
    </div>
  );
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { exportBackup, restoreBackup, resetToSampleData, resetAllData } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleBackup = () => {
    const backup = exportBackup();
    const filename = `taphoa-backup-${dayjs().format("YYYYMMDD-HHmm")}.json`;
    downloadTextFile(filename, JSON.stringify(backup, null, 2), "application/json");
    message.success("Đã tải file sao lưu");
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const result = validateBackup(parsed);
      if (!result.valid) {
        message.error(result.error);
        return;
      }
      setPendingBackup(result.backup);
    } catch {
      message.error("File backup không hợp lệ.");
    }
  };

  const confirmRestore = () => {
    if (!pendingBackup) return;
    setRestoring(true);
    restoreBackup(pendingBackup);
    setRestoring(false);
    setPendingBackup(null);
    message.success("Đã khôi phục dữ liệu thành công");
  };

  const handleResetSample = () => {
    Modal.confirm({
      title: "Đặt lại dữ liệu mẫu?",
      icon: <ExclamationCircleFilled style={{ color: "#d97706" }} />,
      content: "Toàn bộ dữ liệu hiện tại sẽ bị xóa và thay bằng dữ liệu mẫu ban đầu của app.",
      okText: "Đặt lại",
      cancelText: "Hủy",
      onOk: () => {
        resetToSampleData();
        message.success("Đã đặt lại dữ liệu mẫu");
      },
    });
  };

  const handleResetAll = () => {
    Modal.confirm({
      title: "Đặt lại toàn bộ - xóa trắng dữ liệu?",
      icon: <ExclamationCircleFilled style={{ color: "#dc2626" }} />,
      content:
        "Toàn bộ sản phẩm, đơn hàng, công nợ, chi phí... sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.",
      okText: "Xóa toàn bộ",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () => {
        resetAllData();
        message.success("Đã xóa toàn bộ dữ liệu");
      },
    });
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <MobileRow
        onClick={() => navigate("/security")}
        leading={iconSquare(<LockOutlined />, "#147f27", "#ecfdf5")}
        title="Bảo mật"
        subtitle="Khóa ứng dụng bằng mã PIN"
        trailing={<RightOutlined style={{ color: "#bfbfbf", fontSize: 13 }} />}
      />

      <Card
        className="page-card"
        style={{ marginBottom: 10 }}
        title={
          <span>
            <DatabaseOutlined style={{ color: "#147f27", marginRight: 8 }} />
            Sao lưu &amp; khôi phục
          </span>
        }
      >
        <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 14 }}>
          App lưu dữ liệu ngay trên máy này (offline) - không có server nào giữ hộ. Hãy sao lưu
          định kỳ để không mất dữ liệu khi đổi điện thoại hoặc lỡ xóa app.
        </div>
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Button block size="large" icon={<CloudDownloadOutlined />} onClick={handleBackup}>
            Sao lưu dữ liệu
          </Button>
          <Button block size="large" icon={<CloudUploadOutlined />} onClick={handlePickFile}>
            Khôi phục dữ liệu
          </Button>
        </Space>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Card>

      <Card
        className="page-card"
        style={{ marginBottom: 10 }}
        title={
          <span>
            <ReloadOutlined style={{ color: "#d97706", marginRight: 8 }} />
            Đặt lại dữ liệu
          </span>
        }
      >
        <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 14 }}>
          Chỉ dùng khi muốn bắt đầu lại từ đầu. Hãy sao lưu trước khi đặt lại nếu không chắc chắn.
        </div>
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Button block size="large" icon={<ReloadOutlined />} onClick={handleResetSample}>
            Đặt lại dữ liệu mẫu
          </Button>
          <Button block size="large" danger icon={<ClearOutlined />} onClick={handleResetAll}>
            Đặt lại toàn bộ (xóa hết)
          </Button>
        </Space>
      </Card>

      <MobileRow
        onClick={() => navigate("/about")}
        leading={iconSquare(<InfoCircleOutlined />, "#2563eb", "#dbeafe")}
        title="Thông tin"
        subtitle="Về ứng dụng, liên hệ tác giả"
        trailing={<RightOutlined style={{ color: "#bfbfbf", fontSize: 13 }} />}
      />

      <Modal
        title="Xác nhận khôi phục dữ liệu"
        open={!!pendingBackup}
        onCancel={() => setPendingBackup(null)}
        onOk={confirmRestore}
        okText="Khôi phục"
        okButtonProps={{ danger: true, loading: restoring }}
        cancelText="Hủy"
      >
        {pendingBackup && (
          <div>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12, borderRadius: 10 }}
              message="Dữ liệu hiện tại sẽ được thay thế hoàn toàn bằng dữ liệu trong file này."
            />
            <div style={{ fontSize: 13, color: "#475569" }}>
              <div>Ngày sao lưu: {dayjs(pendingBackup.createdAt).format("HH:mm DD/MM/YYYY")}</div>
              <div>Số sản phẩm: {pendingBackup.data.products.length}</div>
              <div>Số đơn bán: {pendingBackup.data.sales.length}</div>
              <div>Số phiếu nhập: {pendingBackup.data.purchases.length}</div>
              <div>
                Tổng tiền khách trả trong file:{" "}
                {formatVND(pendingBackup.data.sales.reduce((s, x) => s + saleReceived(x), 0))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Settings;
