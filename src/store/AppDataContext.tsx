import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { products as initialProducts } from "../mock/products";
import { categories as initialCategories } from "../mock/categories";
import { sales as initialSales } from "../mock/sales";
import { purchases as initialPurchases } from "../mock/purchases";
import { debts as initialDebts } from "../mock/debts";
import { loadState, saveState, clearAllState } from "../utils/storage";
import { migrateProducts } from "../services/migrations";
import { applyPurchaseLines, applySaleDeduction, applyAdjustment, applyLoss } from "../services/inventoryService";
import { generateNotificationCandidates, mergeNotifications } from "../services/notificationService";
import { createBackup } from "../services/backupService";
import { computePayment } from "../utils/payment";
import type {
  Product,
  Category,
  Sale,
  SaleItem,
  Purchase,
  Debt,
  PaymentMethod,
  StockMovement,
  Supplier,
  Expense,
  ExpenseCategory,
  LossReason,
  AppNotification,
  BackupPayload,
  SurplusMode,
} from "../types";
import { LOSS_REASON_LABELS } from "../types";

/** Thông tin tiền khách trả khi thanh toán giỏ hàng. */
export interface CheckoutPayment {
  /** Tiền khách đưa (khách trả). Bỏ trống = khách trả đủ tổng đơn. */
  amountPaid: number;
  /** Cách xử lý phần tiền thừa (chỉ có tác dụng khi `amountPaid` > tổng đơn). Mặc định RETURN. */
  surplusMode?: SurplusMode;
}

interface CartLine {
  productId: string;
  quantity: number;
  /** Có giá trị khi dòng này được thêm bằng cách quét đúng mã vạch của 1 lô cụ thể. */
  batchId?: string;
}

