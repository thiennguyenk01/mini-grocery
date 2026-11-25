<p align="center">
  <img src="src/assets/logo.png" alt="Logo Tạp Hóa Mini" width="120" />
</p>

<h1 align="center">Tạp Hóa Mini</h1>

<p align="center">
  Ứng dụng di động quản lý tạp hóa nhỏ: bán hàng, nhập hàng, tồn kho, công nợ và sao lưu dữ liệu.<br />
  Dành cho Android.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" alt="Capacitor 8" />
</p>

<p align="center">
  <img src="docs/screenshots/01-trang-chu.png" alt="Trang chủ trên điện thoại" width="260" />
</p>

> 💡 **Offline-first:** toàn bộ dữ liệu lưu trên thiết bị. Không cần server, không cần tài khoản, không cần internet.

---

## ✨ Điểm nổi bật

- 🧾 **Bán hàng nhanh:** chọn sản phẩm theo danh mục hoặc quét mã vạch, tính tiền tự động.
- 💰 **Xử lý tiền thừa linh hoạt:** trả lại, cho (tặng) hoặc ghi nợ khi khách đưa dư.
- 📦 **Tồn kho tự động:** nhập hàng tự tăng tồn, bán hàng tự giảm, cảnh báo khi sắp hết.
- 👥 **Quản lý công nợ:** theo dõi khách đang nợ và số tiền đã trả.
- 🔐 **Bảo mật bằng PIN:** mã PIN được băm PBKDF2-SHA256, không lưu dạng rõ.
- 💾 **Sao lưu và khôi phục:** xuất toàn bộ dữ liệu ra file JSON, có kiểm tra hợp lệ trước khi ghi đè.

---

## 📸 Xem nhanh giao diện

<table>
  <tr>
    <td align="center" width="25%">
      <img src="docs/screenshots/02-ban-hang.png" alt="Bán hàng" width="200" /><br />
      <b>Bán hàng</b><br />chọn sản phẩm nhanh theo danh mục
    </td>
    <td align="center" width="25%">
      <img src="docs/screenshots/03-san-pham.png" alt="Sản phẩm" width="200" /><br />
      <b>Sản phẩm</b><br />giá nhập, giá bán, tồn kho
    </td>
    <td align="center" width="25%">
      <img src="docs/screenshots/04-nhap-hang.png" alt="Nhập hàng" width="200" /><br />
      <b>Nhập hàng</b><br />lịch sử các phiếu nhập
    </td>
    <td align="center" width="25%">
      <img src="docs/screenshots/05-cong-no.png" alt="Công nợ" width="200" /><br />
      <b>Công nợ</b><br />khách đang nợ và số đã trả
    </td>
  </tr>
</table>

---

## 📋 Tính năng đầy đủ

| Nhóm | Chức năng |
| --- | --- |
| 🏠 Tổng quan | Trang chủ với thống kê và xu hướng doanh thu so với hôm qua |
| 🧾 Bán hàng | Tạo đơn bán, tính tiền khách đưa, xem lịch sử giao dịch |
| 📦 Sản phẩm | Quản lý sản phẩm, ảnh, mã hàng, quét mã vạch, cảnh báo hạn sử dụng |
| 🏷️ Danh mục | Phân loại sản phẩm |
| 📥 Nhập hàng | Phiếu nhập theo đơn lẻ hoặc theo thùng, tự cập nhật tồn kho |
| 👥 Công nợ | Theo dõi khách nợ và số tiền đã trả |
| 🤝 Nhà cung cấp | Danh bạ nhà cung cấp |
| 💸 Chi phí | Ghi nhận chi phí vận hành |
| 🧮 Máy tính | Máy tính nhanh tích hợp |
| 🔔 Thông báo | Thông báo cục bộ: tồn kho thấp, sắp hết hạn, biến động doanh thu |
| 🔐 Bảo mật | Khoá ứng dụng bằng mã PIN |
| 💾 Sao lưu | Xuất / khôi phục dữ liệu bằng file JSON |

---

## 🚀 Bắt đầu nhanh

Nếu đã có Node.js 20 trở lên và Android Studio:

```bash
git clone https://github.com/thiennguyenk01/mini-grocery.git
cd mini-grocery
npm install
npm run android
```

Lệnh cuối build app, đồng bộ sang project Android rồi mở Android Studio. Nhấn **Run ▶** để cài lên điện thoại hoặc emulator. Dữ liệu mẫu sẽ có sẵn để bạn dùng thử.

---

## 🛠️ Hướng dẫn cài đặt chi tiết

### Yêu cầu

| Phần mềm | Phiên bản | Ghi chú |
| --- | --- | --- |
| Node.js | 20 trở lên (đã kiểm tra với 24) | Kèm npm, dùng để build web và đồng bộ |
| Git | Bất kỳ | Để clone repo |
| Android Studio | Mới nhất | Bắt buộc, dùng để cài app lên thiết bị |
| Điện thoại Android | Android 7.0 trở lên | Hoặc dùng emulator trong Android Studio |

> ℹ️ Đây là ứng dụng di động, không có bản chạy trên trình duyệt. Mọi thao tác chạy app đều đi qua Android Studio.

### Bước 1: Clone repository

```bash
git clone https://github.com/thiennguyenk01/mini-grocery.git
cd mini-grocery
```

### Bước 2: Cài đặt thư viện

```bash
npm install
```

Lệnh này cài toàn bộ dependencies trong `package.json` vào `node_modules/`.

### Bước 3: Cài Android Studio

