# 📚 GIẢI THÍCH LUỒNG HOẠT ĐỘNG HỆ THỐNG CHAT

## 🏗️ TỔNG QUAN KIẾN TRÚC

Hệ thống bao gồm 3 thành phần chính:

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│   Client    │────▶│  RabbitMQ    │────▶│  Redis   │
│   (User)    │◀────│ (Message     │     │ (Storage)│
└─────────────┘     │  Broker)     │     └──────────┘
                    └──────────────┘
```

### 🔧 Công nghệ sử dụng:

- **Express**: HTTP API Server
- **RabbitMQ**: Message Queue/Broker - Quản lý và phân phối tin nhắn
- **Redis**: In-memory Database - Lưu lịch sử chat nhanh
- **JWT**: Xác thực người dùng

---

## 📋 SO SÁNH 2 KIẾN TRÚC

### 1️⃣ CHAT.JS - Queue Model (Point-to-Point)

```
User A ──┐
         ├──▶ [chat_queue] ──▶ Consumer 1   (nhận)
User B ──┘                 └──▶ Consumer 2 ❌ (không nhận)
```

**Đặc điểm:**

- Mỗi message chỉ được 1 consumer nhận
- Load balancing tự động (Round-robin)
- ❌ Không phù hợp cho chat room (không phải ai cũng nhận tin)
- 🎯 Use case: Task queue, xử lý công việc phân tán

**Cách hoạt động:**

1. User A gửi tin vào Queue `chat_queue`
2. RabbitMQ phân phối tin cho 1 consumer (ví dụ: Consumer 1)
3. Consumer 1 nhận tin và hiển thị
4. Consumer 2 KHÔNG nhận tin này

---

### 2️⃣ CHAT-REALTIME.JS - Exchange Fanout (Publish-Subscribe)

```
                    ┌──▶ Queue A ──▶ User A
User A ──▶ Exchange ├──▶ Queue B ──▶ User B
                    └──▶ Queue C ──▶ User C
```

**Đặc điểm:**

- TẤT CẢ consumers đều nhận được message
- Phù hợp cho chat room, broadcast
- Mỗi user có Queue riêng (exclusive)
- 🎯 Use case: Group chat, live notification, live streaming

**Cách hoạt động:**

1. Mỗi user tạo Queue tạm riêng khi join
2. Bind Queue của mình vào Exchange `chat_logs`
3. User A gửi tin vào Exchange (không gửi vào Queue)
4. RabbitMQ copy tin đến **TẤT CẢ** Queues đã bind
5. Tất cả users nhận tin từ Queue riêng của mình

---

## 🔄 LUỒNG HOẠT ĐỘNG CHI TIẾT

### A. SERVER.JS - HTTP API với Message Queue

#### **Bước 1: Khởi động Server**

```javascript
1. Kết nối Redis
2. Khởi động Express server (port 3000)
3. Khởi động Consumer (lắng nghe RabbitMQ)
```

#### **Bước 2: Login Flow**

```
Client                    Server
  │                         │
  ├──POST /login───────────▶│
  │  { username: "Alice" }  │
  │                         │
  │                         ├─ Tạo JWT token
  │                         │  jwt.sign({ user: "Alice" })
  │                         │
  │◀──────token─────────────┤
  │  { token: "eyJhb..." }  │
```

**Mục đích:** Xác thực user và cấp token để dùng cho các request sau

---

#### **Bước 3: Send Message Flow (Producer)**

```
Client                    Server                RabbitMQ              Redis
  │                         │                       │                   │
  ├──POST /send-chat───────▶│                       │                   │
  │  Header: Bearer token   │                       │                   │
  │  Body: { msg: "Hi" }    │                       │                   │
  │                         │                       │                   │
  │                         ├─ Verify JWT token     │                   │
  │                         │                       │                   │
  │                         ├─ sendToQueue()───────▶│                   │
  │                         │   { from: "Alice",    │                   │
  │                         │     content: "Hi" }   │                   │
  │                         │                       │                   │
  │◀─────Success────────────┤                       │                   │
  │                         │                       │                   │
  │                         │  [Consumer đang chạy] │                   │
  │                         │◀────Nhận message──────┤                   │
  │                         │                       │                   │
  │                         ├───Lưu lịch sử────────┼──────────────────▶│
  │                         │   lPush('chat_history')                   │
