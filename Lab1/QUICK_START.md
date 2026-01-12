# 🚀 HƯỚNG DẪN NHANH - CHẠY HỆ THỐNG CHAT

## 📋 YÊU CẦU

Cần cài đặt và chạy các services sau:

```bash
# 1. RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management

# 2. Redis
docker run -d --name redis -p 6379:6379 redis

# 3. Node.js packages
npm install
```

## 🎯 3 CÁCH SỬ DỤNG

### 1️⃣ HTTP API (server.js)

**Đặc điểm:** REST API, xác thực JWT, lưu lịch sử

```bash
# Chạy server
node server.js

# Server chạy tại http://localhost:3000
```

**Test với curl/Postman:**

```bash
# 1. Login để lấy token
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Alice"}'

# Response: {"token": "eyJhbG..."}

# 2. Gửi tin nhắn (thay YOUR_TOKEN)
curl -X POST http://localhost:3000/send-chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Xin chào mọi người!"}'

# 3. Xem lịch sử chat
curl http://localhost:3000/chat-history
```

**Test với browser:**

- Mở: http://localhost:3000/chat-history
- Xem lịch sử chat dạng JSON

---

### 2️⃣ CHAT CONSOLE - Queue Model (chat.js)

**Đặc điểm:** Mỗi tin chỉ 1 người nhận (Round-robin)

```bash
# Terminal 1
node chat.js Alice

# Terminal 2
node chat.js Bob

# Terminal 3
node chat.js Charlie
```

**⚠️ Lưu ý:**

- Nếu Alice gửi tin, chỉ Bob HOẶC Charlie nhận (không phải cả 2)
- Phân phối theo Round-robin
- Không phù hợp cho chat nhóm

**Khi nào dùng:** Load balancing, task queue

---

### 3️⃣ CHAT REAL-TIME - Exchange Fanout (chat-realtime.js)

**Đặc điểm:** TẤT CẢ người trong room đều nhận tin

```bash
# Terminal 1
node chat-realtime.js Alice

# Terminal 2
node chat-realtime.js Bob

# Terminal 3
node chat-realtime.js Charlie
```

** Kết quả:**

- Alice gửi tin → Bob và Charlie ĐỀU nhận được
- Giống chat group thật sự
- Mỗi người có Queue riêng

**Khi nào dùng:** Group chat, broadcasting, live notification

---

## 📊 KIỂM TRA RABBITMQ

Mở RabbitMQ Management UI:

```
URL: http://localhost:15672
Username: guest
Password: guest
```

**Xem:**

- **Queues tab**: Các queue đang hoạt động, số message
- **Exchanges tab**: Exchange `chat_logs` (Fanout)
- **Connections tab**: Các clients đang connect

---

## 🔍 KIỂM TRA REDIS

```bash
# Kết nối Redis CLI
docker exec -it redis redis-cli

# Xem lịch sử chat
LRANGE chat_history 0 -1

# Xem 5 tin mới nhất
LRANGE chat_history 0 4

# Đếm số tin nhắn
LLEN chat_history

# Xóa lịch sử
DEL chat_history
```

---

## 🎭 DEMO SCENARIOS

### Scenario 1: Test API với Consumer

```bash
# Terminal 1: Chạy server (có Consumer)
node server.js

# Terminal 2: Gửi tin qua API
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{"username":"Alice"}'
# Copy token từ response

curl -X POST http://localhost:3000/send-chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'

# Terminal 3: Xem lịch sử
curl http://localhost:3000/chat-history
```

### Scenario 2: So sánh Queue vs Exchange

```bash
# Test 1: Queue Model (chat.js)
# Terminal 1-3: Mở 3 chat.js
# Alice gửi tin → chỉ 1 người nhận (Round-robin)

# Test 2: Exchange Model (chat-realtime.js)
# Terminal 1-3: Mở 3 chat-realtime.js
# Alice gửi tin → TẤT CẢ đều nhận
```

### Scenario 3: Mix API + Real-time Chat

```bash
# Terminal 1: Server API
node server.js

# Terminal 2-3: Real-time chat
node chat-realtime.js Alice
node chat-realtime.js Bob

# Terminal 4: Gửi tin qua API
curl -X POST http://localhost:3000/send-chat ...

# Kết quả:
# - Alice và Bob nhận tin real-time (nếu dùng chat-realtime.js)
# - Tin được lưu vào Redis
# - Có thể xem lại qua /chat-history
```

---

## 🐛 TROUBLESHOOTING

### Lỗi: ECONNREFUSED RabbitMQ

```bash
# Kiểm tra RabbitMQ đang chạy
docker ps | grep rabbitmq

# Nếu không chạy, khởi động lại
docker start rabbitmq
```

### Lỗi: Redis connection refused

```bash
# Kiểm tra Redis
docker ps | grep redis

# Khởi động Redis
docker start redis
```

### Lỗi: Token expired

```bash
# Login lại để lấy token mới
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{"username":"Alice"}'
```

### Không nhận được tin trong chat.js

```bash
# Nguyên nhân: Nhiều consumers cùng lắng nghe 1 Queue
# Giải pháp: Dùng chat-realtime.js thay vì chat.js
```

---

## 📈 FLOW DIAGRAMS

### Flow 1: HTTP API

```
User → Login → Get Token → Send Message → API pushes to Queue
                                               ↓
                                          Consumer nhận
                                               ↓
                                          Lưu vào Redis
                                               ↓
                                          User get history
```

### Flow 2: Real-time Chat

```
User A join → Tạo Queue A → Bind vào Exchange
User B join → Tạo Queue B → Bind vào Exchange
User C join → Tạo Queue C → Bind vào Exchange

User A gửi → Exchange → Copy đến Queue A, B, C
                            ↓
                     A, B, C đều nhận
```

---

## 🎯 NEXT STEPS

Sau khi hiểu rõ, bạn có thể:

1. **Thêm chức năng Direct Message (1-1)**

   - Dùng Direct Exchange
   - Routing key = target username

2. **Thêm Chat Rooms**

   - Dùng Topic Exchange
   - Pattern: `room.general.*`, `room.tech.*`

3. **Thêm UI Web**

   - Dùng WebSocket (socket.io)
   - Real-time UI thay vì console

4. **Scale hệ thống**
   - Nhiều server instances
   - Load balancer phía trước
   - RabbitMQ cluster

---

## 📚 FILES TRONG PROJECT

```
├── server.js           # HTTP API + Consumer (Producer-Consumer pattern)
├── chat.js            # Console chat - Queue model (1-1 messaging)
├── chat-realtime.js   # Console chat - Exchange Fanout (broadcast)
├── FLOW_EXPLAINED.md  # Giải thích chi tiết luồng hoạt động
├── QUICK_START.md     # Hướng dẫn nhanh (file này)
├── package.json       # Dependencies
└── docker-compose.yml # Docker services config
```

---

**✨ Tip:** Đọc comments trong code để hiểu rõ hơn từng bước!

**💡 Gợi ý:** Chạy cả 3 cách (API, Queue, Exchange) để thấy rõ sự khác biệt!
