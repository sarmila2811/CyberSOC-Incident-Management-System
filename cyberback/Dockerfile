# Stage 1: Build the application inside Docker
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the pom.xml and download dependencies for caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the source code and build the application package
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Create the runtime container with Eclipse Temurin Java 17
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the compiled executable jar from the build stage
COPY --from=build /app/target/cybersoc-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8080
EXPOSE 8080

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
