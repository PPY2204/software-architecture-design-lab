package project_architecture.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "orders",
        indexes = {
                @Index(name = "idx_order_code", columnList = "orderCode"),
                @Index(name = "idx_user_id", columnList = "userId")
        })
public class Order {

    @Id
    @GeneratedValue
    private Long id;

    private String orderCode;
    private Long userId;
    private BigDecimal totalAmount;
}
