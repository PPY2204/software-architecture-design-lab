package project_architecture.repository;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import project_architecture.entity.Order;

@Repository
public interface OrderReadRepository
        extends JpaRepository<Order, Long> {
}

