package com.warehouse.wms.service;

import com.warehouse.wms.dto.PutawayTaskResponse;
import com.warehouse.wms.entity.Bin;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.PutawayTask;
import com.warehouse.wms.entity.SkuDimension;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PutawayTaskRepository;
import com.warehouse.wms.repository.SkuDimensionRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PutawayEngineService {

    private static final String OVERFLOW_BIN = "OVERFLOW";

    private final InventoryRepository inventoryRepository;
    private final SkuDimensionRepository skuDimensionRepository;
    private final BinRepository binRepository;
    private final PutawayTaskRepository putawayTaskRepository;

    @Transactional
    public List<PutawayTaskResponse> generatePutawayTasks(Long grnId) {
        List<Inventory> receivedItems = inventoryRepository
                .findByStateAndGoodsReceiptLineGoodsReceiptId(Inventory.InventoryState.RECEIVED, grnId);

        List<PutawayTaskResponse> responses = new ArrayList<>();
        Bin overflow = ensureOverflowBin();

        for (Inventory inventory : receivedItems) {
            // Skip if a PENDING task already exists for this inventory item
            if (putawayTaskRepository.existsByInventoryIdAndStatus(inventory.getId(), PutawayTask.PutawayTaskStatus.PENDING)) {
                continue;
            }

            SkuDimension dimension = skuDimensionRepository.findBySkuId(inventory.getSku().getId()).orElse(null);

            Bin suggested;
            if (dimension == null) {
                suggested = overflow;
            } else {
                BigDecimal itemVolume = dimension.getLengthCm().multiply(dimension.getWidthCm()).multiply(dimension.getHeightCm());
                BigDecimal itemWeight = dimension.getWeightG();
                suggested = binRepository.findBinsWithCapacity(itemVolume, itemWeight).stream()
                        .findFirst()
                        .orElse(overflow);
            }

            PutawayTask task = new PutawayTask();
            task.setInventory(inventory);
            task.setSuggestedBin(suggested);
            task.setPriority(1);
            task.setStatus(PutawayTask.PutawayTaskStatus.PENDING);
            if (suggested.getRack() != null && suggested.getRack().getAisle() != null && suggested.getRack().getAisle().getZone() != null) {
                task.setWarehouse(suggested.getRack().getAisle().getZone().getWarehouse());
            }
            putawayTaskRepository.save(task);

            inventory.setState(Inventory.InventoryState.IN_PUTAWAY);
            inventoryRepository.save(inventory);

            var grl = inventory.getGoodsReceiptLine();
            var gr  = grl != null ? grl.getGoodsReceipt() : null;
            var po  = gr  != null ? gr.getPurchaseOrder() : null;
            responses.add(PutawayTaskResponse.builder()
                    .taskId(task.getId())
                    .inventoryId(inventory.getId())
                    .itemBarcode(inventory.getSerialNo() != null ? inventory.getSerialNo() : inventory.getBatchNo())
                    .suggestedBinBarcode(suggested.getBarcode())
                    .priority(task.getPriority())
                    .state(task.getStatus().name())
                    .skuCode(inventory.getSku().getSkuCode())
                    .skuName(inventory.getSku().getDescription())
                    .grnNo(gr  != null ? gr.getGrnNo()    : null)
                    .poNumber(po != null ? po.getPoNumber() : null)
                    .build());
        }

        return responses;
    }

    private Bin ensureOverflowBin() {
        return binRepository.findByBarcode(OVERFLOW_BIN).orElseGet(() -> {
            Bin bin = new Bin();
            bin.setBarcode(OVERFLOW_BIN);
            bin.setLengthCm(BigDecimal.valueOf(9999));
            bin.setWidthCm(BigDecimal.valueOf(9999));
            bin.setHeightCm(BigDecimal.valueOf(9999));
            bin.setMaxWeightG(BigDecimal.valueOf(999_999_999));
            bin.setOccupiedVolumeCm3(BigDecimal.ZERO);
            bin.setOccupiedWeightG(BigDecimal.ZERO);
            bin.setStatus(Bin.BinStatus.AVAILABLE);
            return binRepository.save(bin);
        });
    }
}
