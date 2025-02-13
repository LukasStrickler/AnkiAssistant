import ollama
import json
import re
import os
import datetime

outlineModel = "deepseek-r1:7b"
cardModel = "tinyllama:latest"

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
1.  **Keep it Simple**: Your brain likes short and simple ideas. If something is too long or complex, split it into smaller parts.
2.  **Focus on Single Ideas**: Each piece of knowledge should focus on just one concept. Don’t try to learn multiple things at once; it can get confusing.
3.  **Clarity is Key**: Make sure your information is clear and straightforward. Ambiguity makes it harder to remember.
4.  **Use Positive Phrasing**: Frame your knowledge in positive terms. Instead of saying, “Don’t forget to review,” say, “Remember to review.”
5.  **Use Existing Decks**: Use existing decks whenever possible.
6.  **Make Connections**: Link new ideas to things you already know. Building associations helps your brain understand and recall information better.
7.  **Be Concise**: Keep the front and back of the cards concise.
8.  **Be Specific**: Vague or general knowledge is hard to retain. The more specific you are, the better.
9.  **Avoid Memorizing Isolated Facts**: Facts are easier to remember when they’re part of a bigger story or context. Avoid rote memorization.
10. **Use Examples**: Examples make abstract concepts concrete. If you’re learning a rule or principle, find examples to illustrate it.
11. **Highlight Contrasts**: Understanding differences between concepts helps you remember them more clearly. Compare and contrast related ideas.
12. **Avoid Interference**: Avoid learning similar things at the same time, as they can blur together. Focus on one topic before moving to another.
13. **Simplify and Streamline**: Complex explanations can overwhelm you. Always aim to simplify your knowledge without losing its essence.
14. **Use Active Forms**: Frame your learning actively, not passively. For example, ask, “How does this work?” instead of “What is this?”
15. **Be Consistent**: Stick to a consistent way of organizing your knowledge. This helps your brain recognize patterns and recall faster.
16. **Ask Why, How, and What If**: Go beyond surface-level learning by questioning the material. This deepens your understanding and retention.
17. **Use Markdown**: Use markdown formatting for the back of the card.
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
-   "concept": The main idea.
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
    json_match = re.search(r"\[\s*{.*?}\s*\]", outlines_json, re.DOTALL)
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
    rules = load_rules
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
-   "front": A question or term related to the concept.
-   "back": A detailed explanation using markdown formatting.
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
