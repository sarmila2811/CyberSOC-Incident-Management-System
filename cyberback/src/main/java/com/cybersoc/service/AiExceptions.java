package com.cybersoc.service;

public class AiExceptions {

    public static class ApiKeyMissingException extends RuntimeException {
        public ApiKeyMissingException(String message) {
            super(message);
        }
    }

    public static class InvalidApiKeyException extends RuntimeException {
        public InvalidApiKeyException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class RateLimitExceededException extends RuntimeException {
        public RateLimitExceededException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class AiNetworkException extends RuntimeException {
        public AiNetworkException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class AiParsingException extends RuntimeException {
        public AiParsingException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class InvalidModelException extends RuntimeException {
        public InvalidModelException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class InvalidRequestException extends RuntimeException {
        public InvalidRequestException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
