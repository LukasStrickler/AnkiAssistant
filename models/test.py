import ollama
import json
import re
import os
import datetime

# Load lecture notes from a markdown file
def load_notes(file_path="models/mdFiles/basicsOfEconomics.md"):
    try:
        with open(file_path, "r") as file:
            return file.read()
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return ""

# Load the rules for card creation
def load_rules():
    return """### Rules for Creating Cards
1.  **Keep it Concise**: The front and back of the cards should be as short as possible.
2.  **Single Idea Focus**: Each card should focus on a single, well-defined concept.
3.  **Clarity is Key**: Ensure the information is clear and easy to understand.
4.  **Positive Phrasing**: Use positive language.
5.  **Use Existing Decks**: Prioritize existing decks.
6.  **Make Connections**: Link new ideas to existing knowledge.
7.  **Front Length**: The front of the card (question/term) should be very brief (1-5 words).
8.  **Back Length**: The back of the card (explanation) should be concise (1-3 sentences).
9.  **Be Specific**: Avoid vague or general statements.
10. **Use Examples Sparingly**: Only include examples if they significantly clarify the concept.
11. **Markdown Formatting**: Use markdown for the back of the card.
"""

# Load existing decks
def load_existing_decks(file_path="models/decks.json"):
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            try:
                return json.load(file)
            except json.JSONDecodeError:
                print("Error: Could not decode decks.json.  Returning empty list.")
                return []
    return []

# Save decks to file
def save_decks(decks, file_path="models/decks.json"):
    with open(file_path, "w") as file:
        json.dump(decks, file, indent=4)

# Generate Outlines with Existing Tag Reference
def generate_outlines(existing_decks):
    notes = load_notes()
    rules = load_rules()

    # Prepare the prompt
    prompt = f"""
### Task:
You are tasked with creating outlines for flashcards based on the lecture notes provided. Each outline should contain:
-   **Concept**: The main idea of the card.
-   **Key Points**: A summary of what the card should explain.
-   **Deck**: The deck the card should belong to. Use existing decks if possible, otherwise create a new one.
    Existing decks are: {', '.join(existing_decks) or "None"}

Follow these rules when creating the outlines:

{rules}

### Lecture Notes:
{notes}

### Output Format:
Return a JSON array where each object has:
-   "concept": The main idea (1-5 words).
-   "key_points": A summary (1-3 sentences).
-   "deck": The deck the card should belong to.
Example:
[
    {{"concept": "What is data science?", "key_points": "Data science is the study of extracting knowledge from data...", "deck": "UNI::Sem5::Data Science::Einführung"}},
    {{"concept": "Steps of the data science process", "key_points": "The process includes data collection, cleaning, analysis...", "deck": "UNI::Sem5::Data Science::Einführung::Workflow"}}
]

Now, generate the outlines:
"""
    outlines_json = ""
    stream = ollama.chat(
        model="deepseek-r1:7b",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for response in stream:
        outlines_json += response["message"]["content"]

    # Extract JSON array using regex
    json_match = re.search(r"\[\s*{\s*\"concept\".*?}\s*\]", outlines_json, re.DOTALL)
    if json_match:
        try:
            outlines = json.loads(json_match.group(0))
            return outlines
        except json.JSONDecodeError:
            print("Error: Could not decode JSON from the model's output.")
            print(f"Output was: {outlines_json}")
            return []
    else:
        print("Error: No valid JSON structure found in the model's output.")
        print(f"Output was: {outlines_json}")
        return []

# Generate Full Flashcards
def generate_cards_from_outlines(outlines):
    full_cards = []
    rules = load_rules()
    for outline in outlines:
        concept = outline["concept"]
        key_points = outline["key_points"]
        deck = outline["deck"]

        prompt = f"""
### Task:
Generate a flashcard based on the following outline. Follow the formatting rules and language guidelines.

**Concept**: {concept}
**Key Points**: {key_points}
**Deck**: {deck}

### Output Format:
Return a JSON object with:
-   "front": A question or term related to the concept (1-5 words).
-   "back": A detailed explanation using markdown formatting (1-3 sentences).
-   "deck": The deck the card should belong to.

Example:
{{
    "front": "What is data science?",
    "back": "Data science is the study of extracting insights from data using statistics, algorithms, and machine learning.",
    "deck": "UNI::Sem5::Data Science::Einführung"
}}

Follow these rules when creating the card:

{rules}

Now, generate the card:
"""
        card_json = ""
        stream = ollama.chat(
            model="deepseek-r1:1.5b",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        for response in stream:
            card_json += response["message"]["content"]

        # Extract JSON object using regex
        json_match = re.search(r"{\s*\"front\".*?}", card_json, re.DOTALL)
        if json_match:
            try:
                card = json.loads(json_match.group(0))
                card["deck"] = deck  # Ensure the deck is included
                full_cards.append(card)
            except json.JSONDecodeError:
                print(f"Error: Could not parse JSON for concept '{concept}'.")
                print(f"Output was: {card_json}")
    return full_cards

# Run the pipeline
if __name__ == "__main__":
    # Create a run folder with a timestamp
    run_timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_folder = os.path.join("models/runs", run_timestamp)
    os.makedirs(run_folder, exist_ok=True)

    # Load existing decks
    existing_decks = load_existing_decks()

    # Generate outlines
    outlines = generate_outlines(existing_decks)

    if outlines:
        # Save outlines to the run folder
        outlines_file_path = os.path.join(run_folder, "outlines.json")
        with open(outlines_file_path, "w") as json_file:
            json.dump(outlines, json_file, indent=4)
        print(f"Outlines successfully saved to '{outlines_file_path}'.")

        # Generate flashcards
        flashcards = generate_cards_from_outlines(outlines)

        # Save flashcards to the run folder
        cards_file_path = os.path.join(run_folder, "cards.json")
        with open(cards_file_path, "w") as json_file:
            json.dump(flashcards, json_file, indent=4)
        print(f"Final flashcards successfully saved to '{cards_file_path}'.")

        # Extract and save new decks
        new_decks = set(card["deck"] for card in flashcards)
        all_decks = list(set(existing_decks + list(new_decks)))
        save_decks(all_decks)
        print("Decks updated and saved to 'decks.json'.")
