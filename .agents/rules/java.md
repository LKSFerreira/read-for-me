---
trigger: model_decision
description: Java conventions, project structure (plain Java and Spring Boot), and build/run commands.
---

# Java Rules

## Language Boundary

English in this file is instruction-only. Unless the user explicitly requests another language, produce responses, documentation, code comments, error messages, and user-facing text in Brazilian Portuguese (pt-BR). Use pt-BR for domain-specific Java names, subject to the global code rules.

## 1: Version and Environment
- **JDK**: 17+ (LTS) or 21+ (LTS).
- **Modern features**: When applicable and beneficial to readability, use modern Java features (for example, `Records`, `var` for local variables, `Text Blocks`, and `Switch Expressions`).

## 2: Plain Java vs. Framework

### 2.1: Plain Java Structure
Use this structure when studying basic concepts, algorithms, lambdas, and streams.

```text
projeto/
├── src/
│   └── Main.java
├── out/           # Arquivos compilados (.class)
└── README.md
```

**Build and Run:**
```bash
# Compilar um arquivo
javac -d out/ src/Main.java

# Executar
java -cp out/ Main

# Compilar múltiplos arquivos no diretório
javac -d out/ src/*.java
```

---

### 2.2: Spring Boot Structure
Use this structure when studying Spring Framework, REST APIs, and dependency injection.

```text
projeto/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/exemplo/
│       │       └── Application.java
│       └── resources/
│           └── application.properties
├── pom.xml (ou build.gradle)
└── README.md
```

**Build and Run (assume Maven by default unless a `build.gradle` exists):**
```bash
# Baixar dependências e compilar
mvn clean compile

# Executar a aplicação
mvn spring-boot:run

# Executar testes
mvn test

# Gerar JAR executável
mvn clean package
```
> **Note:** Spring Boot projects are created via (https://start.spring.io). If the project uses the Maven wrapper, use `./mvnw` instead of `mvn`.

---

## 3: Code Conventions

### Naming (always pt-BR, as required by the global rule):
- **Classes/Records/Interfaces**: PascalCase (`GerenciadorProdutos`, `CarrinhoCompras`).
- **Methods and variables**: camelCase (`calcularTotal`, `nomeCliente`).
- **Constants**: SCREAMING_SNAKE_CASE (`TAXA_IMPOSTO`, `URL_API`).
- **Packages**: lowercase and without special characters (`com.exemplo.servicos`).

### Good Practices
- Keep one public class per file.
- The file name MUST equal the class name.
- Use explicit access modifiers (`private`, `public`, `protected`).
- **Immutability**: Prefer `final` for variables and attributes that must not change.

## 4: Course Concepts (Lambdas and Streams)
- **Lambda expressions**: Syntax `(parametros) -> expressao`. Use them with functional interfaces (`Consumer`, `Predicate`, `Function`).
- **Stream API**: 
  - Intermediate operations: `filter()`, `map()`, `sorted()`.
  - Terminal operations: `collect()`, `forEach()`, `reduce()`.
  - Remember that streams are *lazy*: they run only when needed.
- **Method references**: `Classe::metodo` or `Classe::new`.

## 5: Spring Framework (Good Practices)
- **Dependency injection**: **Avoid** using `@Autowired` on fields (field injection). Always prefer **constructor injection**, either manually or through Lombok's `@RequiredArgsConstructor`.
- **Components**: `@Component`, `@Service`, `@Repository`, `@RestController`.
- **Configuration**: `application.properties` or `application.yml`.

## 6: Docker Environment (DevContainer)
Use this environment to run or study Java without installing it locally:

```yaml
# compose.yaml
services:
  java:
    image: eclipse-temurin:21-jdk
    volumes:
      - ../:/workspace
    working_dir: /workspace
    command: sleep infinity
```
