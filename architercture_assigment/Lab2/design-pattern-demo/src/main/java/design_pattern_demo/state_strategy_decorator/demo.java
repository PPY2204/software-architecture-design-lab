//// --- STATE PATTERN ---
//interface OrderState {
//    void next(Order order);
//    void printStatus();
//}
//
//class NewOrder implements OrderState {
//    public void next(Order order) { order.setState(new ProcessingOrder()); }
//    public void printStatus() { System.out.println("Trạng thái: Đơn hàng Mới tạo."); }
//}
//
//class ProcessingOrder implements OrderState {
//    public void next(Order order) { order.setState(new DeliveredOrder()); }
//    public void printStatus() { System.out.println("Trạng thái: Đang xử lý & Đóng gói."); }
//}
//
//// --- STRATEGY PATTERN (Vận chuyển) ---
//interface ShippingStrategy {
//    double calculate(double weight);
//}
//
//class ExpressShipping implements ShippingStrategy {
//    public double calculate(double weight) { return weight * 50000; }
//}
//
//// --- DECORATOR PATTERN (Dịch vụ cộng thêm) ---
//interface OrderComponent {
//    double getCost();
//    String getDescription();
//}
//
//class BasicOrder implements OrderComponent {
//    public double getCost() { return 100000; } // Giá gốc đơn hàng
//    public String getDescription() { return "Đơn hàng gốc"; }
//}
//
//abstract class OrderDecorator implements OrderComponent {
//    protected OrderComponent decoratedOrder;
//    public OrderDecorator(OrderComponent order) { this.decoratedOrder = order; }
//}
//
//class GiftWrap extends OrderDecorator {
//    public GiftWrap(OrderComponent order) { super(order); }
//    public double getCost() { return decoratedOrder.getCost() + 10000; }
//    public String getDescription() { return decoratedOrder.getDescription() + " + Gói quà"; }
//}
//
//// --- LỚP ĐƠN HÀNG TỔNG HỢP ---
//class Order {
//    private OrderState state = new NewOrder();
//    public void setState(OrderState state) { this.state = state; }
//    public void applyState() { state.printStatus(); }
//}

//Pattern	Khi nào dùng trong các bài toán trên?
//State	Khi thực thể có quy trình (Workflow) như Đơn hàng: Chờ -> Giao -> Nhận.
//Strategy	Khi có nhiều cách làm cùng một việc (Tính thuế, Giao hàng, Thanh toán).
//Decorator	Khi cần "gói" thêm các thuộc tính nhỏ (Gói quà, Phí dịch vụ, Giảm giá) vào đối tượng gốc.