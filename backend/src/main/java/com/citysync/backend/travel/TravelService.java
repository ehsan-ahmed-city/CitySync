package com.citysync.backend.travel;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

@Service
public class TravelService {

    @Value("${google.routes.api-key}")
    private String apiKey;

    private final WebClient webClient;

    public TravelService(WebClient.Builder builder) {
        this.webClient = builder
                .baseUrl("https://routes.googleapis.com")
                .build();
    }

    /**returns travel duration in seconds between home and uni
     *use google routes API computeRouteMatrix transit + walking
     *falls back to -1 if api call fials so frontend can use user buffer alone
     */
    public int getTravelSeconds(String origin, String destination, String arrivalTime) {
        try {

            //request body as for routes API spec
            Map<String, Object> requestBody = new java.util.LinkedHashMap<>();

            requestBody.put("origins", List.of(Map.of("waypoint", Map.of("address", origin))));
            requestBody.put("destinations", List.of(Map.of("waypoint", Map.of("address", destination))));
            requestBody.put("travelMode", "TRANSIT");

            if (arrivalTime != null && !arrivalTime.isBlank()){
                requestBody.put("arrivalTime",arrivalTime);
            }

            //to computeRouteMatrix
            //the field mask for google response
            String responseBody = webClient.post()
                    .uri("/distanceMatrix/v2:computeRouteMatrix")
                    .header("Content-Type", "application/json")
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", "originIndex,destinationIndex,duration,status")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (responseBody == null) return -1;

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            //^first element is single origin to destination result
            JsonNode root = mapper.readTree(responseBody);

            JsonNode firstElement = root.isArray() ? root.get(0) : root;//rm returns an array of its elements
            if (firstElement == null) return -1;

            JsonNode statusNode = firstElement.get("status");//if not pk then fall back
            if (statusNode != null && !statusNode.isNull()) {

                String code = statusNode.path("code").asText("0");
                if (!"0".equals(code)) return -1;
            }

            //duration returned
            String durationStr = firstElement.path("duration").asText("");
            if (durationStr.isEmpty()) return -1;
            durationStr = durationStr.replace("s", "").trim();//strip s then parse
            return Integer.parseInt(durationStr);

        } catch (Exception e) {

            System.err.println("[TravelService] Routes API error: " + e.getMessage());//log and return -1 so frontend falls back to user buffer
            return -1;
        }
    }
}
