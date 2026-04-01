package com.warehouse.wms.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(prefix = "app.ai", name = "enabled", havingValue = "true")
public class AiAssistantService {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;

    public AiAssistantService(ObjectProvider<ChatClient.Builder> chatClientBuilderProvider) {
        this.chatClientBuilderProvider = chatClientBuilderProvider;
    }

    public String ask(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            throw new IllegalArgumentException("Prompt is required");
        }

        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();
        if (builder == null) {
            throw new IllegalStateException("Spring AI is not configured. Start Ollama and set SPRING_AI_OLLAMA_BASE_URL and SPRING_AI_OLLAMA_MODEL.");
        }

        return builder
                .build()
                .prompt()
                .user(prompt)
                .call()
                .content();
    }
}
