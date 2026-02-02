// ============================================
// CHAT REAL-TIME VỚI RABBITMQ EXCHANGE (FANOUT)
// ============================================
// KIẾN TRÚC NÀY KHÁC VỚI chat.js:
// 
// chat.js (Queue Model):
// - 1 message vào Queue, chỉ 1 consumer nhận
// - Phù hợp cho task queue, load balancing
// - Ví dụ: Gửi email, xử lý đơn hàng
//
// chat-realtime.js (Exchange Fanout):
// - 1 message gửi vào Exchange, TẤT CẢ consumers nhận
// - Phù hợp cho broadcast, real-time chat, notification
// - Ví dụ: Nhóm chat, live streaming comments
//
// LUỒNG HOẠT ĐỘNG:
// 1. Mỗi user tạo 1 Queue tạm riêng (exclusive queue)
// 2. Bind Queue của mình vào Exchange chung
// 3. Khi gửi tin: Publish vào Exchange (không gửi vào Queue)
// 4. RabbitMQ tự động copy tin đến TẤT CẢ Queues bind vào Exchange
// 5. Mỗi user nhận tin từ Queue riêng của mình

const amqp = require('amqplib');
const redis = require('redis');
const readline = require('readline');  // Đọc input từ bàn phím

const RABBITMQ_URL = 'amqp://localhost';
const EXCHANGE_NAME = 'chat_logs'; // Exchange như "Loa phóng thanh" - phát sóng cho tất cả
const REDIS_URL = 'redis://localhost:6379';

// Lấy username từ command line: node chat-realtime.js Alice
// Nếu không nhập, tạo random username: User_123
const username = process.argv[2] || "User_" + Math.floor(Math.random() * 1000);

// Readline: Interface để nhận input từ bàn phím (console)
const rl = readline.createInterface({
    input: process.stdin,   // Đọc từ bàn phím
    output: process.stdout, // Xuất ra console
    prompt: `${username}> ` // Hiển thị prompt: "Alice> "
});

// ============================================
// HÀM CHÍNH: KHỞI ĐỘNG CHAT REAL-TIME
// ============================================
async function startChat() {
    // -------------------- KẾT NỐI REDIS --------------------
    // Lưu lịch sử chat để sau này có thể xem lại
    const redisClient = redis.createClient({ url: REDIS_URL });
    await redisClient.connect();

    // -------------------- KẾT NỐI RABBITMQ --------------------
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // -------------------- TẠO EXCHANGE (FANOUT) --------------------
    // Fanout Exchange: Phát sóng message đến TẤT CẢ queues bind vào nó
    // Khác với Direct Exchange (routing key), Topic Exchange (pattern)
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: false });

    // -------------------- TẠO QUEUE TẠM THỜI --------------------
    // assertQueue('', {...}): Tên rỗng = RabbitMQ tự tạo tên random
    // exclusive: true = Queue bị xóa khi connection đóng
    // Mỗi user có 1 queue riêng, không chia sẻ với user khác
    const q = await channel.assertQueue('', { exclusive: true });
    
    // -------------------- BIND QUEUE VÀO EXCHANGE --------------------
    // Bind = "Nối dây" từ Exchange sang Queue
    // Khi Exchange nhận message, nó sẽ copy sang tất cả queues đã bind
    await channel.bindQueue(q.queue, EXCHANGE_NAME, '');

    rl.prompt();

    // ============================================
    // LUỒNG 1: NHẬN TIN NHẮN (CONSUMER)
    // ============================================
    // Lắng nghe Queue riêng của mình
    // Khi có ai gửi tin vào Exchange, RabbitMQ copy đến Queue này
    
    channel.consume(q.queue, (msg) => {
        if (msg.content) {
            const data = JSON.parse(msg.content.toString());
            
            // Không hiển thị tin của chính mình (vì sẽ hiển thị ngay khi gửi)
            if (data.from !== username) {
                // \r = Xóa dòng hiện tại (prompt), hiển thị tin, rồi hiển prompt lại
                process.stdout.write(`\[${data.time}] ${data.from}: ${data.content}\n`);
                rl.prompt(); // Hiển lại prompt "Alice> "
            }
        }
    }, { noAck: true }); // noAck: true = Không cần xác nhận (auto delete)

    // ============================================
    // LUỒNG 2: GỬI TIN NHẮN (PRODUCER)
    // ============================================
    // Khi user gõ tin và nhấn Enter
    
    rl.on('line', async (line) => {
        const message = line.trim();
        if (message) {
            // Tạo payload tin nhắn
            const payload = {
                from: username,
                content: message,
                time: new Date().toLocaleTimeString()
            };

            // -------------------- PUBLISH VÀO EXCHANGE --------------------
            // KHÁC BIỆT CHÍNH:
            // - chat.js dùng: channel.sendToQueue(QUEUE_NAME, ...)
            // - chat-realtime.js dùng: channel.publish(EXCHANGE_NAME, '', ...)
            // 
            // channel.publish(exchange, routingKey, content):
            // - exchange: Tên Exchange
            // - routingKey: '' vì Fanout không cần routing key
            // - content: Dữ liệu dạng Buffer
            channel.publish(EXCHANGE_NAME, '', Buffer.from(JSON.stringify(payload)));

            // -------------------- LƯU VÀO REDIS --------------------
            // Lưu lịch sử chat vào Redis (giống như chat.js)
            await redisClient.lPush('chat_history', JSON.stringify(payload));
        }
        rl.prompt();
    });
}

startChat().catch(console.error);