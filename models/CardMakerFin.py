import ollama
import json
import re
import os
import datetime

outlineModel = "deepseek-r1:14b"
cardModel = "mistral:latest"

def load_notes(file_path="models/mdFiles/introToML.md"):
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
6. **Card Type**: Each card must have a type. Examples: 'Q&A', 'Explain Yourself', 'Enumeration', 'Fill in the Blank', 'True or False', 'Comparison', 'Definition'.
7. **Deck Naming Format**: Deck names should follow this structure: `Uni::Sem 5::Economics::Basics::Concept Name`.
8. Always use a single string for all the keys in the json object
"""

def load_json_example():
    return """
[
    {{
        "concept": "Introduction to Economics",
        "key_points": "Economics studies how individuals, businesses, and governments allocate resources.",
        "deck": "Uni::Sem 5::Economics::Basics::Introduction to Economics",
        "card_type": "Q&A"
    }},
    {{
        "concept": "Law of Supply and Demand",
        "key_points": "The price of a good is determined by its supply and demand in the market.",
        "deck": "Uni::Sem 5::Economics::Basics::Law of Supply and Demand",
        "card_type": "Explain Yourself"
    }},
    {{
        "concept": "Types of Market Structures",
        "key_points": "Markets can be classified into four structures: Perfect Competition, Monopoly, Oligopoly, and Monopolistic Competition.",
        "deck": "Uni::Sem 5::Economics::Basics::Market Structures",
        "card_type": "Enumeration"
    }},
    {{
        "concept": "Inflation Definition",
        "key_points": "Inflation is the rate at which the general level of prices for goods and services rises.",
        "deck": "Uni::Sem 5::Economics::Basics::Inflation",
        "card_type": "Definition"
    }},
    {{
        "concept": "The ____ is the Powerhouse of the Cell",
        "key_points": "Mitochondria",
        "deck": "Uni::Sem 3::Biology::Cell Biology",
        "card_type": "Fill in the Blank"
    }},
    {{
        "concept": "A nested for loop has the runtime complexity of O(n^2)",
        key_points: "True",
        "deck": "Uni::Sem 2::Computer Science::Algorithms
        "card_type": "True or False"
    }},
    {{
        "concept": "Microeconomics vs. Macroeconomics",
        "key_points": "Microeconomics focuses on individual decision-making, while Macroeconomics deals with the economy as a whole.",
        "deck": "Uni::Sem 5::Economics::Basics::Micro vs Macro",
        "card_type": "Comparison"
    }}
]
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
Each outline should contain one concept only. Ensure the deck names follow the format: `Uni::Sem 5::Economics::Basics::Concept Name`.
Existing decks: {', '.join(existing_decks) or 'None'}.

{rules}

### Lecture Notes:
{notes}

### Output Format:
Return a JSON array like this:
{load_json_example()}
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
        # i want to print the model response 
        #print("\n\n")
        #print("Raw output for outlines: ", outlines_json)
        #print("\n\n")
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            print("Error: Could not decode JSON from the model's output.")
    return []

def generate_cards_from_outlines(outlines):
    full_cards = []
    rules = load_rules()
    
    for outline in outlines:
        concept, key_points, deck, card_type = outline["concept"], outline["key_points"], outline["deck"], outline["card_type"]
        
        def generate_card_with_prompt(prompt):
            card_json = ""
            stream = ollama.chat(
                model=cardModel,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                options={"temperature": 0.2}
            )
            for response in stream:
                card_json += response["message"]["content"]
            return card_json
        
        prompt = f"""
### Task:
You are the second model in the pipeline. You receive outlines for flashcards and need to generate the flashcards themselves.
Based on the outline provided, generate a flashcard with the concept and key points given. The heavy thinking has been done for you, so you just need to generate the card **exactly as specified**.
Generate EXACTLY ONE flashcard. DO NOT generate more than one.

**Concept**: {concept}
**Key Points**: {key_points}
**Deck**: {deck}
**Card Type**: {card_type}

### Output Format:
Return a JSON object:
{{
    "front": "Question or term",
    "back": "Answer or definition",
    "deck": "{deck}",
    "card_type": "{card_type}"
}}

{rules}
"""
        
        card_json = generate_card_with_prompt(prompt)
        json_matches = re.findall(r"{\s*\"front\".*?}", card_json, re.DOTALL)
        
        if not json_matches:
            print(f"Error: Could not parse JSON for '{concept}', retrying with simplified instructions.")
            
            simple_prompt = f"""
### Task:
Generate a simple flashcard based on the following details:

Concept: {concept}
Key Points: {key_points}
Deck: {deck}
Card Type: {card_type}

Return JSON format:
{{"front": "Question", "back": "Answer", "deck": "{deck}", "card_type": "{card_type}"}}
"""
            
            card_json = generate_card_with_prompt(simple_prompt)
            json_matches = re.findall(r"{\s*\"front\".*?}", card_json, re.DOTALL)
        
        if json_matches:
            try:
                first_card = json.loads(json_matches[0])
                first_card["deck"] = deck
                first_card["card_type"] = card_type
                full_cards.append(first_card)
            except json.JSONDecodeError:
                print(f"Error: Could not parse JSON for concept '{concept}' after retry.")
    
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