import { create } from 'zustand';
import { OllamaClient, type ChatMessage } from '@/lib/ollama';
import { v4 as uuidv4 } from 'uuid';
import { type ConnectionStatus } from '@/types/connection-status';
import { logger } from '@/lib/logger';

export enum InferencePromptStatus {
    Pending = 'pending',
    InProgress = 'in-progress',
    Completed = 'completed',
    Error = 'error',
    Aborted = 'aborted',
    ConnectionWaiting = 'connection-waiting', // New status for connection waiting
}

// Track abort controllers for each prompt
const abortControllers = new Map<string, AbortController>();

// Flag to track if we're currently processing the queue
let isProcessingQueue = false;

// Connection retry settings
const CONNECTION_RETRY_INTERVAL = 1000; // 1 second between connection retries
const MAX_CONNECTION_RETRIES = 120; // Maximum number of retries per prompt
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

// Debug flag - set to true to force all connection checks to return 'connected'
const DEBUG_FORCE_CONNECTED = false;

// Reasons for clearing state
export enum ClearStateReason {
    NoMorePendingPrompts = 'no-more-pending-prompts',
    UserInitiated = 'user-initiated',
    Aborted = 'aborted',
    Reset = 'reset',
}

export type InferencePrompt = {
    id: string;
    status: InferencePromptStatus;

    errorMessage?: string;

    order: number;
    createdAt: Date;
    executedAt?: Date;

    // input
    prompt: string;
    modelRequested: string;
    priority: number;
    concurrency: boolean;
    creator: string;
    prevChatMessages: ChatMessage[];
    updateStatusFn?: UpdateStatusFunction;
    updateFn?: UpdateFunction;
    finishFn?: FinishFunction;

    // Connection retry tracking
    connectionRetries?: number;
};

export type UpdateFunction = (partialResult: string, promptId: string) => void;
export type FinishFunction = (result: string, promptId: string) => void;
export type UpdateStatusFunction = (status: InferencePromptStatus) => void;
export type AddPromptData = {
    prevChatMessages?: ChatMessage[];
    creator: string;
    prompt: string;
    model: string;
    priority?: number; // default is 0
    concurrency?: boolean; // default is false
    updateFn?: UpdateFunction; // default is none
    finishFn?: FinishFunction; // default is none
    updateStatusFn?: UpdateStatusFunction; // default is none
}

interface InferenceState {
    prompts: InferencePrompt[];
    currentPromptIndex: number;
    isExecuting: boolean;
    currentlyExecuting: number;
    connectionStatus: ConnectionStatus;
    isCheckingConnection: boolean;

    // Actions
    addPrompt: (prompt: AddPromptData) => string;
    updatePrompt: (id: string, prompt: Partial<InferencePrompt>) => void;
    deletePrompt: (id: string) => void;
    prioritizePrompt: (id: string, priority: number) => void;

    // Execution
    startExecution: () => void;
    pauseExecution: () => void;
    abortExecution: () => void;
    resetExecution: () => void;
    executePrompt: (promptId: string) => Promise<void>;

    // Connection management
    checkConnectionStatus: (forceConnected?: boolean) => Promise<ConnectionStatus>;
    startConnectionMonitoring: () => void;
    stopConnectionMonitoring: () => void;

    // Utilities
    getPromptById: (id: string) => InferencePrompt | undefined;
    getPromptStatusById: (id: string) => InferencePromptStatus | undefined;
    getPromptIdsByCreator: (creator: string) => string[];
    orderPrompts: () => void;
    getCurrentPrompt: () => InferencePrompt | undefined;
    clearState: () => void;
    clearStateWithReason: (reason: ClearStateReason) => void;
}

// Create the Ollama client instance for API calls
const ollamaClient = new OllamaClient();


