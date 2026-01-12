# 📖 KHÁI NIỆM QUAN TRỌNG - CHAT MESSAGE QUEUE

## 🎯 CORE CONCEPTS

### 1. Message Queue (Hàng đợi tin nhắn)

**Là gì?** Kênh lưu trữ tạm thời messages giữa sender và receiver.

**Tại sao dùng?**

- **Decoupling**: Sender và Receiver không cần biết nhau
- **Asynchronous**: Không chờ đợi, xử lý không đồng bộ
- **Load Balancing**: Phân tải cho nhiều workers
- **Reliability**: Message không mất khi service crash

**Ví dụ thực tế:**

```
Đặt hàng online:
User đặt → Queue → Worker xử lý → Gửi email → Cập nhật DB
         (Ngay)           (Chậm, background)
```

---

### 2. Producer-Consumer Pattern

```
Producer                Queue                Consumer
(Người tạo)          (Hàng đợi)            (Người xử lý)
    │                   │                      │
    ├──► Tạo job ──────►│                      │
    │   Response ngay   │                      │
    │                   │◄──── Lấy job ───────┤
    │                   │                      │
    │                   │                      ├─► Xử lý
    │                   │                      │
```

**Vai trò:**

- **Producer**: Tạo message và đẩy vào Queue (API server)
- **Queue**: Lưu messages tạm thời (RabbitMQ)
- **Consumer**: Nhận và xử lý messages (Background worker)

**Lợi ích:**

- Producer không bị block bởi Consumer
- Consumer có thể chạy song song (scale)
- Retry tự động nếu Consumer fail

---

### 3. Queue vs Exchange

#### **QUEUE (Hàng đợi đơn giản)**

```
Producer ──► [Queue] ──► Consumer 1
                     ├─► Consumer 2 ❌
                     └─► Consumer 3 ❌
```

- Mỗi message chỉ đến 1 consumer (Round-robin)
- Use case: Task distribution, load balancing

#### **EXCHANGE (Bộ phân phối)**

```
Producer ──► Exchange ──┬─► Queue A ──► Consumer A
                        ├─► Queue B ──► Consumer B
                        └─► Queue C ──► Consumer C
```

- Message được copy đến nhiều queues
- Use case: Broadcasting, notification, group chat

---

### 4. Exchange Types

| Type        | Routing Rule                | Use Case                       |
| ----------- | --------------------------- | ------------------------------ |
| **Fanout**  | Gửi đến TẤT CẢ queues       | Group chat, broadcasting       |
| **Direct**  | Match exact routing key     | Direct message, targeted tasks |
| **Topic**   | Pattern matching (\*.error) | Logging system, category-based |
| **Headers** | Based on message headers    | Complex routing rules          |

**Ví dụ Fanout (chat-realtime.js):**

```javascript
// Publisher
channel.publish("chat_logs", "", message);
// → Copy đến TẤT CẢ queues bind vào 'chat_logs'
```

**Ví dụ Direct:**

```javascript
// Send to specific user
channel.publish("direct_messages", "user_alice", message);
// → Chỉ queue của Alice nhận
```

---

### 5. Queue Properties

#### **Durable (Bền vững)**

```javascript
channel.assertQueue("tasks", { durable: true });
```

- Queue tồn tại sau khi RabbitMQ restart
- Messages không mất khi server crash

#### **Exclusive (Độc quyền)**

```javascript
channel.assertQueue("", { exclusive: true });
```

- Chỉ connection tạo ra mới dùng được
- Tự động xóa khi connection đóng
- Dùng cho real-time chat (mỗi user 1 queue)

#### **Auto-delete (Tự xóa)**

```javascript
channel.assertQueue("temp", { autoDelete: true });
```

- Xóa khi không còn consumer nào

---

### 6. Acknowledge Modes (Xác nhận)

#### **Manual ACK**

```javascript
channel.consume(queue, (msg) => {
  try {
    processMessage(msg);
    channel.ack(msg); // Xác nhận thành công
  } catch (err) {
    channel.nack(msg, false, true); // Retry
  }
});
```

- Consumer phải gọi `ack()` sau khi xử lý
- Message chỉ bị xóa khi ack
- An toàn: Message không mất nếu consumer crash

#### **Auto ACK**

```javascript
channel.consume(
  queue,
  (msg) => {
    processMessage(msg);
  },
  { noAck: true }
); // Tự động ack
```

