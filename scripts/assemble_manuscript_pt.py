import os

INPUT_DIR = os.path.expanduser("~/Desktop/manuscript_pt")
OUTPUT_FILE = os.path.expanduser("~/Desktop/THE_GRAMMAR_OF_THE_CENTERLINE_draft.txt")

# Chapter order from Gantt chart
# Format: (post_id, chapter_title, part)
CHAPTERS = [
    # PART I — THE ARCHITECTURE OF THE FLESH
    ("176942958", "PART I — THE ARCHITECTURE OF THE FLESH\n\nChapter 1 — Bedpan Theology\nCatholic Guilt & Hot Nurses", "Part I"),
    ("179320369", "Chapter 2 — The Dissolved N\nNun Sugar, Iron Memories [EXPAND]", "Part I"),

    # PART II — THE THEORY OF STRANGERS
    ("180480615", "PART II — THE THEORY OF STRANGERS\n\nChapter 3 — Com Licença\nThe Theory of Strangers", "Part II"),
    ("180380923", "Chapter 4 — The Secret Life of Cara", "Part II"),
    ("190804106", "Chapter 5 — Sim, Mas\nCaderno Marginal — Sim, Mas [Lajes Field]", "Part II"),
    ("181435551", "Chapter 6 — Punctuation in the Strike\nCaderno Marginal — Lisboa em Greve [EXPAND]", "Part II"),
    ("177633149", "Chapter 7 — Cusco and the Inquisition\nPortugal Cooks With Memory, Not Ego [EXPAND]", "Part II"),

    # PART III — JOY AS TECHNOLOGY
    ("182754086", "PART III — JOY AS TECHNOLOGY\n\nChapter 8 — The Hinge of Saudade\nIf Saudade Was Born in Portugal, What Did It Become Elsewhere?", "Part III"),
    ("182684223", "Chapter 9 — Inherited Brazil\nBrazil Isn't Becoming Anything New", "Part III"),
    ("176693190", "Chapter 10 — The Gospel According to Perereca", "Part III"),
    ("186167855", "Chapter 11 — It's Not What You Think, Porra\n[MERGE with 186168593 — PT version]", "Part III"),

    # PART IV — THE SHAPESHIFTER
    ("180939074", "PART IV — THE SHAPESHIFTER\n\nChapter 12 — The Subjunctive of Hope\nThe Subjunctive of Wanting", "Part IV"),
    ("179681228", "Chapter 13 — Roots in Motion", "Part IV"),
    ("196381660", "Chapter 14 — O Boto\n[THE ENDING]", "Part IV"),
]

SEPARATOR = "\n\n" + ("=" * 60) + "\n\n"
CHAPTER_BREAK = "\n\n" + ("-" * 40) + "\n\n"

def find_file(post_id, directory):
    for filename in os.listdir(directory):
        if filename.startswith(post_id) and filename.endswith('.txt'):
            return os.path.join(directory, filename)
    return None

def assemble():
    output_lines = []

    output_lines.append("THE GRAMMAR OF THE CENTERLINE")
    output_lines.append("A Diasporic Phrasebook")
    output_lines.append("")
    output_lines.append("by Dave Paquiot")
    output_lines.append("")
    output_lines.append("DRAFT MANUSCRIPT — assembled from Substack corpus")
    output_lines.append("Generated: May 2026")
    output_lines.append("")
    output_lines.append("NOTE: This is a rough assembly draft.")
    output_lines.append("- [MERGE] = combine with indicated essays")
    output_lines.append("- [EXPAND] = needs new material")
    output_lines.append("- [WRITE NEW] = chapter not yet written")
    output_lines.append("- Steel Rulers & Blue Eyes = WRITE NEW (Part I opener)")
    output_lines.append("- Lusophone Africa chapter = WRITE NEW (missing third point)")
    output_lines.append("- Brazil scene = WRITE AFTER BRAZIL TRIP")
    output_lines.append("")
    output_lines.append(SEPARATOR.strip())

    missing = []
    found = []

    for post_id, chapter_header, part in CHAPTERS:
        filepath = find_file(post_id, INPUT_DIR)

        output_lines.append("")
        output_lines.append(chapter_header)
        output_lines.append(CHAPTER_BREAK.strip())

        if filepath:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            output_lines.append(content)
            found.append(f"✓ {post_id} — {chapter_header.split(chr(10))[0]}")
        else:
            output_lines.append(f"[FILE NOT FOUND — post_id: {post_id}]")
            output_lines.append("[CHECK: file may need to be added to manuscript_pt folder]")
            missing.append(f"✗ {post_id} — {chapter_header.split(chr(10))[0]}")

        output_lines.append(SEPARATOR.strip())

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print(f"\nManuscript assembled: {OUTPUT_FILE}")
    print(f"\nFound ({len(found)}):")
    for item in found:
        print(f"  {item}")

    if missing:
        print(f"\nMissing ({len(missing)}) — add to manuscript_pt folder:")
        for item in missing:
            print(f"  {item}")

    print(f"\nChecking word count...")
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        words = len(f.read().split())
    print(f"~{words:,} words in draft manuscript")

assemble()