interface AppDataContextValue {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  purchases: Purchase[];
  debts: Debt[];
  units: string[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  expenses: Expense[];
  notifications: AppNotification[];

  addProduct: (p: Omit<Product, "id">) => string;
  updateProduct: (id: string, p: Omit<Product, "id">) => void;
  deleteProduct: (id: string) => void;

  addCategory: (name: string) => string;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;

  /** Thêm 1 đơn vị mới vào danh sách gợi ý (gói, chai, vỉ...) nếu chưa có. */
  addUnit: (name: string) => void;

  addPurchase: (
    items: {
      productId: string;
      quantity: number;
      purchasePrice: number;
      expiryDate?: string;
      barcode?: string;
    }[],
    supplierId?: string
  ) => void;

  /**
   * Thanh toán giỏ hàng. Nếu khách trả THIẾU -> phần thiếu tự ghi vào Công nợ (khách nợ) với tên
   * khách = mã hóa đơn. Nếu khách đưa DƯ và chọn "nợ khách" (OWE) -> phần thừa ghi vào Công nợ
   * (loại cửa hàng nợ khách) với tên = mã hóa đơn.
   */
  checkout: (cart: CartLine[], paymentMethod: PaymentMethod, payment?: CheckoutPayment) => Sale;

  /** Điều chỉnh tồn kho thủ công (kiểm kho, sửa sai...) - luôn tạo StockMovement kèm lý do. */
  adjustStock: (productId: string, newStock: number, reason?: string) => void;

  payDebt: (debtId: string, amount: number, note?: string) => void;

  addDebt: (customerName: string, phone: string | undefined, totalPurchase: number) => void;
  updateDebt: (
    id: string,
    changes: { customerName: string; phone?: string; totalPurchase: number }
  ) => void;

  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => string;
  updateSupplier: (id: string, s: Omit<Supplier, "id" | "createdAt">) => void;
  deleteSupplier: (id: string) => void;

  addExpense: (e: { category: ExpenseCategory; amount: number; note?: string }) => void;
  updateExpense: (id: string, e: { category: ExpenseCategory; amount: number; note?: string }) => void;
  deleteExpense: (id: string) => void;


  /** Ghi nhận hàng bị mất khỏi tồn kho (hư hỏng/hết hạn/thất thoát/khác) - luôn tạo StockMovement. */
  recordLoss: (productId: string, reason: LossReason, quantity: number, note?: string) => void;


  /** Quét dữ liệu hiện tại, tạo thông báo mới cho rule nào đang thỏa mà CHƯA có thông báo cùng
   *  dedupKey (tránh spam trùng lặp). Gọi khi mở Trang chủ / Trung tâm thông báo. */
  syncNotifications: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;

  /** Đóng gói toàn bộ dữ liệu nghiệp vụ hiện tại thành 1 backup (dùng để export JSON). */
  exportBackup: () => BackupPayload;

  /** Ghi đè TOÀN BỘ dữ liệu hiện tại bằng dữ liệu trong backup (đã validate ở nơi gọi). */
  restoreBackup: (backup: BackupPayload) => void;

  /** Xóa hết dữ liệu đã lưu, khôi phục lại dữ liệu mẫu ban đầu. */
  resetToSampleData: () => void;

  /** Xóa trắng toàn bộ dữ liệu (không khôi phục mẫu) - dùng khi bắt đầu dùng thật. */
  resetAllData: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const STORAGE_KEYS = [
  "products",
  "categories",
  "sales",
  "purchases",
  "debts",
  "units",
  "idCounter",
  "stockMovements",
  "suppliers",
  "expenses",
  "notifications",
];

const DEFAULT_UNITS = [
  "gói", "chai", "lon", "hộp", "vỉ", "thùng", "kg", "cái", "chiếc", "bao", "túi", "hủ", "lốc",
];

let idCounter = loadState<number>("idCounter", 1000);
function nextId(prefix: string) {
  idCounter += 1;
  saveState("idCounter", idCounter);
  return `${prefix}${idCounter}`;
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() =>
    migrateProducts(loadState("products", initialProducts))
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadState("categories", initialCategories)
  );
  const [sales, setSales] = useState<Sale[]>(() => loadState("sales", initialSales));
  const [purchases, setPurchases] = useState<Purchase[]>(() =>
    loadState("purchases", initialPurchases)
  );
  const [debts, setDebts] = useState<Debt[]>(() => loadState("debts", initialDebts));
  const [units, setUnits] = useState<string[]>(() => loadState("units", DEFAULT_UNITS));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    loadState("stockMovements", [] as StockMovement[])
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadState("suppliers", [] as Supplier[]));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState("expenses", [] as Expense[]));
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadState("notifications", [] as AppNotification[])
  );

  // Mỗi khi 1 phần dữ liệu thay đổi, tự lưu xuống localStorage để không mất
  // khi tắt app / đóng trình duyệt / restart điện thoại.
  useEffect(() => saveState("products", products), [products]);
  useEffect(() => saveState("categories", categories), [categories]);
  useEffect(() => saveState("sales", sales), [sales]);
  useEffect(() => saveState("purchases", purchases), [purchases]);
  useEffect(() => saveState("debts", debts), [debts]);
  useEffect(() => saveState("units", units), [units]);
  useEffect(() => saveState("stockMovements", stockMovements), [stockMovements]);
  useEffect(() => saveState("suppliers", suppliers), [suppliers]);
  useEffect(() => saveState("expenses", expenses), [expenses]);
  useEffect(() => saveState("notifications", notifications), [notifications]);

  /** Ghi thêm 1 (hoặc nhiều) StockMovement mới vào sổ kho - luôn gán id + createdAt tại đây. */
  const pushMovements = (movements: Omit<StockMovement, "id" | "createdAt">[]) => {
    if (movements.length === 0) return;
    const createdAt = dayjs().toISOString();
    setStockMovements((prev) => [
      ...movements.map((m) => ({ ...m, id: nextId("mv"), createdAt })),
      ...prev,
    ]);
  };

  const value = useMemo<AppDataContextValue>(
    () => ({
      products,
      categories,
      sales,
      purchases,
      debts,
      units,
      stockMovements,
      suppliers,
      expenses,
      notifications,

      addProduct: (p) => {
        const id = nextId("p");
        setProducts((prev) => [...prev, { ...p, id }]);
        return id;
      },
      updateProduct: (id, p) =>
        setProducts((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  // QUAN TRỌNG: merge với dữ liệu CŨ trước, rồi mới ghi đè bằng giá trị mới (p).
                  // Form "Sửa sản phẩm" KHÔNG quản lý batches/expiryDate (2 trường này chỉ được
                  // tạo/cập nhật qua Nhập hàng và khi bán hàng) - nếu ghi đè toàn bộ bằng {...p}
                  // như trước đây, mọi lần bấm "Lưu" ở form Sửa sản phẩm (kể cả không đổi gì)
                  // sẽ XÓA SẠCH toàn bộ lô hàng/mã vạch/HSD đã có, dù người dùng không cố ý.
                  ...item,
                  ...p,
                  id,
                }
              : item
          )
        ),
      deleteProduct: (id) => setProducts((prev) => prev.filter((item) => item.id !== id)),

      addCategory: (name) => {
        const id = nextId("cat");
        setCategories((prev) => [...prev, { id, name }]);
        return id;
      },
      updateCategory: (id, name) =>
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c))),
      deleteCategory: (id) => setCategories((prev) => prev.filter((c) => c.id !== id)),

      addUnit: (name) =>
        setUnits((prev) => (prev.includes(name) ? prev : [...prev, name])),

      addPurchase: (items, supplierId) => {
        const total = items.reduce((sum, it) => sum + it.quantity * it.purchasePrice, 0);
        const purchaseId = nextId("pu");
        const purchase: Purchase = {
          id: purchaseId,
          code: `PN${String(purchases.length + 1).padStart(4, "0")}`,
          date: dayjs().toISOString(),
          items: items.map(({ productId, quantity, purchasePrice }) => ({
            productId,
            quantity,
            purchasePrice,
          })),
          total,
          supplierId,
        };
        setPurchases((prev) => [purchase, ...prev]);

        const newMovements: Omit<StockMovement, "id" | "createdAt">[] = [];
        const toLine = (l: (typeof items)[number]) => ({
          quantity: l.quantity,
          unitCost: l.purchasePrice,
          expiryDate: l.expiryDate,
          barcode: l.barcode,
          supplierId,
        });

        // Tính trước từ bản chụp `products` hiện tại bằng hàm thuần (không phụ thuộc thời điểm React
        // chạy hàm cập nhật state) để StockMovement + id lô luôn có đủ. QUAN TRỌNG: 1 phiếu nhập có
        // thể có NHIỀU dòng cùng 1 sản phẩm (ví dụ 2 mã vạch khác nhau của cùng 1 mặt hàng) -> phải
        // lấy TẤT CẢ các dòng khớp (filter), không chỉ dòng đầu tiên (find) - nếu không sẽ mất số
        // lượng + lô hàng của các dòng sau. Mỗi dòng nhập tạo 1 LÔ HÀNG MỚI (mã vạch + HSD + giá vốn
        // riêng) để bán hàng trừ đúng lô theo mã vạch / FEFO và tính COGS đúng.
        const batchIdsByProduct = new Map<string, string[]>();
        products.forEach((prod) => {
          const lines = items.filter((it) => it.productId === prod.id);
          if (lines.length === 0) return;
          const ids: string[] = [];
          const { movement } = applyPurchaseLines(prod, lines.map(toLine), () => {
            const id = nextId("batch");
            ids.push(id);
            return id;
          });
          batchIdsByProduct.set(prod.id, ids);
          newMovements.push({ ...movement, referenceId: purchaseId });
        });

        // Áp dụng lên state mới nhất, dùng lại ĐÚNG các id lô đã sinh ở trên (không sinh id mới).
        setProducts((prev) =>
          prev.map((prod) => {
            const lines = items.filter((it) => it.productId === prod.id);
            if (lines.length === 0) return prod;
            const ids = [...(batchIdsByProduct.get(prod.id) ?? [])];
            return applyPurchaseLines(prod, lines.map(toLine), () => ids.shift() ?? nextId("batch")).product;
          })
        );
        pushMovements(newMovements);
      },

      checkout: (cart, paymentMethod, payment) => {
        const saleId = nextId("s");
        const items: SaleItem[] = [];
        const newMovements: Omit<StockMovement, "id" | "createdAt">[] = [];

        // Tính danh sách món + giá vốn + StockMovement NGAY từ bản chụp `products` hiện tại bằng hàm thuần
        // (không phụ thuộc thời điểm React chạy hàm cập nhật state) - nhờ đó `total` luôn đúng ngay
        // lúc cần tính tiền thiếu/thừa/công nợ bên dưới.
        products.forEach((prod) => {
          const line = cart.find((l) => l.productId === prod.id);
          if (!line) return;
          const { movement, costInfo } = applySaleDeduction(prod, line.quantity, line.batchId);
          items.push({
            productId: prod.id,
            quantity: line.quantity,
            sellingPrice: prod.sellingPrice,
            batchId: costInfo.batchId,
            unitCost: costInfo.unitCost,
            costOfGoodsSold: costInfo.costOfGoodsSold,
          });
          newMovements.push({ ...movement, referenceId: saleId });
        });

        // Trừ kho: áp dụng lại cùng phép tính lên state mới nhất (functional update).
        setProducts((prev) =>
          prev.map((prod) => {
            const line = cart.find((l) => l.productId === prod.id);
            if (!line) return prod;
            return applySaleDeduction(prod, line.quantity, line.batchId).product;
          })
        );

        const total = items.reduce((sum, it) => sum + it.quantity * it.sellingPrice, 0);
        const code = `HD${String(sales.length + 1).padStart(4, "0")}`;

        // Tiền khách trả: mặc định đủ tổng đơn. Phép tính dùng chung với màn hình giỏ hàng.
        const { amountPaid, shortage, surplusMode, changeReturned, owedToCustomer } = computePayment(
          total,
          payment?.amountPaid ?? total,
          payment?.surplusMode
        );

        const sale: Sale = {
          id: saleId,
          code,
          date: dayjs().toISOString(),
          items,
          total,
          paymentMethod,
          amountPaid,
          changeReturned,
          shortage,
          owedToCustomer,
          surplusMode,
        };
        setSales((prev) => [sale, ...prev]);
        pushMovements(newMovements);

        // Ghi công nợ - tên khách lấy theo mã hóa đơn để chủ tiệm dễ đối chiếu với đơn gốc.
        if (shortage > 0) {
          setDebts((prev) => [
            { id: nextId("d"), customerName: code, totalPurchase: shortage, totalPaid: 0, history: [], kind: "CUSTOMER_OWES" },
            ...prev,
          ]);
        } else if (owedToCustomer > 0) {
          setDebts((prev) => [
            { id: nextId("d"), customerName: code, totalPurchase: owedToCustomer, totalPaid: 0, history: [], kind: "SHOP_OWES" },
            ...prev,
          ]);
        }
        return sale;
      },

      adjustStock: (productId, newStock, reason) => {
        const prod = products.find((p) => p.id === productId);
        if (!prod) return;
        // Movement tính từ bản chụp hiện tại (hàm thuần), không gom trong updater của setProducts.
        const { movement } = applyAdjustment(prod, newStock, reason);
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? applyAdjustment(p, newStock, reason).product : p))
        );
        pushMovements([movement]);
      },

      payDebt: (debtId, amount, note) =>
        setDebts((prev) =>
          prev.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  totalPaid: d.totalPaid + amount,
                  history: [
                    { id: nextId("h"), date: dayjs().toISOString(), amount, note },
                    ...d.history,
                  ],
                }
              : d
          )
        ),

      addDebt: (customerName, phone, totalPurchase) =>
        setDebts((prev) => [
          { id: nextId("d"), customerName, phone, totalPurchase, totalPaid: 0, history: [] },
          ...prev,
        ]),

      updateDebt: (id, changes) =>
        setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d))),

      addSupplier: (s) => {
        const id = nextId("sup");
        setSuppliers((prev) => [{ ...s, id, createdAt: dayjs().toISOString() }, ...prev]);
        return id;
      },
      updateSupplier: (id, s) =>
        setSuppliers((prev) => prev.map((item) => (item.id === id ? { ...item, ...s, id } : item))),
      deleteSupplier: (id) => setSuppliers((prev) => prev.filter((item) => item.id !== id)),

      addExpense: (e) =>
        setExpenses((prev) => [{ ...e, id: nextId("exp"), createdAt: dayjs().toISOString() }, ...prev]),
      updateExpense: (id, e) =>
        setExpenses((prev) => prev.map((item) => (item.id === id ? { ...item, ...e, id } : item))),
      deleteExpense: (id) => setExpenses((prev) => prev.filter((item) => item.id !== id)),

      recordLoss: (productId, reason, quantity, note) => {
        const movementType = reason === "DAMAGED" ? "DAMAGE" : reason === "EXPIRED" ? "EXPIRED" : "ADJUSTMENT";
        const reasonText = `${LOSS_REASON_LABELS[reason]}${note ? `: ${note}` : ""}`;
        const prod = products.find((p) => p.id === productId);
        if (!prod) return;
        // Movement tính từ bản chụp hiện tại (hàm thuần), không gom trong updater của setProducts.
        const { movement } = applyLoss(prod, quantity, movementType, reasonText);
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? applyLoss(p, quantity, movementType, reasonText).product : p))
        );
        pushMovements([movement]);
      },

      syncNotifications: () => {
        const candidates = generateNotificationCandidates(products, sales, debts);
        setNotifications((prev) =>
          mergeNotifications(prev, candidates, () => nextId("ntf"), dayjs().toISOString())
        );
      },
      markNotificationRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllNotificationsRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      dismissNotification: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),

      exportBackup: () =>
        createBackup({
          products,
          categories,
          sales,
          purchases,
          debts,
          units,
          stockMovements,
          suppliers,
          expenses,
        }),

      // QUAN TRỌNG: restore là hành động GHI ĐÈ TOÀN BỘ dữ liệu hiện tại - nơi gọi (UI) chịu
      // trách nhiệm validate file + hỏi xác nhận người dùng TRƯỚC KHI gọi hàm này. Ở đây chỉ lo
      // phần ghi dữ liệu, không hỏi lại lần nữa để tránh 2 lớp confirm chồng chéo.
      restoreBackup: (backup) => {
        const d = backup.data;
        setProducts(migrateProducts(d.products));
        setCategories(d.categories);
        setSales(d.sales);
        setPurchases(d.purchases);
        setDebts(d.debts);
        setUnits(d.units.length > 0 ? d.units : DEFAULT_UNITS);
        setStockMovements(d.stockMovements);
        setSuppliers(d.suppliers);
        setExpenses(d.expenses);
      },

      resetToSampleData: () => {
        clearAllState(STORAGE_KEYS);
        setProducts(migrateProducts(initialProducts));
        setCategories(initialCategories);
        setSales(initialSales);
        setPurchases(initialPurchases);
        setDebts(initialDebts);
        setUnits(DEFAULT_UNITS);
        setStockMovements([]);
        setSuppliers([]);
        setExpenses([]);
        setNotifications([]);
      },

      resetAllData: () => {
        clearAllState(STORAGE_KEYS);
        setProducts([]);
        setCategories([]);
        setSales([]);
        setPurchases([]);
        setDebts([]);
        setUnits(DEFAULT_UNITS);
        setStockMovements([]);
        setSuppliers([]);
        setExpenses([]);
        setNotifications([]);
      },
    }),
    [
      products,
      categories,
      sales,
      purchases,
      debts,
      units,
      stockMovements,
      suppliers,
      expenses,
      notifications,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
