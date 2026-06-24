import json
with open('/Users/praty/Desktop/StudentJob/playspace/copa-mobile/assets/bundled-instrument.json', 'r') as f:
    data = json.load(f)
for s_idx, section in enumerate(data['sections']):
    if 'notes_prompt' in section:
        print(f"Section {s_idx+1} ({section['section_key']}) has notes_prompt")
    for q_idx, q in enumerate(section['questions']):
        if 'notes_prompt' in q:
            print(f"  Question {q['question_key']} has notes_prompt: {q['notes_prompt']}")