- RabbitMQ xóa message ngay khi gửi
- Nhanh nhưng riskier

---

### 7. Binding (Ràng buộc)

**Là gì?** Kết nối giữa Exchange và Queue với routing rules.

```javascript
// Bind queue vào exchange
channel.bindQueue(
  queueName, // Queue muốn nhận message
  exchangeName, // Exchange nguồn
  routingKey // Điều kiện ('' = nhận tất cả với Fanout)
);
```

**Ví dụ:**

```javascript
// Queue của Alice bind vào chat room
channel.bindQueue("alice_queue", "chat_logs", "");

// Bây giờ mọi message vào 'chat_logs' đều copy sang 'alice_queue'
```

---

### 8. JWT (JSON Web Token)

**Là gì?** Chuỗi mã hóa chứa thông tin user, dùng cho authentication.

**Cấu trúc:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiQWxpY2UiLCJleHAiOjE2MH0.signature
│                                      │                              │
└─────── Header ──────────────────────┴──────── Payload ────────────┴─ Signature
```

**Flow:**

```javascript
// 1. Tạo token khi login
const token = jwt.sign(
    { user: 'Alice' },      // Payload
    'SECRET_KEY',           // Secret để sign
    { expiresIn: '1h' }     // Hết hạn sau 1h
)

// 2. Gửi trong header
Authorization: Bearer eyJhbGc...

// 3. Verify khi nhận request
const decoded = jwt.verify(token, 'SECRET_KEY')
```

**Lợi ích:**

- Stateless: Không cần lưu session server-side
- Scalable: Dễ scale horizontal
- Secure: Chỉ server biết SECRET_KEY mới verify được

---

### 9. Redis Data Structures

#### **List (Danh sách)**

```bash
# Thêm vào đầu list
LPUSH chat_history '{"from":"Alice","msg":"Hi"}'

# Lấy phần tử từ index 0-19 (20 phần tử)
LRANGE chat_history 0 19

# Đếm số phần tử
LLEN chat_history

# Xóa list
DEL chat_history
```

**Tại sao dùng List?**

- Thứ tự: Tin mới nhất ở đầu (index 0)
- Nhanh: O(1) cho LPUSH, O(N) cho LRANGE
- Phù hợp: Timeline, chat history, activity log

---

### 10. AMQP Protocol

**Là gì?** Advanced Message Queuing Protocol - Giao thức cho message queue.

**Các thành phần:**

```
Connection          Channel          Exchange/Queue
    │                  │                   │
    │ (TCP)            │ (Virtual)         │ (Logical)
    │                  │                   │
    └─────►────────────┴──────►────────────┘

1 Connection có nhiều Channels (như HTTP/2 multiplexing)
```

**Tại sao dùng Channel?**

- Tái sử dụng TCP connection
- Lightweight hơn tạo connection mới
- Mỗi thread có thể có 1 channel riêng

---

## 🎓 PATTERN MATCHING

### Pattern 1: Task Queue

```
Problem: Xử lý nhiều tasks nặng (resize ảnh, gửi email)
Solution: Queue + Multiple Workers

