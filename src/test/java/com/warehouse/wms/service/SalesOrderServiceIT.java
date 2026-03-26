package com.warehouse.wms.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@Disabled("Scaffolding test: enable after test fixtures are prepared")
class SalesOrderServiceIT {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("wms_test")
            .withUsername("test")
            .withPassword("test");

    @Test
    void createOrder_shouldReserveStockAndCreatePickTasks() {
    }
}
