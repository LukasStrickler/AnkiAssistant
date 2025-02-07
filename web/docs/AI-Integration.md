# Database Schema
```mermaid
graph TD
    %% ========== Database Schema ==========
    subgraph Databases
        %% ========== Main Database ==========
        subgraph MainDB["Main Database"]
            CardSchema
            style MainDB fill:#e6f3ff,stroke:#3399ff
        end

        %% ========== Log Database ==========
        subgraph LogDB["Log Database"]
            LogSchema
            style LogDB fill:#fff5e6,stroke:#ff9900
        end

        class MainDB,LogDB database
    end

    %% ========== Card Schema ==========
    subgraph CardSchema[card]
        direction LR
        subgraph Identifiers["Core Identifiers"]
            ID["id (UUID) [PK]"]
            USER_ID["user_id (STRING) [FK -> user.id]"]
        end
        
        subgraph Content["Card Content"]
            Question["question (TEXT)"]
            Answer["answer (HTML)"]
            %% question + answer hash
            CONTENT_HASH["content_hash (STRING) [UNIQUE]"]
        end

        subgraph CardData["Card Data"]
            DECK["deck (STRING) [INDEX]"]
            TAGS["tags ARRAY(STRING)"]
            PARENT_CARD["parent_card (STRING) (FK -> card.id)"]
        end
        
        subgraph Sync["Anki Sync"]
            ANKI_ID["anki_id (BIGINT) [UNIQUE]"]
            LAST_SYNCED["last_synced (TIMESTAMP)"]
            SYNC_STATUS["sync_status (ENUM: 'pending', 'synced', 'conflict')"]
        end
        
        subgraph ModelData["Model Data"]
            QUALITY_SCORE["quality_score (FLOAT)"]
            MODEL["model (STRING)"]
            MODEL_VERSION["model_version (FLOAT)"]
        end
        
        style Identifiers fill:#f0f8ff
        style Content fill:#f5f5dc
        style Sync fill:#ffe6e6
        style ModelData fill:#f8f8f8
    end

    %% ========== Log Schema ==========
    subgraph LogSchema[log_entry]
        direction LR
        subgraph CardLifecycle["Card Lifecycle"]
            LOG_ID["log_id (UUID) [PK]"]
            INTERNAL_UUID["internal_uuid (UUID) [INDEX]"] 
            %% Pre-generation UUID
            PARENT_LOG["parent_log_id (UUID?)"]
            OPERATION_TYPE["operation_type (ENUM: 'create_overview','create_card','fix_format', 'update', 'delete', 'sync')"]
        end
        
        subgraph Processing["Processing Info"]
            MODEL_VERSION["model_version (STRING)"]
            %% For deduplication
            INPUT_HASH["input_hash (STRING) [INDEX]"]
            PROCESSING_TIME["processing_time (INT)"]
            RETRY_COUNT["retry_count (INT)"]
        end
        
        subgraph TrainingData["Training Data"]
            USER_FEEDBACK["user_feedback (JSON)"]
            TRAINING_STATUS["training_status (ENUM: 'unused', 'in_training', 'processed')"]
        end
        
        subgraph System["System Metrics"]
            TIMESTAMP["timestamp (TIMESTAMP) [INDEX]"]
            ERROR_CODE["error_code (STRING)"]
            ERROR_DETAILS["error_details (JSON)"]
            %% CPU/RAM/GPU metrics
            RESOURCE_USAGE["resource_usage (JSON)"]  
            %% Operating System / OLLAMA Version
            SYSTEM_INFO["system_info (JSON)"]
        end
        
        style CardLifecycle fill:#f0f8ff
        style Processing fill:#f5f5dc
        style TrainingData fill:#e6ffe6
        style System fill:#ffe6e6
    end

    %% ========== Styling Definitions ==========
    classDef process fill:#f0f0f0,stroke:#666
    classDef decision fill:#ccebff,stroke:#006699
    classDef database fill:#e6f3ff,stroke:#3399ff
    class MainDB,CardSchema, database
```

# Main Flow
## Overivew
> Legend of Responsibilities
> UI/User (yellow boxes): Any step where the user directly interacts with the system, e.g., uploading or editing content, dragging cards between decks.
> System (green boxes): Steps handled by your backend or application logic (loading embeddings, providing mindmap views, saving to DB, etc.).
> LLM (purple boxes): Stages where natural language generation or advanced analysis (by a large language model) is the primary driver, such as card proposal, refinement, or quality checks.
> (“System+LLM” steps have been assigned the LLM color code for clarity, but you can split them further if you want a separate color for the purely “system” portion.)


