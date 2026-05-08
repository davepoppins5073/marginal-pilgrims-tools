import os

INPUT_DIR = os.path.expanduser("~/Desktop/manuscript_fr")
OUTPUT_FILE = os.path.expanduser("~/Desktop/THE_MARGINAL_CARNOT_draft.txt")

# Chapter order from Gantt chart
# Format: (post_id, chapter_title, part)
CHAPTERS = [
    # PROLOGUE
    ("175362087", "PROLOGUE — THE WASTE HEAT\nComa Dreams and Champagne Towers", "Prologue"),

    # PART I — THE ARCHITECTURE OF THE MIND
    ("178392433", "PART I — THE ARCHITECTURE OF THE MIND\n\nChapter 1 — An Intimacy Before Arrival\nPourquoi la France ne m'a jamais semblé étrangère", "Part I"),
    ("180269891", "Chapter 2 — The Philosophy of the Fiac\nCarnet Marginal No. 10 — Plongée dans le Fiac", "Part I"),

    # PART II — THE ALCHEMY OF THE FACADE
    ("177106927", "PART II — THE ALCHEMY OF THE FACADE\n\nChapter 3 — The Theology of Sweetness\nChez les Pèlerins: Bread of God", "Part II"),
    ("185505751", "Chapter 4 — The Maintenance of the Ordinary\nL'huile d'olive", "Part II"),
    ("181859457", "Chapter 5 — Transmuted Empire\nAbout la culture française [MERGE — see note]", "Part II"),

    # PART III — THE ENGINE STALLS
    ("193851071", "PART III — THE ENGINE STALLS\n\nChapter 6 — En attendant la France\n[Expand for The Sinister Old Man chapter]", "Part III"),
    ("175078736", "Chapter 7 — Panem et Circenses\nCarnets Marginaux — Morocco [MERGE with cosplay essays]", "Part III"),
    ("179316501", "Chapter 8 — The Carousel\nMémoire, République, et la giflerie cosmique [COMPRESS with other PM essays]", "Part III"),
    ("180476560", "Chapter 8b — The Carousel continued\nMémoire, République, et le Coup de Semonce Cosmique", "Part III"),
    ("181656653", "Chapter 8c — The Carousel continued\nPanem, Ordre, et Solutions de Dernier Recours", "Part III"),

    # PART IV — ENTROPY
    ("184754305", "PART IV — ENTROPY\n\nChapter 9 — The Maelström\nLa multipolarité n'est pas une faute morale", "Part IV"),
    ("196186007", "Chapter 10 — Acropolis Adieu\n[THE ENDING]", "Part IV"),
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

    output_lines.append("THE MARGINAL CARNOT")
    output_lines.append("Thermodynamics of an Empire in Decay")
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
    output_lines.append("- Remove all engagement bait before submission")
    output_lines.append("- Kill the blogger voice throughout")
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
            output_lines.append("[CHECK: file may need to be added to manuscript_fr folder]")
            missing.append(f"✗ {post_id} — {chapter_header.split(chr(10))[0]}")

        output_lines.append(SEPARATOR.strip())

    # Write output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print(f"\nManuscript assembled: {OUTPUT_FILE}")
    print(f"\nFound ({len(found)}):")
    for item in found:
        print(f"  {item}")

    if missing:
        print(f"\nMissing ({len(missing)}) — add to manuscript_fr folder:")
        for item in missing:
            print(f"  {item}")

    print(f"\nTotal word estimate: checking...")
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        words = len(f.read().split())
    print(f"~{words:,} words in draft manuscript")

assemble()
