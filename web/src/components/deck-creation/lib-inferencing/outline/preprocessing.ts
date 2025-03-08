// return true / false from a func to check for "valid" input
export function isValidInput(input: string) {
    const greaterThanZero = input.length > 0;
    const smallerThanMax = input.length < 1000;

    return greaterThanZero && smallerThanMax;
}

export function preprocessInput(input: string) {
    // TODO: chunk / split input into chunks of 1000 characters
    const cleanedInput = input.trim();
    const lowerCasedInput = cleanedInput.toLowerCase();
    return lowerCasedInput;
}