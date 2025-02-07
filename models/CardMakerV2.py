import ollama
import json
import re

# Load lecture notes from a markdown file
def load_notes():
    with open("models/mdFiles/01.md", "r") as file:
        return file.read()

# Load the rules for card creation
def load_rules():
    return """### Rules for Creating Cards
1. **Keep it Simple**: Your brain likes short and simple ideas. If something is too long or complex, split it into smaller parts.
2. **Focus on Single Ideas**: Each piece of knowledge should focus on just one concept. Don’t try to learn multiple things at once; it can get confusing.
3. **Clarity is Key**: Make sure your information is clear and straightforward. Ambiguity makes it harder to remember.
4. **Use Positive Phrasing**: Frame your knowledge in positive terms. Instead of saying, “Don’t forget to review,” say, “Remember to review.”
5. **Make Connections**: Link new ideas to things you already know. Building associations helps your brain understand and recall information better.
6. **Be Specific**: Vague or general knowledge is hard to retain. The more specific you are, the better.
7. **Avoid Memorizing Isolated Facts**: Facts are easier to remember when they’re part of a bigger story or context. Avoid rote memorization.
8. **Use Examples**: Examples make abstract concepts concrete. If you’re learning a rule or principle, find examples to illustrate it.
9. **Highlight Contrasts**: Understanding differences between concepts helps you remember them more clearly. Compare and contrast related ideas.
10. **Avoid Interference**: Avoid learning similar things at the same time, as they can blur together. Focus on one topic before moving to another.
11. **Simplify and Streamline**: Complex explanations can overwhelm you. Always aim to simplify your knowledge without losing its essence.
12. **Use Active Forms**: Frame your learning actively, not passively. For example, ask, “How does this work?” instead of “What is this?”
13. **Be Consistent**: Stick to a consistent way of organizing your knowledge. This helps your brain recognize patterns and recall faster.
14. **Ask Why, How, and What If**: Go beyond surface-level learning by questioning the material. This deepens your understanding and retention.
"""

# Recursive function to generate cards for each section
def create_cards_for_section(section_title, section_content, rules):
    formatted_prompt = f"""
### Task:
You are tasked with creating flashcards based on the lecture notes provided and use the language of the notes. Follow these rules for card creation:

{rules}

### Section Title:
{section_title}

### Section Content:
{section_content}

### Output Format:
Return the flashcards in a JSON array format where each card has:
- A "front" field containing a question, term, or concept to prompt the user.
- A "back" field containing the corresponding explanation, answer, or details.

Ensure:
1. Each card follows the rules provided.
2. The output is strictly in JSON format.
3. No additional text, just a JSON array of cards.

Now, generate the cards:
"""
    cards_json = ""
    stream = ollama.chat(
        model="deepseek-r1:7b",
        messages=[{"role": "user", "content": formatted_prompt}],
        stream=True
    )
    for response in stream:
        cards_json += response["message"]["content"]
    
    # Extract JSON array using a regex to ensure proper structure
    json_match = re.search(r'\[\s*{.*?}\s*\]', cards_json, re.DOTALL)
    if json_match:
        try:
            cards = json.loads(json_match.group(0))  # Validate and load JSON
            return cards
        except json.JSONDecodeError:
            print(f"Error: Could not parse JSON for section '{section_title}'.")
            return []
    else:
        print(f"Error: No valid JSON structure found for section '{section_title}'.")
        return []

# Process the notes by splitting into headers and subheaders
def process_notes(notes):
    sections = re.split(r'(?<=\n)#+ ', notes)  # Split by headers
    header_structure = {}
    current_header = None
    
    for section in sections:
        if section.strip().startswith("#"):
            level = len(section.split(" ")[0])  # Determine header level
            header = section.split("\n")[0].strip("# ").strip()
            content = "\n".join(section.split("\n")[1:])
            header_structure[header] = {"level": level, "content": content}
        else:
            if current_header:
                header_structure[current_header]["content"] += "\n" + section

    return header_structure

# Function to create cards following the rules based on lecture notes
def create_cards_from_notes():
    notes = load_notes()
    rules = load_rules()
    sections = process_notes(notes)
    all_cards = []

    for header, details in sections.items():
        section_title = header
        section_content = details["content"]
        print(f"Processing section: {section_title}")
        cards = create_cards_for_section(section_title, section_content, rules)
        all_cards.extend(cards)

    with open("models/cards.json", "w") as json_file:
        for card in all_cards:
            card["front"] = card["front"].replace("\n", " ")
            card["back"] = card["back"].replace("\n", " ")
        json.dump(all_cards, json_file, indent=4)
    print("Flashcards successfully saved to 'cards.json'.")

# Example Usage
if __name__ == "__main__":
    create_cards_from_notes()
