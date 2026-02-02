package project_architecture.controller;

import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import project_architecture.dto.OrderRequest;
import project_architecture.entity.Order;
import project_architecture.service.OrderService;


@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @RateLimiter(name = "orderApi")
    @PostMapping
    public Order create(@RequestBody OrderRequest req) {
        return orderService.create(req);
    }

    @GetMapping("/{id}")
    public Order get(@PathVariable Long id) {
        return orderService.getOrder(id);
    }
}

