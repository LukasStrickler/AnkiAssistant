import ollama
import json
import re
import os

# Load lecture notes from a markdown file
def load_notes():
    with open("models/mdFiles/basicsOfEconomics.md", "r") as file:
        return file.read()

# Load the rules for card creation
def load_rules():
    return """### Rules for Creating Cards
1. **Keep it Simple**: Your brain likes short and simple ideas...
2. **Focus on Single Ideas**: Each piece of knowledge should focus on just one concept...
... (your rules remain unchanged)
"""

# Load existing tags
def load_existing_tags():
    if os.path.exists("models/tags.json"):
        with open("models/tags.json", "r") as file:
            try:
                return json.load(file)
            except json.JSONDecodeError:
                return set()
    return set()

# Save tags to file
def save_tags(tags):
    with open("models/tags.json", "w") as file:
        json.dump(list(tags), file, indent=4)

# Generate Outlines with Existing Tag Reference
def generate_outlines():
    notes = load_notes()
    rules = load_rules()
    existing_tags = set(load_existing_tags())  # Convert to set for fast lookup

    prompt = f"""
### Task:
You are tasked with **creating outlines** for flashcards based on the lecture notes provided. Each outline should contain:
- **Concept**: The main idea of the card.
- **Key Points**: A summary of what the card should explain.
- **Tags**: Relevant keywords for categorization. Prefer using **existing tags** from the following list if applicable: {', '.join(existing_tags)}

Follow these rules when creating the outlines:

{rules}

### Lecture Notes:
{notes}

### Output Format:
Return a JSON array where each object has:
- **"concept"**: The main idea.
- **"key_points"**: A summary (1-3 sentences).
- **"tags"**: A list of relevant tags.

Example:
[
    {{"concept": "What is data science?", "key_points": "Data science is the study of extracting knowledge from data...", "tags": ["data science", "machine learning"]}},
    {{"concept": "Steps of the data science process", "key_points": "The process includes data collection, cleaning, analysis...", "tags": ["data process", "workflow"]}}
]

Now, generate the outlines:
"""
    outlines_json = ""
    stream = ollama.chat(
        model="deepseek-r1:7b",
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )
    for response in stream:
        outlines_json += response["message"]["content"]

    # Extract JSON array using regex
    json_match = re.search(r'\[\s*{.*?}\s*\]', outlines_json, re.DOTALL)
    if json_match:
        try:
            outlines = json.loads(json_match.group(0))  # Validate and load JSON

            # Update tag storage
            new_tags = set(tag for outline in outlines for tag in outline["tags"])
            all_tags = existing_tags.union(new_tags)  # Merge old and new tags
            save_tags(all_tags)  # Save updated tag list

            with open("models/card_outlines.json", "w") as json_file:
                json.dump(outlines, json_file, indent=4)
            print("Outlines successfully saved to 'card_outlines.json'.")
            return outlines
        except json.JSONDecodeError:
            print("Error: Extracted text could not be parsed as JSON.")
            return []
    else:
        print("Error: No valid JSON structure found in the model's output.")
        return []

# Generate Full Flashcards
def generate_cards_from_outlines(outlines):
    full_cards = []
    for outline in outlines:
        concept = outline["concept"]
        key_points = outline["key_points"]
        tags = ", ".join(outline["tags"])

        prompt = f"""
### Task:
Generate a **flashcard** based on the following outline. Follow the formatting rules and language guidelines.

**Concept**: {concept}
**Key Points**: {key_points}
**Tags**: {tags}

### Output Format:
Return a JSON object with:
- **"front"**: A question or term related to the concept.
- **"back"**: A detailed explanation.
- **"tags"**: The same list of tags.

Example:
{{
    "front": "What is data science?",
    "back": "Data science is the study of extracting insights from data using statistics, algorithms, and machine learning.",
    "tags": ["data science", "machine learning"]
}}

Now, generate the card:
"""
        card_json = ""
        stream = ollama.chat(
            model="deepseek-r1:7b",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )
        for response in stream:
            card_json += response["message"]["content"]

        # Extract JSON object using regex
        json_match = re.search(r'{\s*"front".*?}', card_json, re.DOTALL)
        if json_match:
            try:
                card = json.loads(json_match.group(0))  # Validate and load JSON
                full_cards.append(card)
            except json.JSONDecodeError:
                print(f"Error: Could not parse JSON for concept '{concept}'.")
    
    # Save final flashcards
    with open("models/cards.json", "w") as json_file:
        json.dump(full_cards, json_file, indent=4)
    print("Final flashcards successfully saved to 'cards.json'.")

# Run the pipeline
if __name__ == "__main__":
    outlines = generate_outlines()
    if outlines:
        generate_cards_from_outlines(outlines)

