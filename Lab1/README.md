# 💬 HỆ THỐNG CHAT VỚI MESSAGE QUEUE

> **Lab 1 - Software Architecture Design**  
> **Mục tiêu:** Hiểu rõ luồng hoạt động của Message Queue, Producer-Consumer pattern, và Chat Real-time với RabbitMQ, Redis, và JWT.

---

## 📚 TÀI LIỆU HỌC TẬP

Project này bao gồm **4 file tài liệu chi tiết** giúp bạn hiểu sâu về hệ thống:

### 📖 [CONCEPTS.md](CONCEPTS.md) - Khái niệm quan trọng

**Đọc đầu tiên!** Giải thích các khái niệm cơ bản:

- Message Queue vs Exchange
- Producer-Consumer Pattern
- Queue Types (Fanout, Direct, Topic)
- JWT Authentication
- Redis Data Structures
- AMQP Protocol

### 🔄 [FLOW_EXPLAINED.md](FLOW_EXPLAINED.md) - Luồng hoạt động chi tiết

**Đọc khi đã hiểu concepts!** Phân tích từng bước:

- So sánh Queue Model vs Exchange Fanout
- Luồng HTTP API với Producer-Consumer
- Luồng Chat Real-time với Broadcasting
- Use cases thực tế
- Cách scale hệ thống

### 🎨 [VISUAL_DIAGRAMS.md](VISUAL_DIAGRAMS.md) - Sơ đồ minh họa

**Đọc để visualize!** Diagrams chi tiết:

- Kiến trúc tổng quan
- Flow charts từng bước
- Timeline message journey
- So sánh Queue vs Exchange (visual)
- Debug & monitoring guides

### 🚀 [QUICK_START.md](QUICK_START.md) - Hướng dẫn chạy nhanh

**Đọc khi muốn chạy thử!** Hướng dẫn thực hành:

- Cài đặt và khởi động services
- Test từng module (API, Queue, Exchange)
- Demo scenarios
- Troubleshooting

---

## 🏗️ KIẾN TRÚC TỔNG QUAN

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│   Clients   │────▶│  RabbitMQ    │────▶│  Redis   │
│   (Users)   │◀────│ (Message     │     │ (Storage)│
│             │     │  Broker)     │     │          │
└─────────────┘     └──────────────┘     └──────────┘
```

**3 Components chính:**

1. **RabbitMQ** - Message Broker (Queue & Exchange)
2. **Redis** - In-memory Database (Chat history)
3. **Express** - HTTP API Server (JWT authentication)

---

## 🚀 CÁCH CHẠY NHANH

### Bước 1: Khởi động services

```bash
docker-compose up -d
```

### Bước 2: Cài đặt dependencies

```bash
npm install amqplib jsonwebtoken express redis
```

### Bước 3: Chạy các module

#### HTTP API Server

```bash
node server.js
# Server chạy tại http://localhost:3000
```

#### Chat Console - Queue Model

```bash
node chat.js Alice
```

#### Chat Real-time - Exchange Fanout

```bash
node chat-realtime.js Alice
```

---

## 📂 CẤU TRÚC PROJECT

```
├── server.js              # HTTP API + Consumer (Producer-Consumer)
├── chat.js                # Console chat - Queue model
├── chat-realtime.js       # Console chat - Exchange Fanout
├── auth.js                # (Optional) Authentication helpers
├── send.js                # (Optional) Message sender
├── receive.js             # (Optional) Message receiver
│
├── CONCEPTS.md            # 📖 Khái niệm quan trọng
├── FLOW_EXPLAINED.md      # 🔄 Luồng hoạt động chi tiết
├── VISUAL_DIAGRAMS.md     # 🎨 Sơ đồ minh họa
├── QUICK_START.md         # 🚀 Hướng dẫn chạy nhanh
├── README.md              # 📋 File này
│
├── package.json           # Dependencies
└── docker-compose.yml     # Docker services
```

---

## 🎯 3 CÁCH SỬ DỤNG HỆ THỐNG

### 1️⃣ **HTTP API** ([server.js](server.js))

**Kiến trúc:** Producer-Consumer với Queue

**Đặc điểm:**

- REST API với JWT authentication
- Async processing với RabbitMQ
- Lưu lịch sử vào Redis
- Consumer tự động nhận và lưu messages

**Endpoints:**

```bash
POST /login          # Đăng nhập, lấy JWT token
POST /send-chat      # Gửi tin nhắn (cần Bearer token)
GET  /chat-history   # Lấy 20 tin nhắn mới nhất
```

---

### 2️⃣ **Chat Console - Queue Model** ([chat.js](chat.js))

**Kiến trúc:** Point-to-Point Queue

**Đặc điểm:**

- ⚠️ Mỗi message chỉ 1 consumer nhận (Round-robin)
- ❌ Không phù hợp cho group chat
- Phù hợp cho task distribution

---

### 3️⃣ **Chat Real-time - Exchange Fanout** ([chat-realtime.js](chat-realtime.js))

**Kiến trúc:** Publish-Subscribe với Exchange Fanout

**Đặc điểm:**

- TẤT CẢ users đều nhận tin
- Broadcasting cho group chat
- Mỗi user có Queue riêng (exclusive)

---

## 🔑 ĐIỂM QUAN TRỌNG CẦN HIỂU

### 1. Queue vs Exchange

| Khía cạnh    | Queue              | Exchange Fanout          |
| ------------ | ------------------ | ------------------------ |
| Phân phối    | 1 msg → 1 consumer | 1 msg → tất cả consumers |
| File sử dụng | `chat.js`          | `chat-realtime.js`       |
| Use case     | Task queue         | Group chat               |

### 2. Producer-Consumer Pattern

```
Producer (API)     Consumer (Worker)
      │                   │
      ├── Push to Queue ─►│
      │   Response ngay   │
      └──   Fast         └─► Xử lý chậm (DB, email...)
```

---

## 🎓 HỌC THEO THỨ TỰ

1. **Đọc [CONCEPTS.md](CONCEPTS.md)** - Hiểu khái niệm cơ bản
2. **Đọc code** - Comments chi tiết trong các file .js
3. **Đọc [FLOW_EXPLAINED.md](FLOW_EXPLAINED.md)** - Hiểu luồng hoạt động
4. **Đọc [VISUAL_DIAGRAMS.md](VISUAL_DIAGRAMS.md)** - Visualize bằng diagrams
5. **Thực hành theo [QUICK_START.md](QUICK_START.md)** - Chạy và test

---

## 🔍 MONITORING

### RabbitMQ Management UI

```
URL: http://localhost:15672
User: guest / Pass: guest
```

### Redis CLI

```bash
docker exec -it redis redis-cli
LRANGE chat_history 0 -1
```

---

## 💡 TIPS

Đọc kỹ comments trong code  
 Chạy từng module riêng để thấy sự khác biệt  
 Xem RabbitMQ Management UI khi chạy  
 Test các scenarios trong QUICK_START.md

---

**🎉 Chúc bạn học tốt!** Bắt đầu với [CONCEPTS.md](CONCEPTS.md) hoặc [QUICK_START.md](QUICK_START.md)!