```mermaid
flowchart TB

%% -------------------
%% COLOR DEFINITIONS
%% -------------------
classDef userClass fill:#fff2cc,stroke:#c9ae5d,stroke-width:1px,color:#2B2B2B
classDef systemClass fill:#d9f7be,stroke:#66bb6a,stroke-width:1px,color:#2B2B2B
classDef llmClass fill:#e7c6ff,stroke:#9d58cb,stroke-width:1px,color:#2B2B2B
classDef done fill:#ffffff,stroke:#000000,stroke-width:1px,color:#2B2B2B

%% -------------------
%% STEP 0 (System)
%% -------------------
subgraph S0["Step 0 - Load Embeddings"]
  direction TB
  Z1[Fetch existing Decks and Cards]
  Z2[Generate Embeddings]
  Z1 --> Z2
end
style S0 fill:#d9f7be,stroke:#66bb6a,stroke-width:1px,color:#2B2B2B
class Z1 systemClass
class Z2 systemClass

%% -------------------
%% STEP 1 (User)
%% -------------------
subgraph S1["Step 1 - User Input"]
  direction TB
  A1[Receive New Content]
  A2[Sanitize Input]
  A3[Check Structure]
  A1 --> A2 --> A3
end
style S1 fill:#fff2cc,stroke:#c9ae5d,stroke-width:1px,color:#2B2B2B
class A1 userClass
class A2 userClass
class A3 userClass

%% -------------------
%% STEP 2 (System+LLM)
%% -------------------
subgraph S2["Step 2 - Analysis"]
  direction TB
  B1[Semantic Chunking]
  B2[Identify Card Types]
  B3[Suggest Decks]
  B1 --> B2 --> B3
end
style S2 fill:#e7c6ff,stroke:#9d58cb,stroke-width:1px,color:#2B2B2B
class B1 systemClass
class B2 llmClass
class B3 llmClass

%% -------------------
%% STEP 3 (System+LLM)
%% -------------------
subgraph S3["Step 3 - Create Cards"]
  direction TB
  C1[Draft Card Content]

  Q1[Check Clarity]
  Q2[Auto Improve]
  Q3[Quality Check Passed]
  C1 --> Q1 --> Q2 --> Q3
end
style S3 fill:#e7c6ff,stroke:#9d58cb,stroke-width:1px,color:#2B2B2B
class C1 llmClass
class Q1 llmClass
class Q2 llmClass
class Q3 llmClass

%% -------------------
%% STEP 4 (System)
%% -------------------
subgraph S4["Step 4 - Mindmap"]
  direction TB
  M1[Show Visual Deck Overview]
  M2[View Overlaps]
end
style S4 fill:#fff2cc,stroke:#c9ae5d,stroke-width:1px,color:#2B2B2B
class M1 userClass
class M2 userClass

%% -------------------
%% STEP 5 (User)
%% -------------------
subgraph S5["Step 5 - User Adjustments"]
  direction TB
  R1[Add Manual Card]
  R2[Edit]
  R3[Delete Card]
  R4[Combine or Split]
  R5[Regenerate Decks & Cards]

  %% If needed, you can add these loopbacks here
end
style S5 fill:#fff2cc,stroke:#c9ae5d,stroke-width:1px,color:#2B2B2B
class R1 userClass
class R2 userClass
class R3 userClass
class R4 userClass
class R5 userClass

%% -------------------
%% STEP 6 (System)
%% -------------------
subgraph S6["Step 6 - Finalize"]
  direction TB
  F1[Store in DB]
  F2[Versioning and Confirm]
  F1 --> F2
end
style S6 fill:#d9f7be,stroke:#66bb6a,stroke-width:1px,color:#2B2B2B
class F1 systemClass
class F2 systemClass

%% -------------------
%% FLOW (TOP TO BOTTOM)
%% -------------------
S0 --> S1 --> S2 --> S3  --> S4 --> S5 --> S6
class K done



```

## Details

### Anki Sync Flow
```mermaid
flowchart TD
    %% ========== Sync Trigger ==========
    S[User Presses Sync] --> T{Local Anki Detected?}
    T -->|Yes| U[Check Cards with empty anki_id]
    T -->|No| V[Show Warning]
    
    %% ========== Sync Processing ==========
    subgraph Processing[Sync Execution]
        direction TB
        U --> W[Convert to Anki Format <br> Decks & Cards]
        W --> X[AnkiConnect API]
        X -->|Success| Y[Update sync_status]
        X -->|Failure| Z[Log Error]
    end
    
    %% ========== Database Interactions ==========
    MainDB[(MainDB)] --> U
    Y --> MainDB
    Z --> LogDB[(LogDB)]
    
    %% ========== User Feedback ==========
    Y --> AA[Notify User]
    Z --> AB[Show Error Details]
    
    %% ========== Style Definitions ==========
    classDef trigger fill:#f3e5f5,stroke:#9c27b0
    classDef process fill:#f0f0f0,stroke:#666
    classDef database fill:#e6f3ff,stroke:#3399ff
    class S,T trigger
    class Processing process
    class MainDB,LogDB database
```