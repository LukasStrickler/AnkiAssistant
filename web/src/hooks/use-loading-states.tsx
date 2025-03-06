import { useState, useCallback } from 'react';
import { LoadingStateConfig, LoadingStateItem } from '../components/deck-creation/steps/types';

export function useLoadingStates(initialStates: LoadingStateItem[]) {
    const [config, setConfig] = useState<LoadingStateConfig>({
        items: initialStates,
        currentId: initialStates.length > 0 && initialStates[0] ? initialStates[0].id : null,
    });

    // Move to the next state
    const goToNextState = useCallback(() => {
        setConfig((prevConfig) => {
            if (!prevConfig.currentId) return prevConfig;

            const currentIndex = prevConfig.items.findIndex(item => item.id === prevConfig.currentId);
            if (currentIndex === -1 || currentIndex >= prevConfig.items.length - 1) {
                return prevConfig;
            }

            const nextItem = prevConfig.items[currentIndex + 1];
            return {
                ...prevConfig,
                currentId: nextItem?.id ?? null
            };
        });
    }, []);

    // Set a specific state by ID
    const setCurrentState = useCallback((stateId: string) => {
        setConfig((prevConfig) => {
            const stateExists = prevConfig.items.some(item => item.id === stateId);
            if (!stateExists) return prevConfig;

            return {
                ...prevConfig,
                currentId: stateId
            };
        });
    }, []);

    // Add a conditional state if needed
    const addConditionalState = useCallback((state: LoadingStateItem, afterStateId?: string) => {
        setConfig((prevConfig) => {
            // Check if the state already exists
            if (prevConfig.items.some(item => item.id === state.id)) {
                return prevConfig;
            }

            let newItems;
            if (afterStateId) {
                const afterIndex = prevConfig.items.findIndex(item => item.id === afterStateId);
                if (afterIndex === -1) {
                    // If afterStateId doesn't exist, append to the end
                    newItems = [...prevConfig.items, state];
                } else {
                    // Insert after the specified state
                    newItems = [
                        ...prevConfig.items.slice(0, afterIndex + 1),
                        state,
                        ...prevConfig.items.slice(afterIndex + 1)
                    ];
                }
            } else {
                // Append to the end
                newItems = [...prevConfig.items, state];
            }

            return {
                ...prevConfig,
                items: newItems
            };
        });
    }, []);

    // Remove a conditional state if it exists
    const removeConditionalState = useCallback((stateId: string) => {
        setConfig((prevConfig) => {
            const stateIndex = prevConfig.items.findIndex(item => item.id === stateId);

            // If the state doesn't exist, return the current config
            if (stateIndex === -1) return prevConfig;

            // If we're removing the current state, we need to update currentId
            let newCurrentId = prevConfig.currentId;
            if (prevConfig.currentId === stateId) {
                const nextItem = prevConfig.items[stateIndex + 1];
                const prevItem = stateIndex > 0 ? prevConfig.items[stateIndex - 1] : null;
                newCurrentId = nextItem ? nextItem.id : (prevItem ? prevItem.id : null);
            }

            return {
                currentId: newCurrentId,
                items: prevConfig.items.filter(item => item.id !== stateId)
            };
        });
    }, []);

    // Update replacement parameters for a specific state
    const updateStateParams = useCallback((stateId: string, params: Record<string, string | number>) => {
        setConfig((prevConfig) => {
            const newItems = prevConfig.items.map(item => {
                if (item.id === stateId) {
                    return {
                        ...item,
                        replacementParams: {
                            ...(item.replacementParams ?? {}),
                            ...params
                        }
                    };
                }
                return item;
            });

            return {
                ...prevConfig,
                items: newItems
            };
        });
    }, []);

    // Reset all states to initial
    const resetStates = useCallback((newInitialStates?: LoadingStateItem[]) => {
        const statesToUse = newInitialStates ?? initialStates;
        setConfig({
            items: statesToUse,
            currentId: statesToUse.length > 0 && statesToUse[0] ? statesToUse[0].id : null,
        });
    }, [initialStates]);

    return {
        config,
        goToNextState,
        setCurrentState,
        addConditionalState,
        removeConditionalState,
        updateStateParams,
        resetStates
    };
} 