export const useInferenceStore = create<InferenceState>()(
    (set, get) => ({
        prompts: [],
        currentPromptIndex: 0,
        isExecuting: false,
        currentlyExecuting: 0,
        connectionStatus: 'disconnected', // Start with unknown connection status
        isCheckingConnection: false,

        clearState: () => {
            set({ prompts: [], currentPromptIndex: 0, isExecuting: false, currentlyExecuting: 0 });
        },

        // New centralized state cleanup function
        clearStateWithReason: (reason: ClearStateReason) => {
            const state = get();

            // Special handling based on reason
            if (reason === ClearStateReason.Aborted) {
                // Cancel all in-flight requests
                state.prompts.forEach((p) => {
                    if (p.status === InferencePromptStatus.InProgress) {
                        const controller = abortControllers.get(p.id);
                        if (controller) {
                            controller.abort();
                            abortControllers.delete(p.id);
                        }
                    }

                    // Update status to aborted for all prompts
                    if (p.updateStatusFn) {
                        p.updateStatusFn(InferencePromptStatus.Aborted);
                    }
                });
            }

            // Common cleanup logic
            set({
                prompts: [],
                currentPromptIndex: 0,
                isExecuting: false,
                currentlyExecuting: 0
            });

            // Log the state cleanup reason for debugging
            logger.info(`Inference store state cleared. Reason: ${reason}`);
        },

        // Check connection status and update state
        checkConnectionStatus: async (forceConnected = DEBUG_FORCE_CONNECTED) => {
            // If debug flag is on, always return connected
            if (forceConnected) {
                set({ connectionStatus: 'connected', isCheckingConnection: false });
                return 'connected';
            }

            // Prevent multiple simultaneous connection checks
            if (get().isCheckingConnection) {
                return get().connectionStatus;
            }

            set({ isCheckingConnection: true });

            try {
                const status = await ollamaClient.getConnectionStatus();
                set({ connectionStatus: status, isCheckingConnection: false });
                return status;
            } catch (error) {
                logger.error("Connection check error:", error);
                set({ connectionStatus: 'disconnected', isCheckingConnection: false });
                return 'disconnected';
            }
        },

        // Start periodic connection monitoring
        startConnectionMonitoring: () => {
            // Stop any existing interval first
            get().stopConnectionMonitoring();

            // Check connection immediately
            void get().checkConnectionStatus();

            // Set up interval for periodic checks
            connectionCheckInterval = setInterval(() => {
                void get().checkConnectionStatus().then(status => {

                    // If connection is restored and we have pending or waiting prompts,
                    // restart execution
                    if (status === 'connected') {
                        const waitingPrompts = get().prompts.filter(p =>
                            p.status === InferencePromptStatus.ConnectionWaiting
                        );

                        if (waitingPrompts.length > 0) {
                            logger.info(`Found ${waitingPrompts.length} waiting prompts, restoring to pending`);

                            // Move prompts from connection-waiting back to pending
                            waitingPrompts.forEach(p => {
                                get().updatePrompt(p.id, {
                                    status: InferencePromptStatus.Pending,
                                    connectionRetries: 0 // Reset retry counter
                                });

                                if (p.updateStatusFn) {
                                    p.updateStatusFn(InferencePromptStatus.Pending);
                                }
                            });

                            // Ensure execution is active
                            get().startExecution();

                            // Force process the queue immediately
                            processNextPromptsSafely();
                        }
                    }
                });
            }, CONNECTION_RETRY_INTERVAL);
        },

        // Stop connection monitoring
        stopConnectionMonitoring: () => {
            if (connectionCheckInterval !== null) {
                clearInterval(connectionCheckInterval);
                connectionCheckInterval = null;
            }
        },

        addPrompt: (promptData: AddPromptData) => {
            const id = uuidv4();
            const newPrompt: InferencePrompt = {
                id,
                status: InferencePromptStatus.Pending,
                prevChatMessages: promptData.prevChatMessages ?? [],
                creator: promptData.creator,
                prompt: promptData.prompt,
                modelRequested: promptData.model,
                priority: promptData.priority ?? 0,
                concurrency: promptData.concurrency ?? false,
                createdAt: new Date(),
                order: get().prompts.length,
                updateFn: promptData.updateFn,
                finishFn: promptData.finishFn,
                updateStatusFn: promptData.updateStatusFn,
                connectionRetries: 0,
            };

            logger.info(`Adding prompt ${id} (concurrency=${newPrompt.concurrency}, priority=${newPrompt.priority})`);

            if (newPrompt.updateStatusFn) {
                newPrompt.updateStatusFn(InferencePromptStatus.Pending);
            }

            set((state) => {
                const updatedPrompts = [...state.prompts, newPrompt];
                return { prompts: updatedPrompts };
            });

            // Order the prompts after adding a new one
            get().orderPrompts();

            // Ensure connection monitoring is active
            get().startConnectionMonitoring();

            // start execution
            get().startExecution();

            return id;
        },

        updatePrompt: (id: string, promptUpdate: Partial<InferencePrompt>) => {
            // Get the old prompt to check status changes
            const oldPrompt = get().getPromptById(id);
            const oldStatus = oldPrompt?.status;
            const newStatus = promptUpdate.status;

            // Update the prompt
            set((state) => ({
                prompts: state.prompts.map((p) =>
                    p.id === id ? { ...p, ...promptUpdate } : p
                ),
            }));

            get().orderPrompts();

            // If we're changing status from waiting to pending, ensure we process the queue
            if (oldStatus === InferencePromptStatus.ConnectionWaiting &&
                newStatus === InferencePromptStatus.Pending) {
                logger.info(`Prompt ${id} changed from waiting to pending, processing queue`);

                // Make sure execution is running
                if (!get().isExecuting) {
                    get().startExecution();
                } else {
                    // Force process the queue
                    processNextPromptsSafely();
                }
            }
        },

        deletePrompt: (id: string) => {
            set((state) => ({
                prompts: state.prompts.filter((p) => p.id !== id),
            }));
            get().orderPrompts();
        },

        prioritizePrompt: (id: string, priority: number) => {
            set((state) => ({
                prompts: state.prompts.map((p) =>
                    p.id === id ? { ...p, priority } : p
                ),
            }));
            get().orderPrompts();
        },

        getPromptById: (id: string) => {
            return get().prompts.find((p) => p.id === id);
        },

        getPromptStatusById: (id: string) => {
            return get().prompts.find((p) => p.id === id)?.status;
        },

        getPromptIdsByCreator: (creator: string) => {
            return get().prompts.filter((p) => p.creator === creator).map((p) => p.id);
        },

        getCurrentPrompt: () => {
            const { prompts, currentPromptIndex } = get();
            return prompts[currentPromptIndex];
        },

        orderPrompts: () => {
            set((state) => {
                // Sort by priority (higher first) then by creation date
                const orderedPrompts = [...state.prompts].sort((a, b) => {
                    if (a.priority !== b.priority) {
                        return b.priority - a.priority; // Higher priority first
                    }
                    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
                        return a.createdAt.getTime() - b.createdAt.getTime();
                    }
                    return 0;
                });

                // Reassign order values based on the new order
                orderedPrompts.forEach((p, idx) => {
                    p.order = idx;
                });

                return { prompts: orderedPrompts };
            });
        },

        startExecution: () => {
            const state = get();

            if (state.isExecuting) {
                return; // Already executing
            }

            set({ isExecuting: true });

            // Make sure connection monitoring is active
            get().startConnectionMonitoring();

            // Find the next pending prompt
            const nextPendingIndex = state.prompts.findIndex(
                (p) => p.status === InferencePromptStatus.Pending
            );

            if (nextPendingIndex >= 0) {
                set({ currentPromptIndex: nextPendingIndex });
                const nextPrompt = state.prompts[nextPendingIndex];
                if (nextPrompt) {
                    logger.info(`Starting initial prompt execution: ${nextPrompt.id} (primary)`);
                    void get().executePrompt(nextPrompt.id);

                    // Only check for a concurrent second prompt if:
                    // 1. We have capacity (currentlyExecuting < 2)
                    // 2. There are more pending prompts
                    // This should happen AFTER the first prompt has incremented currentlyExecuting
                    if (get().currentlyExecuting < 2 && state.prompts.length > nextPendingIndex + 1) {
                        // Get the NEXT prompt according to priority order
                        const secondNextPrompt = state.prompts[nextPendingIndex + 1];
                        // Only execute if it explicitly allows concurrency
                        if (secondNextPrompt &&
                            secondNextPrompt.status === InferencePromptStatus.Pending &&
                            secondNextPrompt.concurrency === true) {
                            logger.info(`Starting concurrent prompt execution from start: ${secondNextPrompt.id} (secondary, concurrency=${secondNextPrompt.concurrency})`);
                            void get().executePrompt(secondNextPrompt.id);
                        } else if (secondNextPrompt) {
                            logger.info(`Skipping concurrent execution in start for prompt: ${secondNextPrompt.id} (concurrency=${secondNextPrompt?.concurrency})`);
                        }
                    }
                }
            } else {
                // No pending prompts, execution finished
                get().clearStateWithReason(ClearStateReason.NoMorePendingPrompts);
            }
        },

        pauseExecution: () => {
            set({ isExecuting: false });
            // We don't stop currently executing prompts, just prevent new ones from starting
        },

        abortExecution: () => {
            get().clearStateWithReason(ClearStateReason.Aborted);
        },

        resetExecution: () => {
            get().clearStateWithReason(ClearStateReason.Reset);
        },

        // Now a public method on the interface
        executePrompt: async (promptId: string) => {
            const state = get();
            const prompt = state.getPromptById(promptId);

            if (!prompt || prompt.status !== InferencePromptStatus.Pending) {
                logger.info(`Skipping prompt execution for ${promptId}: not pending or not found`);
                return;
            }

            if (state.currentlyExecuting >= 2) {
                logger.info(`Skipping prompt execution for ${promptId}: too many already executing (${state.currentlyExecuting}/2)`);
                return;
            }

            // Check if this prompt should allow concurrency
            if (state.currentlyExecuting > 0 && !prompt.concurrency) {
                logger.info(`Skipping prompt execution for ${promptId}: already executing and concurrency not enabled`);
                return;
            }

            // Check connection status before proceeding
            const connectionStatus = await get().checkConnectionStatus(DEBUG_FORCE_CONNECTED);

            if (connectionStatus !== 'connected') {
                // Update prompt to connection-waiting
                get().updatePrompt(promptId, {
                    status: InferencePromptStatus.ConnectionWaiting,
                    connectionRetries: (prompt.connectionRetries ?? 0) + 1,
                });

                if (prompt.updateStatusFn) {
                    prompt.updateStatusFn(InferencePromptStatus.ConnectionWaiting);
                }

                logger.info(`Prompt ${promptId} waiting for connection. Retry: ${(prompt.connectionRetries ?? 0) + 1}/${MAX_CONNECTION_RETRIES}`);

                // If we've exceeded max retries, fail the prompt
                if ((prompt.connectionRetries ?? 0) + 1 >= MAX_CONNECTION_RETRIES) {
                    get().updatePrompt(promptId, {
                        status: InferencePromptStatus.Error,
                        errorMessage: `Connection failed after ${MAX_CONNECTION_RETRIES} attempts`
                    });

                    if (prompt.updateStatusFn) {
                        prompt.updateStatusFn(InferencePromptStatus.Error);
                    }

                    // Process next prompts
                    processNextPromptsSafely();
                }

                return;
            }

            logger.info("executing prompt", promptId);

            // Create abort controller for this prompt
            const abortController = new AbortController();
            abortControllers.set(promptId, abortController);

            // Update prompt to in-progress
            get().updatePrompt(promptId, {
                status: InferencePromptStatus.InProgress,
                executedAt: new Date(),
                connectionRetries: 0, // Reset connection retries
            });

            if (prompt.updateStatusFn) {
                prompt.updateStatusFn(InferencePromptStatus.InProgress);
            }

            // Increment executing counter
            set((state) => ({ currentlyExecuting: state.currentlyExecuting + 1 }));

            try {
                const prevChatMessages = prompt.prevChatMessages;
                const chatMessages = [...prevChatMessages, { role: 'user', content: prompt.prompt } as ChatMessage];

                let fullResult = '';

                // Handle the streaming completion with abort signal
                await ollamaClient.streamChatCompletion(
                    chatMessages,
                    prompt.modelRequested,
                    {}, // Empty options object
                    (delta) => {
                        fullResult += delta.content;

                        // Call update function if provided
                        if (prompt.updateFn) {
                            prompt.updateFn(fullResult, promptId);
                        }
                    },
                    abortController // Pass the abortController
                );

                // Update prompt with full result
                get().updatePrompt(promptId, {
                    status: InferencePromptStatus.Completed,
                });

                // Call finish function if provided
                if (prompt.finishFn) {
                    prompt.finishFn(fullResult, promptId);
                }

                if (prompt.updateStatusFn) {
                    prompt.updateStatusFn(InferencePromptStatus.Completed);
                }

            } catch (error) {
                // Check if this was an abort
                if (error instanceof DOMException && error.name === 'AbortError') {
                    get().updatePrompt(promptId, {
                        status: InferencePromptStatus.Aborted,
                        errorMessage: "Request was aborted"
                    });

                    if (prompt.updateStatusFn) {
                        prompt.updateStatusFn(InferencePromptStatus.Aborted);
                    }
                }
                // Check if this might be a connection error
                else if (error instanceof Error &&
                    (error.message.includes('fetch') ||
                        error.message.includes('network') ||
                        error.message.includes('connect'))) {

                    // Move prompt back to connection-waiting
                    get().updatePrompt(promptId, {
                        status: InferencePromptStatus.ConnectionWaiting,
                        connectionRetries: (prompt.connectionRetries ?? 0) + 1,
                        errorMessage: error.message
                    });

                    if (prompt.updateStatusFn) {
                        prompt.updateStatusFn(InferencePromptStatus.ConnectionWaiting);
                    }

                    // Update connection status
                    set({ connectionStatus: 'disconnected' });

                    // If we've exceeded max retries, fail the prompt
                    if ((prompt.connectionRetries ?? 0) + 1 >= MAX_CONNECTION_RETRIES) {
                        get().updatePrompt(promptId, {
                            status: InferencePromptStatus.Error,
                            errorMessage: `Connection failed after ${MAX_CONNECTION_RETRIES} attempts: ${error.message}`
                        });

                        if (prompt.updateStatusFn) {
                            prompt.updateStatusFn(InferencePromptStatus.Error);
                        }
                    }
                }
                else {
                    // Handle other errors
                    get().updatePrompt(promptId, {
                        status: InferencePromptStatus.Error,
                        errorMessage: error instanceof Error ? error.message : String(error)
                    });

                    if (prompt.updateStatusFn) {
                        prompt.updateStatusFn(InferencePromptStatus.Error);
                    }
                }
            } finally {
                // Clean up the abort controller
                abortControllers.delete(promptId);

                // Decrement executing counter
                set((state) => ({ currentlyExecuting: state.currentlyExecuting - 1 }));

                // Process the next prompt, but ensure it's done in a synchronized way
                processNextPromptsSafely();
            }
        }
    })
);

