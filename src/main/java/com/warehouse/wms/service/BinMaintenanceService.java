package com.warehouse.wms.service;

import com.warehouse.wms.repository.BinRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class BinMaintenanceService {

    private final BinRepository binRepository;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void resetInvalidFullBins() {
        int updated = binRepository.resetInvalidFullBins();
        if (updated > 0) {
            log.info("Reset {} bins from FULL to AVAILABLE due to zero occupancy", updated);
        }
    }
}
