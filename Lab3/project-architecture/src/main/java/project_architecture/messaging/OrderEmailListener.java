package project_architecture.messaging;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import project_architecture.entity.Order;

@Component
public class OrderEmailListener {

    @RabbitListener(queues = "order.email.queue")
    public void handle(Order order) {
        System.out.println(
                "Send email for order " + order.getOrderCode());
    }
}
