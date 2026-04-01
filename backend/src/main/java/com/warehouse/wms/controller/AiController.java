package com.warehouse.wms.controller;

import com.warehouse.wms.service.AiAssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@Validated
@ConditionalOnProperty(prefix = "app.ai", name = "enabled", havingValue = "true")
public class AiController {

    private final AiAssistantService aiAssistantService;

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@Valid @RequestBody ChatRequest request) {
        String response = aiAssistantService.ask(request.prompt());
        return ResponseEntity.ok(Map.of("response", response));
    }

    public record ChatRequest(@NotBlank(message = "prompt is required") String prompt) {
    }
}