```

**Tại sao dùng Queue?**

- **Non-blocking**: API response ngay, không chờ lưu DB
- **Decoupling**: Producer (API) và Consumer (DB handler) độc lập
- **Scalable**: Có thể chạy nhiều Consumers song song
- **Reliable**: Message không mất nếu Consumer crash

---

#### **Bước 4: Get History Flow**

```
Client                    Server                Redis
  │                         │                     │
  ├──GET /chat-history─────▶│                     │
  │                         │                     │
  │                         ├─ lRange(0, 19)────▶│
  │                         │                     │
  │                         │◀──20 messages───────┤
  │                         │                     │
  │◀────JSON array──────────┤
  │  [ {from, content},     │
  │    {from, content} ]    │
```

**Tại sao dùng Redis?**

- ⚡ **Nhanh**: In-memory, truy vấn < 1ms
- 📋 **List structure**: lPush/lRange phù hợp cho timeline
- 💾 **Persistent**: Có thể config để lưu vào disk

---

### B. CHAT-REALTIME.JS - Real-time Chat với Exchange

#### **Kiến trúc Exchange Fanout**

```
                      RabbitMQ
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   [Exchange:          [Binding]       [Queues]
    chat_logs]           │                │
    (Fanout)          ┌──┼──┬──┬──┐       │
        │             │  │  │  │  │       │
        └─────────────┤  │  │  │  │       │
                      ▼  ▼  ▼  ▼  ▼       │
                      Q1 Q2 Q3 Q4 Q5 ◀────┘
                      │  │  │  │  │
                      ▼  ▼  ▼  ▼  ▼
                      U1 U2 U3 U4 U5
```

#### **Luồng hoạt động chi tiết:**

**1. User Join Room:**

```javascript
// User A join
const queueA = channel.assertQueue("", { exclusive: true }); // tạo Queue ngẫu nhiên
channel.bindQueue(queueA.queue, "chat_logs", ""); // bind vào Exchange

// User B join
const queueB = channel.assertQueue("", { exclusive: true });
channel.bindQueue(queueB.queue, "chat_logs", "");

// User C join
const queueC = channel.assertQueue("", { exclusive: true });
channel.bindQueue(queueC.queue, "chat_logs", "");
```

**2. User A gửi tin:**

```javascript
// User A publish
channel.publish(
  "chat_logs",
  "",
  Buffer.from(
    JSON.stringify({
      from: "Alice",
      content: "Hello everyone!",
    })
  )
);

// RabbitMQ tự động copy đến:
// ├─ queueA ──▶ User A nhận
// ├─ queueB ──▶ User B nhận
// └─ queueC ──▶ User C nhận
```

**3. Tất cả users nhận tin:**

```javascript
// User A, B, C đều chạy:
channel.consume(theirQueue, (msg) => {
  const data = JSON.parse(msg.content.toString());
});

