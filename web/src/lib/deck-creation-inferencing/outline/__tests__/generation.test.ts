import { describe, it, expect, vi } from 'vitest';
import { parsePartialOutline } from '../generation';
import { OutlineItem } from '@/components/dialogs/deck-creation/types';

type TestCase = {
    value: string;
    expectedLength: number;
    expectedItemsWithMissingJsonFieldsLength: number;
    expectedItem0?: OutlineItem;
    expectedItem1?: OutlineItem;
}

const basicOutlineItem = {
    id: 1,
    concept: "test",
    key_points: "test",
    deck: "Test::Test",
    card_type: "Q&A",
    status: "outline-review",
}

// -----------
// Possible LLM Outputs
// -----------

const partialStream_0Items_TextNone = `
[
    {
        "concept": "test",
        "key_points": "test",
`
const test1 = {
    value: partialStream_0Items_TextNone,
    expectedLength: 0,
    expectedItemsWithMissingJsonFieldsLength: 0,
}

// -----------
const partialStream_0Items_TextPre = `
There are 0 items in the outline.
And Some text before the outline.

[
    {
        "concept": "test",
        "key_points": "test",
`
const test2 = {
    value: partialStream_0Items_TextPre,
    expectedLength: 0,
    expectedItemsWithMissingJsonFieldsLength: 0,
}

// -----------
const partialStream_1Item_TextNone = `
[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
`
const test3 = {
    value: partialStream_1Item_TextNone,
    expectedLength: 1,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
}

// -----------
const partialStream_1Item_TextPre = `
There are 1 items in the outline.
And Some text before the outline.

[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
`
const test4 = {
    value: partialStream_1Item_TextPre,
    expectedLength: 1,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
}

// -----------
const partialStream_2Item_TextNone = `
[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
`
const test5 = {
    value: partialStream_2Item_TextNone,
    expectedLength: 2,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
    expectedItem1: { ...basicOutlineItem, id: 2 },
}

// -----------
const partialStream_2Item_TextPre = `
There are 2 items in the outline.
And Some text before the outline.

[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
`
const test6 = {
    value: partialStream_2Item_TextPre,
    expectedLength: 2,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
    expectedItem1: { ...basicOutlineItem, id: 2 },

}

// -----------
const fullStream_0Items_TextOnly = `
There are 0 items in the outline.
As there is no item, the outline is empty.
`
const test7 = {
    value: fullStream_0Items_TextOnly,
    expectedLength: 0,
    expectedItemsWithMissingJsonFieldsLength: 0,
}

// -----------
const fullStream_1Item_TextNone = `
[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
]
`
const test8 = {
    value: fullStream_1Item_TextNone,
    expectedLength: 1,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
}

// -----------
const fullStream_2Item_TextNone = `
[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
]
`

const test9 = {
    value: fullStream_2Item_TextNone,
    expectedLength: 2,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
    expectedItem1: { ...basicOutlineItem, id: 2 },
}

// -----------
const fullStream_2Items_TextPre = `
There are 2 items in the outline.
And Some text before the outline.

[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
]
`
const test10 = {
    value: fullStream_2Items_TextPre,
    expectedLength: 2,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
    expectedItem1: { ...basicOutlineItem, id: 2 },
}

// -----------  
const fullStream_2Items_TextPrePost = `
There are 2 items in the outline.
And Some text before the outline.

[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    }
]

And Some text after the outline.
That should be ignored.
`

const test11 = {
    value: fullStream_2Items_TextPrePost,
    expectedLength: 2,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
    expectedItem1: { ...basicOutlineItem, id: 2 },
}

// -----------
// Missing JSON Values
// -----------

const fullStream_0Items_1MissingJsonKey = `
[
    {
        "concept": "test",
        "key_points": "test",
    }
]
`
const test12 = {
    value: fullStream_0Items_1MissingJsonKey,
    expectedLength: 0,
    expectedItemsWithMissingJsonFieldsLength: 1,
}

// -----------
const fullStream_1Item_1MissingJsonKey = `
[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
    {
        "concept": "test",
        "key_points": "test",
        "card_type": "Q&A",
    }
]
`
const test13 = {
    value: fullStream_1Item_1MissingJsonKey,
    expectedLength: 1,
    expectedItemsWithMissingJsonFieldsLength: 1,
}

const fullStream_1Item_Thinking = `
<think>
    I am thinking about the outline.
    [
        {
            "concept": "test1",
            "key_points": "test",
            "deck": "Test::Test",
            "card_type": "Q&A",
        },
    ]
</think>
[
    {
        "concept": "test",
        "key_points": "test",
        "deck": "Test::Test",
        "card_type": "Q&A",
    },
]
`

const test14 = {
    value: fullStream_1Item_Thinking,
    expectedLength: 1,
    expectedItemsWithMissingJsonFieldsLength: 0,
    expectedItem0: basicOutlineItem,
}
// -----------

const fullStream_0Item_Thinking = `
<think>
    I am thinking about the outline.
    [
        {
            "concept": "test1",
            "key_points": "test",
            "deck": "Test::Test",
            "card_type": "Q&A",
        },
    ]
</think>
`

const test15 = {
    value: fullStream_0Item_Thinking,
    expectedLength: 0,
    expectedItemsWithMissingJsonFieldsLength: 0,
}
// -----------
// All Tests
// -----------

const allTests = [
    test1,
    test2,
    test3,
    test4,
    test5,
    test6,
    test7,
    test8,
    test9,
    test10,
    test11,
    test12,
    test13,
    test14,
    test15,
]

describe('Outline Parsing - Test Batch', () => {
    allTests.forEach((testCase, index) => {
        it(`should correctly handle test case ${index + 1}`, () => {
            try {
                const { result, ItemsWithMissingJsonFields } = parsePartialOutline(testCase.value);
                expect(result.length).toBe(testCase.expectedLength);
                expect(ItemsWithMissingJsonFields.length).toBe(testCase.expectedItemsWithMissingJsonFieldsLength);
                if ((testCase as TestCase).expectedItem0) {
                    expect(result[0]).toEqual((testCase as TestCase).expectedItem0);
                }
                if ((testCase as TestCase).expectedItem1) {
                    expect(result[1]).toEqual((testCase as TestCase).expectedItem1);
                }
            } catch (error) {
                const errorDetails = {
                    testIndex: index + 1,
                    testInput: testCase.value.substring(0, 100) + (testCase.value.length > 100 ? '...' : ''),
                    expectedLength: testCase.expectedLength,
                    expectedItemsWithMissingJsonFieldsLength: testCase.expectedItemsWithMissingJsonFieldsLength
                };
                throw new Error(`Test case ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}\nTest details: ${JSON.stringify(errorDetails, null, 2)}`);
            }
        });
    });
});
