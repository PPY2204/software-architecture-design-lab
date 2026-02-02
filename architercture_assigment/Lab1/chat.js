// ============================================
// CHAT VỚI KIẾN TRÚC QUEUE BASIC
// ============================================
// KIẾN TRÚC NÀY KHÁC VỚI chat-realtime.js:
//
// chat.js (Queue Model - Point-to-Point):
// - Gửi message trực tiếp vào Queue
// - Mỗi message chỉ được 1 consumer nhận (Round-robin)
// - Phù hợp: Task queue, xử lý công việc phân tán
// - VẤN ĐỀ: Nhiều user cùng consume 1 Queue → không phải ai cũng nhận
//
// chat-realtime.js (Exchange Fanout - Publish-Subscribe):
// - Gửi message vào Exchange
// - TẤT CẢ consumers đều nhận được message
// - Phù hợp: Chat room, broadcast, notification
//
// LUỒNG HOẠT ĐỘNG:
// 1. User gửi message vào Queue 'chat_queue'
// 2. Các consumers lắng nghe Queue này
// 3. RabbitMQ phân phối message cho 1 consumer (Round-robin)
// 4. Consumer nhận message và hiển thị
// 5. Lưu vào Redis để giữ lịch sử

const amqp = require('amqplib');
const redis = require('redis');
const readline = require('readline');  // Đọc input từ bàn phím

// Cấu hình
const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'chat_queue';        // Queue dùng chung cho tất cả users
const REDIS_URL = 'redis://localhost:6379';

// Nhập tên người dùng để phân biệt khi chat
// Dùng: node chat.js Alice hoặc để random
const username = process.argv[2] || "User_" + Math.floor(Math.random() * 1000);

// Readline: Interface để nhận input từ console
const rl = readline.createInterface({
    input: process.stdin,   // Đọc từ bàn phím
    output: process.stdout, // Xuất ra màn hình
    prompt: `${username}> ` // Hiển thị: "Alice> "
});

// ============================================
// HÀM CHÍNH: KHỞI ĐỘNG CHAT
// ============================================
async function startChat() {
    // -------------------- BƯỚC 1: KẾT NỐI REDIS --------------------
    // Lưu lịch sử chat để có thể xem lại sau
    const redisClient = redis.createClient({ url: REDIS_URL });
    await redisClient.connect();

    // -------------------- BƯỚC 2: KẾT NỐI RABBITMQ --------------------
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // -------------------- BƯỚC 3: TẠO/KIỂM TRA QUEUE --------------------
    // assertQueue: Tạo queue nếu chưa tồn tại, không làm gì nếu đã có
    // durable: false = Queue bị xóa khi RabbitMQ restart
    await channel.assertQueue(QUEUE_NAME, { durable: false });
    

    
    
    
    
    
    rl.prompt();

    // ============================================
    // LUỒNG 1: CONSUMER - NHẬN TIN NHẮN TỪ QUEUE
    // ============================================
    // Lắng nghe Queue và nhận messages
    // VẤN ĐỀ: Nếu có nhiều consumers, RabbitMQ phân phối Round-robin
    // → Không phải ai cũng nhận được tất cả tin
    
    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const data = JSON.parse(msg.content.toString());
            
            // Chỉ hiển thị nếu tin nhắn không phải của chính mình gửi
            if (data.from !== username) {
                // \r = Xóa dòng prompt hiện tại, hiển thị tin, rồi hiển prompt lại
                process.stdout.write(`\r💬 [${data.time}] ${data.from}: ${data.content}\n`);
                rl.prompt();
            }
            
            // Xác nhận đã nhận message (RabbitMQ sẽ xóa message khỏi Queue)
            channel.ack(msg);
        }
    });

    // ============================================
    // LUỒNG 2: PRODUCER - GỬI TIN NHẮN VÀO QUEUE
    // ============================================
    // Khi user gõ tin và nhấn Enter
    
    rl.on('line', async (line) => {
        const message = line.trim();
        if (message) {
            // Tạo payload chứa thông tin tin nhắn
            const payload = {
                from: username,
                content: message,
                time: new Date().toLocaleTimeString()
            };

            // -------------------- GỬI VÀO QUEUE --------------------
            // sendToQueue: Gửi message trực tiếp vào Queue
            // Buffer.from: Chuyển JSON string thành Buffer
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)));

            // -------------------- LƯU VÀO REDIS --------------------
            // lPush: Thêm vào đầu List (tin mới nhất ở index 0)
            // Lưu lịch sử để sau này có thể query từ API
            await redisClient.lPush('chat_history', JSON.stringify(payload));
        }
        rl.prompt();
    });
}

startChat().catch(console.error);