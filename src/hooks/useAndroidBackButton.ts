import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { message } from "antd";

const DOUBLE_PRESS_WINDOW_MS = 2000;

/**
 * Bắt nút BACK vật lý/cử chỉ của Android (chỉ có tác dụng khi chạy trong WebView Capacitor -
 * trên trình duyệt thường `backButton` không bao giờ bắn nên hook này coi như không làm gì).
 *
 * Quy tắc:
 * - Nếu người dùng ĐÃ điều hướng (chuyển trang) ít nhất 1 lần trong phiên này -> bấm back sẽ
 *   quay lại đúng màn hình TRƯỚC ĐÓ (giống nút back trên trình duyệt), không thoát app.
 * - Nếu đang đứng ở màn hình gốc (vừa mở app, CHƯA điều hướng đi đâu, hoặc đã back hết về gốc)
 *   -> bấm back LẦN 1 chỉ hiện thông báo nhắc "bấm lần nữa để thoát", bấm LẦN 2 trong vòng 2
 *   giây mới thực sự thoát app. Việc này tránh thoát app nhầm chỉ vì lỡ tay bấm back 1 lần.
 *
 * Cách xác định "đã điều hướng hay chưa": so sánh `window.history.length` HIỆN TẠI với giá trị
 * NGAY LÚC app vừa mở (baseline). `navigate()` của React Router luôn tăng `history.length` lên
 * 1 mỗi lần push - nên hễ còn lớn hơn baseline nghĩa là vẫn còn "đường lùi" trong phiên này.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const baselineLengthRef = useRef<number | null>(null);
  const lastBackPressAtRef = useRef(0);

  useEffect(() => {
    if (baselineLengthRef.current === null) {
      baselineLengthRef.current = window.history.length;
    }

    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      const baseline = baselineLengthRef.current ?? window.history.length;

      if (window.history.length > baseline) {
        navigate(-1);
        return;
      }

      const now = Date.now();
      if (now - lastBackPressAtRef.current < DOUBLE_PRESS_WINDOW_MS) {
        CapacitorApp.exitApp();
        return;
      }
      lastBackPressAtRef.current = now;
      message.info({ content: "Nhấn quay lại lần nữa để thoát", key: "back-to-exit", duration: 2 });
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate]);
}
