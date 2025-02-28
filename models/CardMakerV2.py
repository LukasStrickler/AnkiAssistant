import ollama
import json
import re
import os
import datetime

outlineModel = "deepseek-r1:7b"
cardModel = "mistral:latest"

def load_notes(file_path="models/mdFiles/basicsOfEconomics.md"):
    try:
        with open(file_path, "r") as file:
            return file.read()
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return ""

def load_rules():
    return """### Rules for Creating Cards
1. **Keep it Simple**: Short and simple ideas are easier to remember.
2. **Focus on Single Ideas**: Each card should focus on one concept only.
3. **Be Specific**: Vague or general knowledge is harder to retain.
4. **Use Markdown**: Format the back of the card using markdown.
5. **Strictly One Card Per Concept**: Do NOT generate more than one card per concept.
"""

def load_existing_decks(file_path="models/decks.json"):
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            try:
                return json.load(file)
            except json.JSONDecodeError:
                print("Error: Could not decode decks.json. Returning empty list.")
                return []
    return []

def save_decks(decks, file_path="models/decks.json"):
    with open(file_path, "w") as file:
        json.dump(decks, file, indent=4)

def generate_outlines(existing_decks):
    notes = load_notes()
    rules = load_rules()
    
    prompt = f"""
### Task:
Generate outlines for flashcards based on the lecture notes provided.
Each outline should contain one concept only. Existing decks: {', '.join(existing_decks) or 'None'}.

{rules}

### Lecture Notes:
{notes}

### Output Format:
Return a JSON array:
[
    {{"concept": "Example Concept", "key_points": "Brief explanation.", "deck": "Some Deck"}}
]
"""
    outlines_json = ""
    stream = ollama.chat(
        model=outlineModel,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for response in stream:
        outlines_json += response["message"]["content"]
    
    json_match = re.search(r"\[\s*{.*?}\s*\]", outlines_json, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            print("Error: Could not decode JSON from the model's output.")
    return []

def generate_cards_from_outlines(outlines):
    full_cards = []
    rules = load_rules()
    
    for outline in outlines:
        concept, key_points, deck = outline["concept"], outline["key_points"], outline["deck"]
        
        prompt = f"""
### Task:
Generate EXACTLY ONE flashcard. DO NOT generate more than one.

**Concept**: {concept}
**Key Points**: {key_points}
**Deck**: {deck}

### Output Format:
Return a JSON object:
{{
    "front": "Question or term",
    "back": "Markdown explanation",
    "deck": "{deck}"
}}

{rules}
"""
        
        card_json = ""
        stream = ollama.chat(
            model=cardModel,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            options={"temperature": 0.2}
        )
        for response in stream:
            card_json += response["message"]["content"]
        
        print(f"Raw output for '{concept}': {card_json}")
        
        json_matches = re.findall(r"{\s*\"front\".*?}", card_json, re.DOTALL)
        if json_matches:
            try:
                first_card = json.loads(json_matches[0])
                first_card["deck"] = deck
                full_cards.append(first_card)
            except json.JSONDecodeError:
                print(f"Error: Could not parse JSON for concept '{concept}'.")
    return full_cards

if __name__ == "__main__":
    run_timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_folder = os.path.join("models/runs", run_timestamp)
    os.makedirs(run_folder, exist_ok=True)
    
    existing_decks = load_existing_decks()
    outlines = generate_outlines(existing_decks)
    
    if outlines:
        outlines_file_path = os.path.join(run_folder, "outlines.json")
        with open(outlines_file_path, "w") as json_file:
            json.dump(outlines, json_file, indent=4)
        print(f"Outlines saved to '{outlines_file_path}'")
        
        flashcards = generate_cards_from_outlines(outlines)
        
        cards_file_path = os.path.join(run_folder, "cards.json")
        with open(cards_file_path, "w") as json_file:
            json.dump(flashcards, json_file, indent=4)
        print(f"Flashcards saved to '{cards_file_path}'")
        
        new_decks = {card["deck"] for card in flashcards}
        all_decks = list(set(existing_decks + list(new_decks)))
        save_decks(all_decks)
        print("Decks updated and saved.")