Tải và cài [Android Studio](https://developer.android.com/studio). Lần mở đầu, để trình cài đặt tải Android SDK mặc định.

### Bước 4: Build và mở project Android

```bash
npm run android
```

Lệnh này build code web (`npm run build`), đồng bộ sang thư mục `android/` bằng Capacitor, rồi mở project trong Android Studio. Lần đầu có thể mất vài phút để Gradle tải thư viện.

### Bước 5: Chạy app trên điện thoại hoặc emulator

1. **Điện thoại thật:** bật *Tuỳ chọn nhà phát triển* và *Gỡ lỗi USB*, cắm cáp vào máy tính.
2. **Emulator:** vào *Device Manager* trong Android Studio và tạo một thiết bị ảo nếu chưa có.
3. Chọn thiết bị ở thanh công cụ, rồi nhấn **Run ▶**.

### Bước 6: Cập nhật sau khi sửa code

Mỗi khi thay đổi mã nguồn trong `src/`, chạy lại:

```bash
npm run android:sync
```

Sau đó nhấn **Run ▶** trong Android Studio để cài bản mới.

---

## 🎬 Thử nghiệm luồng chính

Sau khi cài app lên điện thoại hoặc emulator, bạn có thể làm theo thứ tự sau:

1. **Thêm danh mục.** Vào **Danh mục**, tạo ít nhất một danh mục (ví dụ: *Đồ uống*).
2. **Thêm sản phẩm.** Vào **Sản phẩm**, nhấn **+** rồi nhập tên, đơn vị (gói, chai, kg...), giá nhập, giá bán, danh mục, ngưỡng cảnh báo và ảnh (tuỳ chọn). Trên Android có thể quét mã vạch.
3. **Nhập hàng.** Vào **Nhập hàng**, tạo phiếu nhập cho sản phẩm vừa thêm. Chọn nhập lẻ hoặc theo thùng. Tồn kho tự tăng sau khi lưu.
4. **Bán hàng.** Vào **Bán hàng**, thêm sản phẩm vào giỏ, nhập số tiền khách đưa:
   - Khách đưa đủ: đơn hoàn tất.
   - Khách đưa thiếu: phần còn lại được ghi vào **Công nợ**.
   - Khách đưa dư: chọn **trả lại** tiền thừa, **cho** (tặng) phần dư, hoặc **ghi nợ** để cửa hàng nợ lại khách.
5. **Xem công nợ và lịch sử.** Vào **Công nợ** để xem khách nợ, hoặc nhấn **Lịch sử giao dịch** trong trang Bán hàng.
6. **Xem thống kê.** Quay lại **Trang chủ** để xem doanh thu và xu hướng so với hôm qua.
7. **Đặt mã PIN.** Vào **Cài đặt → Bảo mật** để đặt PIN. Lần mở app sau sẽ yêu cầu nhập PIN.
8. **Sao lưu.** Vào **Cài đặt** để xuất file JSON. Khi cần, dùng chức năng khôi phục để nạp lại dữ liệu.

---

## 🧰 Công nghệ

- **Frontend:** React 19, TypeScript, Vite 8, Ant Design 6, React Router 7 (HashRouter), dayjs
- **Mobile:** Capacitor 8 (Android), `@capacitor-mlkit/barcode-scanning` cho quét mã vạch
- **Công cụ:** oxlint

---

## 🗂️ Cấu trúc thư mục

```
tap-hoa-mini/
├── android/              # Project Android (Capacitor)
├── docs/screenshots/     # Ảnh chụp màn hình dùng trong README
├── public/               # Tài nguyên tĩnh
├── src/
│   ├── components/       # Thành phần UI dùng lại (modal, nhập tiền, PIN...)
│   ├── hooks/            # Custom hooks (quét mã vạch, nút back Android...)
│   ├── layouts/          # Layout chính, thanh điều hướng, danh sách menu
│   ├── mock/             # Dữ liệu mẫu ban đầu
│   ├── pages/            # Các trang chức năng
│   ├── services/         # Sao lưu, PIN, thông báo, migration dữ liệu
│   ├── store/            # Context quản lý state toàn app
│   ├── types/            # Kiểu dữ liệu TypeScript
│   └── utils/            # Hàm tiện ích (định dạng, hạn sử dụng, tính tiền...)
├── website/              # Trang giới thiệu tĩnh
├── capacitor.config.ts   # Cấu hình Capacitor (appId, appName)
└── vite.config.ts        # Cấu hình Vite
```

---

## 📜 Các lệnh npm

| Lệnh | Tác dụng |
| --- | --- |
| `npm run build` | Kiểm tra TypeScript và đóng gói web (bước đầu của build Android) |
| `npm run lint` | Kiểm tra code bằng oxlint |
| `npm run android` | Build web, sync và mở Android Studio |
| `npm run android:sync` | Build web và sync sang project Android sau khi sửa code |

---

## ❓ Xử lý sự cố

- **`npm install` lỗi:** xoá `node_modules/` và `package-lock.json` rồi chạy lại, hoặc kiểm tra phiên bản Node.js.
- **Gradle tải thư viện lâu hoặc lỗi lần đầu:** đợi quá trình đồng bộ xong trong Android Studio, rồi thử *Build → Rebuild Project*.
- **Đã sửa code nhưng app không đổi:** chạy lại `npm run android:sync` rồi nhấn **Run ▶**.
- **Dữ liệu biến mất:** dữ liệu nằm trong bộ nhớ của app trên máy. Xoá dữ liệu app hoặc gỡ cài đặt sẽ xoá dữ liệu. Hãy sao lưu thường xuyên.
- **Quét mã vạch không hoạt động:** tính năng này cần chạy trên thiết bị Android thật và cấp quyền camera cho app. Emulator thường không quét được.

---

## 📄 Giấy phép

Dự án chưa khai báo giấy phép. Liên hệ chủ repository trước khi sử dụng lại mã nguồn.