// Kết quả:
// User A (không hiển thị tin của mình)
// User B: "Alice: Hello everyone!"
// User C: "Alice: Hello everyone!"
```

---

## 🔑 KHÁI NIỆM QUAN TRỌNG

### 1. Queue vs Exchange

| Khía cạnh | Queue                         | Exchange                                 |
| --------- | ----------------------------- | ---------------------------------------- |
| Gửi tin   | `sendToQueue(queueName, msg)` | `publish(exchangeName, routingKey, msg)` |
| Phân phối | 1 message → 1 consumer        | 1 message → nhiều queues                 |
| Use case  | Task distribution             | Broadcasting                             |
| Ví dụ     | Xử lý đơn hàng                | Notification system                      |

### 2. Exchange Types

```
┌─────────────┬──────────────────────────────────────┐
│ Type        │ Routing Rule                         │
├─────────────┼──────────────────────────────────────┤
│ Fanout      │ Copy đến TẤT CẢ queues              │
│ Direct      │ Routing key phải khớp chính xác      │
│ Topic       │ Pattern matching (*.error, user.#)   │
│ Headers     │ Dựa vào message headers              │
└─────────────┴──────────────────────────────────────┘
```

### 3. Durable vs Exclusive Queue

```javascript
// Durable: Queue tồn tại sau khi RabbitMQ restart
channel.assertQueue("persistent_queue", { durable: true });

// Exclusive: Queue bị xóa khi connection đóng
channel.assertQueue("", { exclusive: true });
```

### 4. Acknowledge Modes

```javascript
// Manual ACK: Phải gọi ack() sau khi xử lý xong
channel.consume(queue, (msg) => {
  processMessage(msg);
  channel.ack(msg); // Xác nhận đã xử lý
});

// Auto ACK: Tự động xác nhận ngay khi nhận
channel.consume(
  queue,
  (msg) => {
    processMessage(msg);
  },
  { noAck: true }
); // RabbitMQ xóa message ngay
```

---

## 🎯 USE CASES THỰC TẾ

### Nên dùng QUEUE khi:

- Xử lý công việc nặng (resize ảnh, gửi email)
- Load balancing giữa nhiều workers
- Đảm bảo mỗi task chỉ xử lý 1 lần
- Ví dụ: Order processing, background jobs

### Nên dùng EXCHANGE FANOUT khi:

- Chat room, group chat
- Live notification (nhiều users cùng nhận)
- Broadcasting system
- Ví dụ: Facebook Live comments, Slack channels

### Nên dùng REDIS khi:

- Cần truy vấn cực nhanh (< 1ms)
- Cache data thường xuyên truy cập
- Lưu session, real-time leaderboard
- Ví dụ: Chat history, user online status

---

## 🧪 CÁCH TEST HỆ THỐNG

### Test 1: Server API

```bash
# Terminal 1: Khởi động server
node server.js

# Terminal 2: Test API
# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Alice"}'

# Response: {"token": "eyJhbGc..."}

# Gửi tin (thay YOUR_TOKEN bằng token nhận được)
curl -X POST http://localhost:3000/send-chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from API"}'

# Lấy lịch sử
curl http://localhost:3000/chat-history
```

### Test 2: Chat (Queue Model)

```bash
# Terminal 1
node chat.js Alice

# Terminal 2
node chat.js Bob

# Kết quả: Chỉ 1 người nhận tin (Round-robin)
```

### Test 3: Chat Real-time (Exchange Fanout)

```bash
# Terminal 1
node chat-realtime.js Alice

# Terminal 2
node chat-realtime.js Bob

# Terminal 3
node chat-realtime.js Charlie

# Kết quả: TẤT CẢ đều nhận tin của nhau
```

---

## 📊 GIÁM SÁT RABBITMQ

### Truy cập RabbitMQ Management UI:

```
URL: http://localhost:15672
Username: guest
Password: guest
```

### Xem thông tin:

- **Queues**: Số message đang chờ, consumers đang active
- **Exchanges**: Các exchange đang hoạt động, binding rules
- **Connections**: Các kết nối hiện tại từ applications

---

## 🚀 MỞ RỘNG HỆ THỐNG

### Thêm tính năng Direct Message (1-1 chat)

```javascript
// Dùng Direct Exchange với routing key = username
channel.assertExchange("direct_messages", "direct");
channel.bindQueue(myQueue, "direct_messages", myUsername);

// Gửi tin riêng cho Bob
channel.publish("direct_messages", "Bob", message);
```

### Thêm Chat Rooms

```javascript
// Dùng Topic Exchange với pattern matching
channel.assertExchange("chat_rooms", "topic");
channel.bindQueue(myQueue, "chat_rooms", "room.general.*");

// Gửi vào room "general"
channel.publish("chat_rooms", "room.general.message", message);
```

### Scale Horizontal

```
                      Load Balancer
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    Server 1            Server 2            Server 3
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                        RabbitMQ
                            │
                          Redis
```

---

## 🎓 SUMMARY

### Key Takeaways:

1. **Queue Model**: 1 message → 1 consumer (load balancing)
2. **Exchange Fanout**: 1 message → tất cả consumers (broadcasting)
3. **Producer-Consumer**: Tách biệt gửi và xử lý message
4. **Redis**: Lưu lịch sử nhanh, query dễ dàng
5. **JWT**: Xác thực stateless, không cần session server-side

### Khi nào dùng gì?

- **Chat 1-1**: Direct Exchange + routing key = userID
- **Group Chat**: Fanout Exchange + exclusive queues
- **Task Queue**: Basic Queue + multiple workers
- **Notification**: Topic Exchange + pattern matching

---

## 📚 TÀI LIỆU THAM KHẢO

- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Redis Commands](https://redis.io/commands)
- [JWT Best Practices](https://jwt.io/introduction)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

**🎉 Chúc bạn học tốt và xây dựng được hệ thống chat tuyệt vời!**