/**
 * Safely process the next prompts in the queue to prevent race conditions
 */
function processNextPromptsSafely() {
    // If we're already processing, don't start another processing cycle
    if (isProcessingQueue) {
        return;
    }

    // Set the flag to indicate we're processing
    isProcessingQueue = true;

    try {
        const store = useInferenceStore.getState();

        // If execution is paused, don't process new prompts
        if (!store.isExecuting) {
            return;
        }

        // Check if we need to include connection-waiting prompts (if connection is back)
        if (store.connectionStatus === 'connected') {
            // Move any connection-waiting prompts back to pending
            store.prompts.forEach(p => {
                if (p.status === InferencePromptStatus.ConnectionWaiting) {
                    store.updatePrompt(p.id, {
                        status: InferencePromptStatus.Pending,
                    });

                    if (p.updateStatusFn) {
                        p.updateStatusFn(InferencePromptStatus.Pending);
                    }
                }
            });
        }

        const pendingPrompts = store.prompts.filter(
            (p) => p.status === InferencePromptStatus.Pending
        );

        // Log current execution state for debugging
        logger.info(`Processing queue: ${pendingPrompts.length} pending prompts, ${store.currentlyExecuting} currently executing`);

        if (pendingPrompts.length > 0) {
            // Check if we can start another prompt based on the concurrency limit
            if (store.currentlyExecuting < 2) {
                // Execute the next highest priority prompt
                const nextPrompt = pendingPrompts[0]; // Already ordered by priority
                if (nextPrompt) {
                    logger.info(`Starting prompt execution: ${nextPrompt.id} (primary)`);
                    void store.executePrompt(nextPrompt.id);
                }

                // If we have enough capacity and the next prompt allows concurrency, execute it too
                // This check needs to happen AFTER the first prompt has started execution
                // to make sure we have correct currentlyExecuting count
                if (store.currentlyExecuting < 2 && pendingPrompts.length > 1) {
                    const secondNextPrompt = pendingPrompts[1];
                    // Explicitly check the concurrency flag is true (not just truthy)
                    if (secondNextPrompt && secondNextPrompt.concurrency === true) {
                        logger.info(`Starting concurrent prompt execution: ${secondNextPrompt.id} (secondary, concurrency=${secondNextPrompt.concurrency})`);
                        void store.executePrompt(secondNextPrompt.id);
                    } else if (secondNextPrompt) {
                        logger.info(`Skipping concurrent execution for prompt: ${secondNextPrompt.id} (concurrency=${secondNextPrompt.concurrency})`);
                    }
                }
            }
        } else if (store.currentlyExecuting === 0) {
            // Check if we have any connection-waiting prompts
            const waitingPrompts = store.prompts.filter(
                (p) => p.status === InferencePromptStatus.ConnectionWaiting
            );

            if (waitingPrompts.length === 0) {
                // No more pending or waiting prompts and nothing is executing
                store.clearStateWithReason(ClearStateReason.NoMorePendingPrompts);
            }
        }
    } finally {
        // Reset the flag regardless of whether the processing was successful
        isProcessingQueue = false;
    }
}

