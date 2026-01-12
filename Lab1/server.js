// ============================================
// SERVER CHAT VỚI KIẾN TRÚC MESSAGE QUEUE
// ============================================
// Kiến trúc:
// 1. Express API Server: Xử lý HTTP requests (login, send message, get history)
// 2. RabbitMQ: Message Broker - Nhận và phân phối tin nhắn bất đồng bộ
// 3. Redis: Database in-memory - Lưu trữ lịch sử chat nhanh
// 4. JWT: Xác thực người dùng

const express = require('express');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');      // RabbitMQ client
const redis = require('redis');       // Redis client

const app = express();
app.use(express.json());  // Parse JSON body từ requests

// Cấu hình
const SECRET_KEY = "IUH_SECRET_KEY";        // Key để mã hóa JWT
const RABBITMQ_URL = 'amqp://localhost';    // Địa chỉ RabbitMQ
const QUEUE_NAME = 'chat_queue';            // Tên hàng đợi tin nhắn

// ============================================
// BƯỚC 1: KẾT NỐI REDIS
// ============================================
// Redis dùng để lưu trữ lịch sử chat
// Lý do dùng Redis:
// - Truy xuất cực nhanh (in-memory database)
// - Hỗ trợ cấu trúc List (lPush, lRange)
// - Phù hợp cho real-time chat history

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.on('error',);
async function connectRedis() {
    await redisClient.connect();
}
// ============================================
// BƯỚC 2: CONSUMER - NHẬN TIN NHẮN TỪ RABBITMQ
// ============================================
// LUỒNG HOẠT ĐỘNG:
// 1. User gửi tin nhắn qua API /send-chat
// 2. API đẩy tin nhắn vào RabbitMQ Queue
// 3. Consumer này liên tục lắng nghe Queue
// 4. Khi có tin nhắn mới, Consumer nhận và lưu vào Redis
// 
// LỢI ÍCH:
// - Xử lý bất đồng bộ: Không block API response
// - Tách biệt: Producer (API) và Consumer (Lưu DB) độc lập
// - Scale được: Có thể chạy nhiều Consumer song song

async function startConsumer() {

    
    // Kết nối đến RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // Tạo/kiểm tra Queue tồn tại (durable: false = Queue bị xóa khi restart)
    await channel.assertQueue(QUEUE_NAME, { durable: false });


    // Lắng nghe tin nhắn từ Queue
    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            // Parse dữ liệu từ Buffer sang Object
            const data = JSON.parse(msg.content.toString());
        
            
            // Lưu tin nhắn vào Redis List (lPush = thêm vào đầu danh sách)
            // Key: 'chat_history', Value: JSON string của message
            await redisClient.lPush('chat_history', JSON.stringify({
                from: data.from,
                content: data.content,
                time: new Date().toLocaleTimeString()
            }));

        
            
            // Xác nhận đã xử lý xong (RabbitMQ sẽ xóa message khỏi Queue)
            channel.ack(msg);
        }
    });
}

// ============================================
// BƯỚC 3: API LẤY LỊCH SỬ CHAT
// ============================================
// LUỒNG HOẠT ĐỘNG:
// 1. Client gọi GET /chat-history
// 2. Server lấy 20 tin nhắn mới nhất từ Redis
// 3. Trả về danh sách tin nhắn dạng JSON
//
// LÝ DO DÙNG REDIS:
// - Nhanh: Lấy 20 tin từ millions messages chỉ mất vài ms
// - List structure: lRange(0, 19) lấy index 0-19 (20 items đầu)

app.get('/chat-history', async (req, res) => {

    
    // lRange(key, start, stop): Lấy tin nhắn từ index 0 đến 19
    // Vì dùng lPush, tin mới nhất ở index 0
    const history = await redisClient.lRange('chat_history', 0, 19);
    
    // Parse từng JSON string thành Object
    const parsedHistory = history.map(item => JSON.parse(item));
    

    res.json(parsedHistory);
});

// ============================================
// BƯỚC 4: API LOGIN - TẠO JWT TOKEN
// ============================================
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi POST /login với body: { "username": "Alice" }
// 2. Server tạo JWT token chứa username, có hiệu lực 1 giờ
// 3. Trả token về cho client
// 4. Client lưu token và gửi kèm mọi request sau
//
// JWT (JSON Web Token):
// - Không cần lưu session trên server
// - Token chứa thông tin user (đã mã hóa)
// - Verify token = kiểm tra chữ ký với SECRET_KEY

app.post('/login', (req, res) => {
    const { username } = req.body;

    
    // Tạo JWT token với payload { user: username }
    // expiresIn: Token hết hạn sau 1 giờ
    const token = jwt.sign({ user: username }, SECRET_KEY, { expiresIn: '1h' });
    
    res.json({ token });
});

// ============================================
// BƯỚC 5: API GỬI TIN NHẮN - PRODUCER
// ============================================
// LUỒNG HOẠT ĐỘNG:
// 1. Client gửi POST /send-chat với:
//    - Header: Authorization: Bearer <token>
//    - Body: { "message": "Hello" }
// 2. Server verify JWT token
// 3. Đẩy tin nhắn vào RabbitMQ Queue
// 4. Consumer (startConsumer) sẽ nhận và lưu vào Redis
// 5. Response ngay cho client (không chờ lưu DB)
//
// KIẾN TRÚC PRODUCER-CONSUMER:
// - API này là PRODUCER: Tạo message và đẩy vào Queue
// - startConsumer() là CONSUMER: Nhận message từ Queue
// - Lợi ích: API response nhanh, xử lý DB bất đồng bộ

app.post('/send-chat', async (req, res) => {
    // Lấy token từ header "Authorization: Bearer <token>"
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "⚠️ Thiếu Token!" });

    try {
        // Verify token và lấy thông tin user
        const decoded = jwt.verify(token, SECRET_KEY);
    
        
        // Kết nối RabbitMQ và tạo channel
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: false });

        // Tạo payload chứa thông tin tin nhắn
        const payload = JSON.stringify({ 
            from: decoded.user, 
            content: req.body.message 
        });
        
        // Đẩy message vào Queue (Producer)
        channel.sendToQueue(QUEUE_NAME, Buffer.from(payload));

        // Response ngay cho client (không chờ Consumer lưu DB)
        res.json({ status: "Gửi thành công!" });
        
        // Đóng connection sau 500ms (đợi message gửi xong)
        setTimeout(() => connection.close(), 500);
    } catch (err) { 
        res.status(403).json({ error: "Token sai!" }); 
    }
});

// ============================================
// KHỞI ĐỘNG SERVER
// ============================================
// 1. Express server lắng nghe port 3000
// 2. Consumer bắt đầu lắng nghe RabbitMQ Queue
// 3. Server sẵn sàng nhận requests

app.listen(3000, () => {
    // Khởi động Consumer để nhận và lưu tin nhắn
    startConsumer();
});