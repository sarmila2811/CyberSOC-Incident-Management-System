package com.cybersoc.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey1;

    @Value("${gemini.api-key:}")
    private String geminiApiKey2;

    @Value("${openai.api.key:}")
    private String openaiApiKey1;

    @Value("${openai.api-key:}")
    private String openaiApiKey2;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent}")
    private String geminiApiUrl;

    @Value("${openai.api.url:https://api.openai.com/v1/chat/completions}")
    private String openaiApiUrl;

    private final ObjectMapper mapper = new ObjectMapper();

    private boolean isKeyValid(String key) {
        return key != null && !key.trim().isEmpty() && !key.toLowerCase().contains("dummy") && !key.toLowerCase().contains("placeholder");
    }

    private String detectProvider() {
        // 1. Check Gemini presence in env / system properties / application properties
        if (isKeyValid(System.getenv("GEMINI_API_KEY")) ||
            isKeyValid(System.getProperty("GEMINI_API_KEY")) ||
            isKeyValid(System.getProperty("gemini.api.key")) ||
            isKeyValid(System.getProperty("gemini.api-key")) ||
            isKeyValid(geminiApiKey1) ||
            isKeyValid(geminiApiKey2)) {
            return "GEMINI";
        }

        // 2. Check OpenAI presence in env / system properties / application properties
        if (isKeyValid(System.getenv("OPENAI_API_KEY")) ||
            isKeyValid(System.getProperty("OPENAI_API_KEY")) ||
            isKeyValid(System.getProperty("openai.api.key")) ||
            isKeyValid(System.getProperty("openai.api-key")) ||
            isKeyValid(openaiApiKey1) ||
            isKeyValid(openaiApiKey2)) {
            return "OPENAI";
        }

        // Default: If nothing is set, check application.properties urls to see what's defined.
        // In our case, gemini.api.url is defined in application.properties, so default to GEMINI.
        return "GEMINI";
    }

    private String resolveGeminiKey() {
        String key = System.getenv("GEMINI_API_KEY");
        if (isKeyValid(key)) return key;

        key = System.getProperty("GEMINI_API_KEY");
        if (isKeyValid(key)) return key;

        key = System.getProperty("gemini.api.key");
        if (isKeyValid(key)) return key;

        key = System.getProperty("gemini.api-key");
        if (isKeyValid(key)) return key;

        if (isKeyValid(geminiApiKey1)) return geminiApiKey1;
        if (isKeyValid(geminiApiKey2)) return geminiApiKey2;

        return null;
    }

    private String resolveOpenaiKey() {
        String key = System.getenv("OPENAI_API_KEY");
        if (isKeyValid(key)) return key;

        key = System.getProperty("OPENAI_API_KEY");
        if (isKeyValid(key)) return key;

        key = System.getProperty("openai.api.key");
        if (isKeyValid(key)) return key;

        key = System.getProperty("openai.api-key");
        if (isKeyValid(key)) return key;

        if (isKeyValid(openaiApiKey1)) return openaiApiKey1;
        if (isKeyValid(openaiApiKey2)) return openaiApiKey2;

        return null;
    }

    @PostConstruct
    public void init() {
        String provider = detectProvider();
        System.out.println("API provider detected: " + provider);
        boolean keyLoaded = false;
        if ("GEMINI".equals(provider)) {
            keyLoaded = (resolveGeminiKey() != null);
        } else if ("OPENAI".equals(provider)) {
            keyLoaded = (resolveOpenaiKey() != null);
        }
        System.out.println("API key loaded: " + keyLoaded);
    }

    public Map<String, String> getAnalysis(String title, String category, String priority, String description, String source, String department, String assignedAnalyst, String analystNotes, String resolutionSummary) {
        String provider = detectProvider();
        
        System.out.println("API provider detected: " + provider);
        
        String resolvedKey = null;
        String apiUrl = null;
        String modelName = null;
        
        if ("GEMINI".equals(provider)) {
            resolvedKey = resolveGeminiKey();
            apiUrl = geminiApiUrl;
            modelName = "gemini-1.5-flash";
            if (apiUrl != null && apiUrl.contains("/models/")) {
                int start = apiUrl.indexOf("/models/") + "/models/".length();
                int end = apiUrl.indexOf(":", start);
                if (end > start) {
                    modelName = apiUrl.substring(start, end);
                }
            }
        } else if ("OPENAI".equals(provider)) {
            resolvedKey = resolveOpenaiKey();
            apiUrl = openaiApiUrl;
            modelName = "gpt-4o";
        }
        
        System.out.println("=== API KEY DIAGNOSTICS ===");
        System.out.println("Spring @Value gemini.api.key: '" + geminiApiKey1 + "'");
        System.out.println("Spring @Value gemini.api-key: '" + geminiApiKey2 + "'");
        System.out.println("Spring @Value openai.api.key: '" + openaiApiKey1 + "'");
        System.out.println("Spring @Value openai.api-key: '" + openaiApiKey2 + "'");
        System.out.println("Environment Variable GEMINI_API_KEY: '" + System.getenv("GEMINI_API_KEY") + "'");
        System.out.println("Environment Variable OPENAI_API_KEY: '" + System.getenv("OPENAI_API_KEY") + "'");
        System.out.println("JVM System Property GEMINI_API_KEY: '" + System.getProperty("GEMINI_API_KEY") + "'");
        System.out.println("JVM System Property gemini.api.key: '" + System.getProperty("gemini.api.key") + "'");
        System.out.println("JVM System Property gemini.api-key: '" + System.getProperty("gemini.api-key") + "'");
        System.out.println("JVM System Property OPENAI_API_KEY: '" + System.getProperty("OPENAI_API_KEY") + "'");
        System.out.println("JVM System Property openai.api.key: '" + System.getProperty("openai.api.key") + "'");
        System.out.println("JVM System Property openai.api-key: '" + System.getProperty("openai.api-key") + "'");
        System.out.println("File: application.properties exists: true");
        System.out.println("File: application.yml exists: false");
        System.out.println("File: .env exists: false");
        boolean apiKeyLoaded = (resolvedKey != null);
        System.out.println("Resolved API key loaded: " + apiKeyLoaded);
        System.out.println("Endpoint URL: " + (apiUrl != null ? apiUrl : "null"));
        System.out.println("Model name: " + (modelName != null ? modelName : "null"));
        System.out.println("==========================");

        if (resolvedKey == null) {
            String errorMsg = String.format(
                "AI Configuration Error: No valid API key is available for the detected provider: %s.\n\n" +
                "Diagnostic details:\n" +
                "1. Google Gemini Search Locations:\n" +
                "   - Environment Variable [GEMINI_API_KEY]: %s\n" +
                "   - JVM System Properties [GEMINI_API_KEY, gemini.api.key, gemini.api-key]: %s, %s, %s\n" +
                "   - application.properties keys [gemini.api.key, gemini.api-key]: %s, %s\n\n" +
                "2. OpenAI Search Locations:\n" +
                "   - Environment Variable [OPENAI_API_KEY]: %s\n" +
                "   - JVM System Properties [OPENAI_API_KEY, openai.api.key, openai.api-key]: %s, %s, %s\n" +
                "   - application.properties keys [openai.api.key, openai.api-key]: %s, %s\n\n" +
                "Remaining manual step: Please configure a valid API key in one of the locations mentioned above (e.g. set the GEMINI_API_KEY environment variable or add it to application.properties).",
                provider,
                System.getenv("GEMINI_API_KEY") != null ? "found (dummy/invalid value)" : "missing/empty",
                System.getProperty("GEMINI_API_KEY") != null ? "found (dummy/invalid value)" : "missing/empty",
                System.getProperty("gemini.api.key") != null ? "found (dummy/invalid value)" : "missing/empty",
                System.getProperty("gemini.api-key") != null ? "found (dummy/invalid value)" : "missing/empty",
                geminiApiKey1 != null && !geminiApiKey1.isEmpty() ? "found (dummy/invalid value)" : "missing/empty",
                geminiApiKey2 != null && !geminiApiKey2.isEmpty() ? "found (dummy/invalid value)" : "missing/empty",
                System.getenv("OPENAI_API_KEY") != null ? "found (dummy/invalid value)" : "missing/empty",
                System.getProperty("OPENAI_API_KEY") != null ? "found (dummy/invalid value)" : "missing/empty",
                System.getProperty("openai.api.key") != null ? "found (dummy/invalid value)" : "missing/empty",
                System.getProperty("openai.api-key") != null ? "found (dummy/invalid value)" : "missing/empty",
                openaiApiKey1 != null && !openaiApiKey1.isEmpty() ? "found (dummy/invalid value)" : "missing/empty",
                openaiApiKey2 != null && !openaiApiKey2.isEmpty() ? "found (dummy/invalid value)" : "missing/empty"
            );
            throw new AiExceptions.ApiKeyMissingException(errorMsg);
        }

        // Validate parameters
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Incident title must not be null or empty.");
        }
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Incident category must not be null or empty.");
        }
        if (priority == null || priority.trim().isEmpty()) {
            throw new IllegalArgumentException("Incident priority must not be null or empty.");
        }
        if (description == null) {
            throw new IllegalArgumentException("Incident description must not be null.");
        }
        if (source == null) source = "Unknown";
        if (department == null) department = "Unknown";
        if (assignedAnalyst == null) assignedAnalyst = "Unassigned";
        if (analystNotes == null) analystNotes = "No notes recorded.";
        if (resolutionSummary == null) resolutionSummary = "N/A";

        try {
            Map<String, Object> requestBody = new HashMap<>();
            String systemPrompt = "You are a Senior SOC L2 Incident Responder. Analyze the provided incident information dynamically and return concise enterprise security language.\n" +
                    "CRITICAL RULES:\n" +
                    "- Never hardcode or return the same output for different incidents. Output must be unique depending on incident details.\n" +
                    "- Never generate markdown formatting (e.g. no bold **, no italics, no bullet list symbols, no code fences like ```json).\n" +
                    "- Never generate HTML elements.\n" +
                    "- Return a raw, valid JSON object matching the requested schema exactly.\n" +
                    "- Extract actual indicators (IPs, emails, domains, hashes, URLs, usernames, PowerShell commands, files) from the description. If none exist, keyIndicators array must be empty.\n" +
                    "- 'riskLevel' must be ONLY one of: Low, Medium, High, Critical.\n" +
                    "- 'confidenceScore' must be a percentage value between 80% and 99% (e.g. \"87%\" or \"94%\").\n\n" +
                    "Return a JSON object matching this schema exactly:\n" +
                    "{\n" +
                    "  \"executiveSummary\": \"concise situational summary of what happened, targeted user/department, and overall status.\",\n" +
                    "  \"keyIndicators\": [\"indicator 1\", \"indicator 2\"],\n" +
                    "  \"possibleRootCause\": \"most likely trigger or root cause of the incident.\",\n" +
                    "  \"investigationSteps\": [\"step 1\", \"step 2\"],\n" +
                    "  \"containmentRecommendations\": [\"recommendation 1\", \"recommendation 2\"],\n" +
                    "  \"businessImpact\": \"short explanation of the business/operational threat of this compromise.\",\n" +
                    "  \"riskLevel\": \"Low/Medium/High/Critical\",\n" +
                    "  \"confidenceScore\": \"80% to 99%\"\n" +
                    "}";

            String userPrompt = String.format(
                    "Incident Details:\nTitle: %s\nCategory: %s\nPriority: %s\nDescription: %s\nSource: %s\nReporter Department: %s\nAssigned Analyst: %s\nExisting Analyst Notes: %s\nResolution Summary: %s",
                    title, category, priority, description, source, department, assignedAnalyst, analystNotes, resolutionSummary
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String requestUrl = apiUrl;
            
            if ("GEMINI".equals(provider)) {
                List<Map<String, Object>> contents = new ArrayList<>();
                Map<String, Object> contentMap = new HashMap<>();
                List<Map<String, Object>> parts = new ArrayList<>();
                Map<String, Object> partMap = new HashMap<>();

                partMap.put("text", systemPrompt + "\n\n" + userPrompt);
                parts.add(partMap);
                contentMap.put("parts", parts);
                contents.add(contentMap);
                requestBody.put("contents", contents);

                Map<String, Object> generationConfig = new HashMap<>();
                generationConfig.put("responseMimeType", "application/json");
                requestBody.put("generationConfig", generationConfig);

                requestUrl = apiUrl + "?key=" + resolvedKey;
            } else {
                requestBody.put("model", modelName);
                List<Map<String, Object>> messages = new ArrayList<>();
                Map<String, Object> userMessage = new HashMap<>();
                userMessage.put("role", "user");
                userMessage.put("content", systemPrompt + "\n\n" + userPrompt);
                messages.add(userMessage);
                requestBody.put("messages", messages);

                Map<String, Object> responseFormat = new HashMap<>();
                responseFormat.put("type", "json_object");
                requestBody.put("response_format", responseFormat);

                headers.set("Authorization", "Bearer " + resolvedKey);
            }

            ObjectMapper mapperLog = new ObjectMapper();
            String requestJson = mapperLog.writeValueAsString(requestBody);
            System.out.println("Request payload: " + requestJson);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<Map> response;
            long startTime = System.currentTimeMillis();
            try {
                response = restTemplate.postForEntity(requestUrl, entity, Map.class);
                long responseTime = System.currentTimeMillis() - startTime;
                if (response != null) {
                    System.out.println("Request status: SUCCESS");
                    System.out.println("Response status: " + response.getStatusCode().value());
                    System.out.println("Response payload: " + mapperLog.writeValueAsString(response.getBody()));
                    
                    int promptSize = (systemPrompt + "\n\n" + userPrompt).length();
                    String tokensUsed = "N/A";
                    Map<String, Object> respBody = response.getBody();
                    if (respBody != null) {
                        if ("GEMINI".equals(provider) && respBody.containsKey("usageMetadata")) {
                            Map<?, ?> usage = (Map<?, ?>) respBody.get("usageMetadata");
                            if (usage != null && usage.containsKey("totalTokenCount")) {
                                tokensUsed = String.valueOf(usage.get("totalTokenCount"));
                            }
                        } else if ("OPENAI".equals(provider) && respBody.containsKey("usage")) {
                            Map<?, ?> usage = (Map<?, ?>) respBody.get("usage");
                            if (usage != null && usage.containsKey("total_tokens")) {
                                tokensUsed = String.valueOf(usage.get("total_tokens"));
                            }
                        }
                    }
                    System.out.println("=== AI EXECUTION STATS ===");
                    System.out.println("Provider used: " + provider);
                    System.out.println("Prompt size (characters): " + promptSize);
                    System.out.println("Response time (ms): " + responseTime);
                    System.out.println("Tokens used: " + tokensUsed);
                    System.out.println("==========================");
                }
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                System.out.println("Request status: FAILED");
                System.out.println("Response status: " + e.getStatusCode().value());
                String responseBodyStr = e.getResponseBodyAsString();
                System.out.println("Response payload: " + responseBodyStr);
                System.out.println("Complete exception stack trace:");
                e.printStackTrace();
                
                String errMessage = e.getMessage();
                try {
                    Map<String, Object> errorMap = mapperLog.readValue(responseBodyStr, new TypeReference<Map<String, Object>>() {});
                    if (errorMap.containsKey("error")) {
                        Object errorObj = errorMap.get("error");
                        if (errorObj instanceof Map) {
                            Map<String, Object> innerError = (Map<String, Object>) errorObj;
                            if (innerError.containsKey("message")) {
                                errMessage = String.valueOf(innerError.get("message"));
                            }
                        } else {
                            errMessage = String.valueOf(errorObj);
                        }
                    }
                } catch (Exception parseEx) {
                    System.err.println("[ERROR] Failed to parse error response JSON: " + parseEx.getMessage());
                }

                if (e.getStatusCode() == org.springframework.http.HttpStatus.UNAUTHORIZED) {
                    throw new AiExceptions.InvalidApiKeyException(errMessage, e);
                } else if (e.getStatusCode() == org.springframework.http.HttpStatus.TOO_MANY_REQUESTS) {
                    throw new AiExceptions.RateLimitExceededException(errMessage, e);
                } else if (e.getStatusCode() == org.springframework.http.HttpStatus.NOT_FOUND || errMessage.toLowerCase().contains("model")) {
                    throw new AiExceptions.InvalidModelException(errMessage, e);
                } else {
                    throw new AiExceptions.InvalidRequestException(errMessage, e);
                }
            } catch (org.springframework.web.client.ResourceAccessException e) {
                System.out.println("Request status: FAILED");
                System.out.println("Complete exception stack trace:");
                e.printStackTrace();
                throw new AiExceptions.AiNetworkException("Network Error: " + e.getMessage(), e);
            } catch (Exception e) {
                System.out.println("Request status: FAILED");
                System.out.println("Complete exception stack trace:");
                e.printStackTrace();
                throw e;
            }

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new AiExceptions.AiParsingException("JSON Parse Error: empty body", null);
            }

            String text = null;
            if ("GEMINI".equals(provider)) {
                List<?> candidates = (List<?>) responseBody.get("candidates");
                if (candidates == null || candidates.isEmpty()) {
                    throw new AiExceptions.AiParsingException("JSON Parse Error: no candidates", null);
                }

                Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
                Map<?, ?> responseContent = (Map<?, ?>) candidate.get("content");
                if (responseContent == null) {
                    throw new AiExceptions.AiParsingException("JSON Parse Error: null content", null);
                }

                List<?> responseParts = (List<?>) responseContent.get("parts");
                if (responseParts == null || responseParts.isEmpty()) {
                    throw new AiExceptions.AiParsingException("JSON Parse Error: empty parts", null);
                }

                Map<?, ?> responsePart = (Map<?, ?>) responseParts.get(0);
                text = (String) responsePart.get("text");
            } else {
                List<?> choices = (List<?>) responseBody.get("choices");
                if (choices == null || choices.isEmpty()) {
                    throw new AiExceptions.AiParsingException("JSON Parse Error: no choices", null);
                }

                Map<?, ?> choice = (Map<?, ?>) choices.get(0);
                Map<?, ?> responseMessage = (Map<?, ?>) choice.get("message");
                if (responseMessage == null) {
                    throw new AiExceptions.AiParsingException("JSON Parse Error: null message", null);
                }
                text = (String) responseMessage.get("content");
            }

            if (text == null || text.trim().isEmpty()) {
                throw new AiExceptions.AiParsingException("JSON Parse Error: empty response text", null);
            }

            try {
                Map<String, Object> raw = mapper.readValue(text, new TypeReference<Map<String, Object>>() {});
                Map<String, String> result = new HashMap<>();
                result.put("executiveSummary", getOrJoin(raw.get("executiveSummary")));
                result.put("possibleRootCause", getOrJoin(raw.get("possibleRootCause")));
                result.put("investigationSteps", getOrJoin(raw.get("investigationSteps")));
                result.put("containmentRecommendations", getOrJoin(raw.get("containmentRecommendations")));
                
                String iocs = getOrJoin(raw.get("keyIndicators"));
                if (iocs == null || iocs.trim().isEmpty() || iocs.equals("• ") || iocs.trim().equals("•")) {
                    iocs = "No specific Indicators of Compromise identified.";
                }
                result.put("keyIndicators", iocs);
                
                result.put("businessImpact", getOrJoin(raw.get("businessImpact")));
                result.put("riskLevel", getOrJoin(raw.get("riskLevel")));
                result.put("confidenceScore", getOrJoin(raw.get("confidenceScore")));
                return result;
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                System.out.println("Complete exception stack trace:");
                e.printStackTrace();
                throw new AiExceptions.AiParsingException("JSON Parse Error: invalid JSON payload", e);
            }
        } catch (AiExceptions.ApiKeyMissingException | AiExceptions.InvalidApiKeyException | AiExceptions.InvalidModelException | AiExceptions.InvalidRequestException | AiExceptions.RateLimitExceededException | AiExceptions.AiNetworkException | AiExceptions.AiParsingException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to generate AI analysis: " + e.getMessage());
            throw new RuntimeException("Failed to generate AI analysis: " + e.getMessage(), e);
        }
    }

    private String getOrJoin(Object obj) {
        if (obj == null) return "";
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            if (list.isEmpty()) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            for (Object item : list) {
                if (sb.length() > 0) sb.append("\n");
                sb.append("• ").append(item);
            }
            return sb.toString();
        }
        return String.valueOf(obj);
    }
}
