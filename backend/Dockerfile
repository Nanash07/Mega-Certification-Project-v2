# ===== Stage 1: Build =====
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# Then copy sources
COPY src ./src
RUN mvn -q -DskipTests clean package

# ===== Stage 2: Run =====
FROM eclipse-temurin:21-jre
WORKDIR /app

ENV TZ=Asia/Jakarta \
    JAVA_OPTS=""

COPY --from=build /app/target/*.jar app.jar

# Railway injects PORT, Spring will read it via server.port in properties
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
