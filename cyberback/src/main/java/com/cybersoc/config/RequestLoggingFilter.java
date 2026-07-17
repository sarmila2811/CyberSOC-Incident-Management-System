package com.cybersoc.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class RequestLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws java.io.IOException, jakarta.servlet.ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        long startTime = System.currentTimeMillis();
        String method = req.getMethod();
        String uri = req.getRequestURI();
        String queryString = req.getQueryString();
        String fullPath = queryString != null ? uri + "?" + queryString : uri;

        logger.info("[REQUEST] Received: {} {}", method, fullPath);

        try {
            chain.doFilter(request, response);
        } catch (Exception e) {
            logger.error("[REQUEST ERROR] Exception occurred during: {} {}: {}", method, fullPath, e.getMessage(), e);
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = res.getStatus();
            logger.info("[RESPONSE] Finished: {} {} -> Status: {} ({}ms)", method, fullPath, status, duration);
        }
    }
}