Producer ──► [Queue] ──┬─► Worker 1 (xử lý task #1)
                       ├─► Worker 2 (xử lý task #2)
                       └─► Worker 3 (xử lý task #3)
```

### Pattern 2: Pub/Sub (Publish-Subscribe)

```
Problem: Gửi notification cho nhiều users
Solution: Exchange Fanout + Exclusive Queues

Publisher ──► Exchange ──┬─► Queue A ──► User A
                         ├─► Queue B ──► User B
                         └─► Queue C ──► User C
```

### Pattern 3: Routing

```
Problem: Gửi log theo level (info, warning, error)
Solution: Direct Exchange + Routing Keys

Logger ──► Exchange ──┬─[info]──► Info Log Handler
                      ├─[warn]──► Warning Handler
                      └─[error]─► Error Handler
```

### Pattern 4: Topics

```
Problem: Phân loại theo nhiều tiêu chí
Solution: Topic Exchange + Wildcards

Publisher ──► Exchange ──┬─[user.*.created]──► User Service
                         ├─[order.#]────────► Order Service
                         └─[*.*.deleted]────► Audit Service
```

---

## 🔐 SECURITY BEST PRACTICES

### 1. JWT Token

```javascript
// ❌ BAD: Không set expiration
jwt.sign({ user: "Alice" }, SECRET);

//   GOOD: Có expiration
jwt.sign({ user: "Alice" }, SECRET, { expiresIn: "1h" });
```

### 2. RabbitMQ

```javascript
// ❌ BAD: Dùng guest user trong production
const conn = amqp.connect("amqp://guest:guest@localhost");

//   GOOD: Tạo user riêng với quyền hạn chế
const conn = amqp.connect("amqp://chat_user:password@localhost");
```

### 3. Redis

```bash
#   GOOD: Set password
redis-cli CONFIG SET requirepass "your_password"

#   GOOD: Disable dangerous commands
redis-cli CONFIG SET rename-command FLUSHDB ""
```

---

## 📊 PERFORMANCE TIPS

### 1. Connection Pooling

```javascript
// ❌ BAD: Tạo connection mỗi request
app.post("/send", async (req, res) => {
  const conn = await amqp.connect(RABBITMQ_URL); // Slow!
  // ...
});

//   GOOD: Reuse connection
const conn = await amqp.connect(RABBITMQ_URL); // Once
app.post("/send", async (req, res) => {
  const channel = await conn.createChannel(); // Fast!
  // ...
});
```

### 2. Batch Operations

```javascript
// ❌ BAD: Từng message một
for (const msg of messages) {
  await redisClient.lPush("history", msg); // Nhiều round-trips
}

//   GOOD: Batch với pipeline
const pipeline = redisClient.pipeline();
for (const msg of messages) {
  pipeline.lPush("history", msg);
}
await pipeline.exec(); // 1 round-trip
```

### 3. Prefetch Count

```javascript
// Giới hạn số messages consumer nhận cùng lúc
channel.prefetch(10); // Nhận tối đa 10 messages chưa ack
```

---

## 🐛 COMMON ERRORS

### 1. Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

**Giải pháp:** RabbitMQ chưa chạy

```bash
docker start rabbitmq
```

### 2. Channel Closed

```
Error: Channel closed
```

**Nguyên nhân:** Lỗi trong message handler  
**Giải pháp:** Dùng try-catch và nack message

### 3. Token Expired

```
Error: jwt expired
```

**Giải pháp:** Login lại để lấy token mới

---

## 📚 QUICK REFERENCE

### RabbitMQ Commands

```javascript
// Queue
channel.assertQueue(name, { durable, exclusive, autoDelete });
channel.sendToQueue(queue, Buffer.from(message));
channel.consume(queue, callback, { noAck });
channel.ack(message);
channel.nack(message, allUpTo, requeue);

// Exchange
channel.assertExchange(name, type, { durable });
channel.publish(exchange, routingKey, Buffer.from(message));
channel.bindQueue(queue, exchange, routingKey);
```

### Redis Commands

```javascript
// List
await client.lPush(key, value);
await client.lRange(key, start, stop);
await client.lLen(key);

// String
await client.set(key, value);
await client.get(key);

// Hash
await client.hSet(key, field, value);
await client.hGet(key, field);
```

### JWT Commands

```javascript
// Sign
jwt.sign(payload, secret, options);

// Verify
jwt.verify(token, secret);

// Decode (không verify)
jwt.decode(token);
```

---

## 🎯 CHEAT SHEET

```
┌────────────────┬─────────────────┬───────────────────┐
│   Use Case     │   Pattern       │   Technology      │
├────────────────┼─────────────────┼───────────────────┤
│ Task Queue     │ Basic Queue     │ RabbitMQ Queue    │
│ Group Chat     │ Pub/Sub         │ Exchange Fanout   │
│ Direct Message │ Point-to-Point  │ Exchange Direct   │
│ Logging        │ Routing         │ Exchange Topic    │
│ Cache          │ Key-Value       │ Redis String/Hash │
│ Timeline       │ Ordered List    │ Redis List        │
│ Auth           │ Stateless Token │ JWT               │
└────────────────┴─────────────────┴───────────────────┘
```

---

**💡 TIP:** Bookmark page này để tra cứu nhanh!

**📖 ĐỌC THÊM:**

- [FLOW_EXPLAINED.md](FLOW_EXPLAINED.md) - Luồng hoạt động chi tiết
- [VISUAL_DIAGRAMS.md](VISUAL_DIAGRAMS.md) - Sơ đồ minh họa
- [QUICK_START.md](QUICK_START.md) - Hướng dẫn chạy nhanh
