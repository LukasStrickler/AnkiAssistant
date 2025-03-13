import { useState, useCallback } from 'react';
import type { LoadingStateConfig, LoadingStateItem } from '@/components/deck-creation-old/steps/types';

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


    // Add a sequence of states after a specific state
    const addStateSequence = useCallback((states: LoadingStateItem[], afterStateId?: string) => {
        setConfig((prevConfig) => {
            // Filter out any states that already exist
            const newStates = states.filter(
                newState => !prevConfig.items.some(item => item.id === newState.id)
            );

            if (newStates.length === 0) return prevConfig;

            let newItems;
            if (afterStateId) {
                const afterIndex = prevConfig.items.findIndex(item => item.id === afterStateId);
                if (afterIndex === -1) {
                    // If afterStateId doesn't exist, append to the end
                    newItems = [...prevConfig.items, ...newStates];
                } else {
                    // Insert after the specified state
                    newItems = [
                        ...prevConfig.items.slice(0, afterIndex + 1),
                        ...newStates,
                        ...prevConfig.items.slice(afterIndex + 1)
                    ];
                }
            } else {
                // Append to the end
                newItems = [...prevConfig.items, ...newStates];
            }

            return {
                ...prevConfig,
                items: newItems
            };
        });
    }, []);

    return {
        config,
        goToNextState,
        setCurrentState,
        updateStateParams,
        resetStates,
        addStateSequence
    };
} 