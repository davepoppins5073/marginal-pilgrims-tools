# Substack Posts → TXT Pipeline Reference
*Created: May 7, 2026*

## What This Does
Converts exported Substack HTML posts into plain text files, then sorts them into language folders for NotebookLM notebooks and manuscript assembly.

---

## Step 1 — Convert HTML exports to TXT

```bash
cd ~/Desktop
mkdir substack_txt

for file in ~/Desktop/substack_csv/*.html; do
    filename=$(basename "$file" .html)
    pandoc "$file" -f html -t plain -o ~/Desktop/substack_txt/"$filename".txt
done
```

**Verify count:**
```bash
find ~/Desktop/substack_txt -type f | wc -l
```

**If new posts appear later, run incremental conversion (skips existing):**
```bash
for file in ~/Desktop/substack_csv/*.html; do
    filename=$(basename "$file" .html)
    if [ ! -f ~/Desktop/substack_txt/"$filename".txt ]; then
        echo "Converting: $filename"
        pandoc "$file" -f html -t plain -o ~/Desktop/substack_txt/"$filename".txt
    fi
done
```

---

## Step 2 — Create language folders

```bash
mkdir ~/Desktop/substack_txt/french_posts
mkdir ~/Desktop/substack_txt/portuguese_posts
```

---

## Step 3 — Copy French posts by post_id

Get post_ids from Supabase:
```sql
SELECT post_id, title FROM posts WHERE language = 'FR' ORDER BY date ASC;
```

Then copy (run from inside substack_txt folder):
```bash
cd ~/Desktop/substack_txt

for id in \
176774957 \
177106927 \
178392433 \
179316501 \
180269891 \
180476560 \
180576776 \
181120015 \
181495882 \
181859457 \
182064312 \
182158880 \
182225082 \
184413884 \
184409970 \
185048770 \
185273727 \
185505751 \
193851071 \
196186007
do
    if ! ls french_posts/${id}*.txt >/dev/null 2>&1; then
        cp ${id}*.txt french_posts/ 2>/dev/null
    fi
done
```

**Verify:**
```bash
find ~/Desktop/substack_txt/french_posts -type f | wc -l
# Should return ~30
```

---

## Step 4 — Copy Portuguese posts by post_id

Get post_ids from Supabase:
```sql
SELECT post_id, title FROM posts WHERE language = 'PT' ORDER BY date ASC;
```

Then copy:
```bash
cd ~/Desktop/substack_txt

for id in \
176088523 \
176119036 \
176198571 \
176374769 \
176693190 \
176847242 \
176942958 \
177633149 \
178843351 \
179320369 \
179681228 \
179789365 \
179995736 \
180087978 \
180302994 \
180380923 \
180480615 \
180581223 \
180939074 \
181020088 \
181435551 \
181965437 \
182400846 \
182754086 \
182684223 \
185327520 \
186167855 \
186168593 \
186390157 \
190804106 \
190809292 \
192163435 \
196381660
do
    if ! ls portuguese_posts/${id}*.txt >/dev/null 2>&1; then
        cp ${id}*.txt portuguese_posts/ 2>/dev/null
    fi
done
```

**Verify:**
```bash
find ~/Desktop/substack_txt/portuguese_posts -type f | wc -l
# Should return 33
```

---

## Step 5 — Create cluster folders (for the 6 thematic NotebookLM notebooks)

Query Supabase for each cluster:
```sql
SELECT p.post_id, p.title, t.name as cluster
FROM posts p
JOIN post_tags pt ON p.post_id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
ORDER BY t.name, p.date ASC;
```

Create folders and copy by cluster post_ids:
```bash
mkdir ~/Desktop/substack_txt/cluster_thermodynamics
mkdir ~/Desktop/substack_txt/cluster_belonging
mkdir ~/Desktop/substack_txt/cluster_linguistic_self
mkdir ~/Desktop/substack_txt/cluster_ethics_attention
mkdir ~/Desktop/substack_txt/cluster_archaeology_hunger
mkdir ~/Desktop/substack_txt/cluster_inheritance_grief
```

Then copy using the same post_id pattern as Steps 3 and 4.

---

## File Naming Convention

Files are named: `{post_id}.{slug}.txt`

Example: `196186007.acropolis-adieu-8a2.txt`

The post_id prefix allows matching back to Supabase for any query.

---

## NotebookLM Notebook Structure

| Notebook | Folder | Purpose |
|----------|--------|---------|
| 01 — Portuguese / Lusophone Book | portuguese_posts/ | Book curation — The Grammar of the Centerline |
| 02 — French Book | french_posts/ | Book curation — The Marginal Carnot |
| 03 — Thermodynamics of Power | cluster_thermodynamics/ | Thematic intelligence |
| 04 — Geography of Belonging | cluster_belonging/ | Thematic intelligence |
| 05 — Linguistic Self | cluster_linguistic_self/ | Thematic intelligence |
| 06 — Ethics of Attention | cluster_ethics_attention/ | Thematic intelligence |
| 07 — Archaeology of Hunger | cluster_archaeology_hunger/ | Thematic intelligence |
| 08 — Inheritance of Grief | cluster_inheritance_grief/ | Thematic intelligence |

---

## Key NotebookLM Prompts

### Prompt 1 — The Archivist
Evaluate corpus as rough manuscript. 10 questions covering central argument, recurring threads, emotional arc, strongest pieces, overlapping work, missing dimensions, what conventional books miss, what the book is actually about, and the key piece.

### Prompt 2 — The Hidden Structure
Identify recurring metaphors, local ideas that scale to obsessions, recurring tensions, hidden vocabulary, strengthening contradictions, civilization diagnosis, organization by hidden systems, defining metaphor, transitional essays, emerging writer type.

### Prompt 3 — The Narrator
Analyze the observing consciousness — narrator type, position relative to power, what they notice, emotional posture, formative experiences, instinctive distrusts, defended beauties, what they seek, literary traditions, what makes the voice distinct in 50 years.

### Prompt 4 — The Book Architect
Developmental editor pass — distinct books inside corpus, architecture of each, load-bearing texts, what to cut/merge, underdeveloped themes, missing scenes, abstraction overreliance, best organizational structure, sequence, openings/hinges/endings, target readers, brutal obstacles, what would elevate it, ultimate meaning, hypothetical table of contents.

---

## Results from May 7, 2026 Session

**Portuguese corpus finding:** The Grammar of the Centerline: A Diasporic Phrasebook. 15 chapters, 4 parts. Ends with O Boto. Governing metaphor: The Atlantic Centerline as ledger of transplantation.

**French corpus finding:** The Marginal Carnot: Thermodynamics of an Empire in Decay. 11 chapters, prologue + 4 parts. Ends with Acropolis Adieu. Governing metaphor: Carnot engine — civilization converts violence into culture until the fuel runs out.

**Key insight:** Both corpora return identical hidden structure (thermodynamic framework) but distinct narrator voices. Portuguese narrator: diasporic phenomenologist, tender, orienting. French narrator: forensic philosopher, cold, autopsying. Same writer, different instruments in each language.

**Critical editorial note (French book):** "The blogger must die so the author can live." Remove all engagement bait, CTAs, and register-breaking internet speak before manuscript assembly.
