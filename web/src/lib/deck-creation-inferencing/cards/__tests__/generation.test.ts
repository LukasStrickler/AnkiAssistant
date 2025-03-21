import { describe, it, expect } from 'vitest';
import { parseCardResult } from '../generation';

const validCard = {
    front: "Why and how is data cleaning important in data analysis?",
    back: "> Data cleaning removes errors and inconsistencies, ensuring the accuracy of your analysis.\n\n**Importance**\n- Enables reliable insights"
};

describe('Card Generation Parsing', () => {
    // Test 1: Valid JSON format
    it('should parse valid JSON format correctly', () => {
        const input = JSON.stringify({
            front: validCard.front,
            back: validCard.back
        });
        const result = parseCardResult(input);
        expect(result).toEqual(validCard);
    });

    // Test 2: Valid JSON with think tags
    it('should parse JSON within think tags', () => {
        const input = `<think>Some thinking process</think>
        ${JSON.stringify({
            front: validCard.front,
            back: validCard.back
        })}`;
        const result = parseCardResult(input);
        expect(result).toEqual(validCard);
    });

    // Test 3: JSON with escaped quotes
    it('should handle escaped quotes correctly', () => {
        const input = `{
            "front": "What is a \\"quoted\\" term?",
            "back": "It's a term in \\"quotation marks\\""
        }`;
        const expected = {
            front: 'What is a "quoted" term?',
            back: 'It\'s a term in "quotation marks"'
        };
        const result = parseCardResult(input);
        expect(result).toEqual(expected);
    });

    // Test 4: JSON with newlines
    it('should handle newlines in content', () => {
        const input = `{
            "front": "Line 1\\nLine 2",
            "back": "Answer 1\\nAnswer 2"
        }`;
        const expected = {
            front: 'Line 1\nLine 2',
            back: 'Answer 1\nAnswer 2'
        };
        const result = parseCardResult(input);
        expect(result).toEqual(expected);
    });

    // Test 5: Invalid JSON format
    it('should return original string for invalid JSON', () => {
        const input = `Invalid JSON content`;
        const result = parseCardResult(input);
        expect(result).toBe(input);
    });

    // Test 6: Missing required fields
    it('should return original string when missing required fields', () => {
        const input = `{"front": "Question only"}`;
        const result = parseCardResult(input);
        expect(result).toBe(input);
    });

    // Test 7: Empty content
    it('should return original string for empty content', () => {
        const input = `{"front": "", "back": ""}`;
        const result = parseCardResult(input);
        expect(result).toBe(input);
    });

    // Test 8: Complex markdown content
    it('should handle complex markdown content', () => {
        const input = `{
            "front": "# Question\\n- Point 1\\n- Point 2",
            "back": "**Bold** and *italic*\\n1. First\\n2. Second"
        }`;
        const expected = {
            front: '# Question\n- Point 1\n- Point 2',
            back: '**Bold** and *italic*\n1. First\n2. Second'
        };
        const result = parseCardResult(input);
        expect(result).toEqual(expected);
    });
});





// {
//     "front": "Why and how is data cleaning important in data analysis?",
//     "back": "> Data cleaning removes errors and inconsistencies, ensuring the accuracy of your analysis.

// **Importance**
// - Enables reliable insights: Clean data supports informed decision making.
// - Prevents bias: Errors can skew results, leading to inaccurate conclusions.

// **Process**
// 1. **Identify errors**: Look for missing or inconsistent values, outliers, or typos.
// 2. **Handle errors**: Fill in missing data appropriately (imputation), remove outliers, or correct typos.
// 3. **Validate results**: Check that your corrections haven't introduced new errors or inconsistencies.

// **Example**: Consider a dataset where the age of customers is recorded. If you notice that all ages are multiples of 5, it could indicate an error in data collection or entry (e.g., rounding to the nearest multiple of 5). Correct this issue by adjusting the ages to realistic values.
// }