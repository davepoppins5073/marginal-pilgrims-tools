import os
import re

INPUT_DIR = os.path.expanduser("~/Desktop/substack_txt/french_posts")
OUTPUT_DIR = os.path.expanduser("~/Desktop/manuscript_fr")
os.makedirs(OUTPUT_DIR, exist_ok=True)

ENGAGEMENT_BAIT = [
    r"drop your thoughts.*",
    r"leave a comment.*",
    r"subscribe.*free.*",
    r"hit subscribe.*",
    r"call me davestradamus.*",
    r"reader reflections.*",
    r"two questions.*",
    r"if you enjoyed.*",
    r"share this.*",
    r"forward this.*",
    r"paid subscribers.*",
    r"free subscribers.*",
    r"subscribe below.*",
    r"join the.*community.*",
    r"click.*subscribe.*",
    r"abonnez-vous.*",
    r"partagez.*",
    r"laissez un commentaire.*",
    r"si vous avez aimé.*",
    r"si cet essai.*",
    r"pour aller plus loin.*",
    r"à la semaine.*",
    r"à bientôt.*",
    r"restez.*marginal.*",
]

DATEDNESS_FLAGS = [
    "this week",
    "right now",
    "as i write this",
    "today i",
    "yesterday",
    "last week",
    "this month",
    "at the time of writing",
    "cette semaine",
    "en ce moment",
    "aujourd'hui",
    "hier",
    "la semaine dernière",
    "ce mois-ci",
    "au moment où j'écris",
    "alors que j'écris",
    "en ce moment même",
]

def clean_post(text):
    lines = text.split('\n')
    cleaned = []
    flags = []

    for i, line in enumerate(lines):
        lower = line.lower().strip()

        skip = False
        for pattern in ENGAGEMENT_BAIT:
            if re.search(pattern, lower):
                skip = True
                break
        if skip:
            continue

        for phrase in DATEDNESS_FLAGS:
            if phrase in lower:
                flags.append(f"Line {i+1}: '{line.strip()}'")

        cleaned.append(line)

    while cleaned and not cleaned[-1].strip():
        cleaned.pop()

    return '\n'.join(cleaned), flags

def process_folder(input_dir, output_dir):
    files = sorted([f for f in os.listdir(input_dir) if f.endswith('.txt')])
    print(f"Found {len(files)} files\n")

    all_flags = {}

    for filename in files:
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)

        with open(input_path, 'r', encoding='utf-8') as f:
            text = f.read()

        cleaned, flags = clean_post(text)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(cleaned)

        if flags:
            all_flags[filename] = flags

        print(f"✓ {filename}")

    report_path = os.path.join(output_dir, "_flags_report.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("DATEDNESS FLAGS — Review Before Manuscript Assembly\n")
        f.write("=" * 50 + "\n\n")
        for fname, flist in all_flags.items():
            f.write(f"\n{fname}\n")
            for flag in flist:
                f.write(f"  → {flag}\n")

    print(f"\nDone. Clean files in: {output_dir}")
    print(f"Flags report: {report_path}")

process_folder(INPUT_DIR, OUTPUT_DIR)
