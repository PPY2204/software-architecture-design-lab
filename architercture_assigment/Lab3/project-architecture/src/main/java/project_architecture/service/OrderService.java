package project_architecture.service;

import jakarta.persistence.Cacheable;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import project_architecture.dto.OrderRequest;
import project_architecture.entity.Order;
import project_architecture.repository.OrderReadRepository;
import project_architecture.repository.OrderRepository;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository writeRepo;
    private final OrderReadRepository readRepo;
    private final RabbitTemplate rabbitTemplate;

    @Cacheable(value = "orders", key = "#id")
    public Order getOrder(Long id) {
        return readRepo.findById(id)
                .orElseThrow();
    }

    public Order create(OrderRequest req) {
        Order o = new Order();
        o.setOrderCode(UUID.randomUUID().toString());
        o.setUserId(req.userId);
        o.setTotalAmount(req.totalAmount);

        Order saved = writeRepo.save(o);

        rabbitTemplate.convertAndSend(
                "order.email.queue", saved);

        return saved;
    }
}
