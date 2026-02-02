package project_architecture.config;

import com.rabbitmq.client.AMQP;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class RabbitMQConfig {

    @Bean
    public Queue orderEmailQueue() {
        return new AMQP.Queue("order.email.queue");
    }
}

