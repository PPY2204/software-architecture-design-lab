package project_architecture.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project_architecture.entity.Order;

@Repository
public interface OrderRepository
        extends JpaRepository<Order, Long> {
}
