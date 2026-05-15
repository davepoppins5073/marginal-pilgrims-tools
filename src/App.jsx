import { useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// LINGUISTIC FINGERPRINT ENGINE
// Detection runs in weighted layers:
// 1. Exclusive characters (nasal vowels, unique accents, terminal markers)
// 2. Special character patterns (punctuation, elision, digraphs)
// 3. Possessive pronouns
// 4. Fused prepositions
// 5. Negation particles and patterns
// 6. Pronoun + existential verb pairs (to be, to have, to know, to go)
// 7. Minimal pairs (ela/elle/ella type)
// 8. Stopwords (confirmation layer)
// ─────────────────────────────────────────────────────────────────────────────

const FINGERPRINTS = {
  pt: {
    code: "pt",
    label: "Português",
    flag: "🇧🇷",
    family: "Romance",
    launched: true,
    launchDate: "May 2026",
    accentColor: "#22c55e",
    description: "Brazil, Portugal & Lusophone Africa",

    // Search uses accent clusters and high-frequency native tokens
    // These fish with the language itself not geography
    searchTerms: [
      "ção", "não", "também", "está", "você",
      "arroz", "bacalhau", "saudade", "português",
      "estou", "somos", "temos", "vamos"
    ],

    signals: {
      // Layer 1 — Exclusive characters (weight: 40)
      // Nasal vowels are the strongest Portuguese fingerprint
      exclusiveChars: {
        weight: 40,
        patterns: [
          { regex: /ão/g, score: 10, note: "nasal ao — exclusive to PT" },
          { regex: /ãe/g, score: 10, note: "nasal ae — exclusive to PT" },
          { regex: /õe/g, score: 10, note: "nasal oe — exclusive to PT" },
          { regex: /nh/g, score: 8, note: "digraph nh — exclusive to PT" },
          { regex: /lh/g, score: 8, note: "digraph lh — exclusive to PT" },
          { regex: /ã/g, score: 7, note: "nasal a — strongly PT" },
          { regex: /õ/g, score: 7, note: "nasal o — strongly PT" },
          { regex: /ç/g, score: 3, note: "cedilla — shared with FR but common in PT" },
        ]
      },

      // Layer 2 — Special character patterns (weight: 15)
      charPatterns: {
        weight: 15,
        patterns: [
          { regex: /\bem\b/g, score: 5, note: "preposition em — PT" },
          { regex: /\bda\b|\bdo\b|\bdas\b|\bdos\b/g, score: 4, note: "genitive articles — PT" },
          { regex: /\bna\b|\bno\b|\bnas\b|\bnos\b/g, score: 4, note: "locative contractions — PT" },
          { regex: /eit[oa]/g, score: 6, note: "ct->eit resolution — PT (leite, feito, noite)" },
        ]
      },

      // Layer 3 — Possessive pronouns (weight: 20)
      possessives: {
        weight: 20,
        tokens: [
          { word: "minha", score: 10 },
          { word: "meu", score: 8 },
          { word: "meus", score: 8 },
          { word: "minhas", score: 10 },
          { word: "nossa", score: 9 },
          { word: "nosso", score: 9 },
          { word: "nossos", score: 9 },
          { word: "nossas", score: 9 },
          { word: "sua", score: 6 },
          { word: "seu", score: 6 },
          { word: "tua", score: 7 },
          { word: "teu", score: 7 },
        ]
      },

      // Layer 4 — Fused prepositions (weight: 15)
      fusedPreps: {
        weight: 15,
        tokens: [
          { word: "do", score: 5 },
          { word: "da", score: 5 },
          { word: "dos", score: 6 },
          { word: "das", score: 6 },
          { word: "no", score: 4 },
          { word: "na", score: 4 },
          { word: "nos", score: 5 },
          { word: "nas", score: 5 },
          { word: "ao", score: 7 },
          { word: "aos", score: 7 },
          { word: "pela", score: 8 },
          { word: "pelo", score: 8 },
          { word: "numa", score: 9 },
          { word: "dum", score: 9 },
        ]
      },

      // Layer 5 — Negation (weight: 20)
      negation: {
        weight: 20,
        tokens: [
          { word: "não", score: 10 }, // nasal + negation = double signal
          { word: "nunca", score: 7 },
          { word: "nada", score: 6 },
          { word: "ninguém", score: 9 },
          { word: "nem", score: 5 },
          { word: "jamais", score: 4 }, // archaic PT
        ]
      },

      // Layer 6 — Pronoun + verb pairs (weight: 35)
      // Existential verbs: to be (ser/estar), to have (ter), to know (saber/conhecer), to go (ir)
      verbPairs: {
        weight: 35,
        pairs: [
          // TO BE — ser
          { pattern: /\beu\s+sou\b/g, score: 10 },
          { pattern: /\btu\s+és\b/g, score: 10 },
          { pattern: /\bele\s+é\b|\bela\s+é\b/g, score: 10 },
          { pattern: /\bnós\s+somos\b/g, score: 10 },
          { pattern: /\beles\s+são\b|\belas\s+são\b/g, score: 10 },
          { pattern: /\bvocê\s+é\b/g, score: 10 },
          // TO BE — estar
          { pattern: /\bestou\b/g, score: 9 },
          { pattern: /\bestás\b|\bestá\b/g, score: 9 },
          { pattern: /\bestamos\b/g, score: 9 },
          { pattern: /\bestão\b/g, score: 10 }, // nasal ending = double
          // TO HAVE — ter
          { pattern: /\beu\s+tenho\b/g, score: 10 },
          { pattern: /\btu\s+tens\b/g, score: 10 },
          { pattern: /\bele\s+tem\b|\bela\s+tem\b/g, score: 9 },
          { pattern: /\bnós\s+temos\b/g, score: 10 },
          { pattern: /\beles\s+têm\b/g, score: 10 },
          // TO KNOW — saber/conhecer
          { pattern: /\beu\s+sei\b/g, score: 9 },
          { pattern: /\beu\s+conheço\b/g, score: 10 },
          { pattern: /\bsabemos\b/g, score: 8 },
          // TO GO — ir
          { pattern: /\beu\s+vou\b/g, score: 10 },
          { pattern: /\btu\s+vais\b/g, score: 10 },
          { pattern: /\bele\s+vai\b|\bela\s+vai\b/g, score: 9 },
          { pattern: /\bnós\s+vamos\b/g, score: 9 },
          { pattern: /\beles\s+vão\b/g, score: 10 }, // nasal = double
          // Progressive — Brazilian marker
          { pattern: /\bestou\s+\w+ando\b|\bestou\s+\w+endo\b/g, score: 10 },
          // Personal infinitive — unique to PT
          { pattern: /\bpara\s+\w+armos\b|\bpara\s+\w+ermos\b/g, score: 10 },
        ]
      },

      // Layer 7 — Minimal pairs (weight: 25)
      // Words that differ by one char from another Romance language
      minimalPairs: {
        weight: 25,
        tokens: [
          { word: "ela", score: 8 },   // vs elle (FR) vs ella (ES)
          { word: "ele", score: 8 },   // vs il (FR) vs él (ES)
          { word: "eles", score: 8 },
          { word: "elas", score: 8 },
          { word: "leite", score: 10 }, // vs leche (ES) vs lait (FR)
          { word: "noite", score: 10 }, // vs noche (ES) vs nuit (FR)
          { word: "feito", score: 10 }, // vs hecho (ES) vs fait (FR)
          { word: "direito", score: 9 },
          { word: "laranja", score: 10 }, // vs naranja (ES) — the l/n split
          { word: "frango", score: 10 },  // unique PT word for chicken
          { word: "vermelho", score: 10 }, // unique PT word for red
          { word: "pimenta", score: 8 },
          { word: "você", score: 10 },
          { word: "vocês", score: 10 },
          { word: "azeite", score: 10 }, // vs aceite (ES)
        ]
      },

      // Layer 8 — Stopwords (weight: 10 — confirmation only)
      stopwords: {
        weight: 10,
        tokens: [
          "que", "com", "para", "uma", "por", "mais", "como",
          "mas", "são", "também", "isso", "muito", "toda", "cada",
          "sobre", "essa", "esse", "aqui", "isto", "quando", "assim",
          "entre", "depois", "antes", "ainda", "então", "sempre",
          "nunca", "tudo", "nada", "outro", "outra", "mesmo", "já"
        ]
      }
    }
  },

  fr: {
    code: "fr",
    label: "Français",
    flag: "🇫🇷",
    family: "Romance",
    launched: true,
    launchDate: "May 2026",
    accentColor: "#3b82f6",
    description: "France, Québec & Francophone Africa",

    searchTerms: [
      "ne pas", "je suis", "il y a", "est-ce que",
      "aussi", "très", "même", "leur", "eux",
      "nous sommes", "vous êtes", "c'est", "l'", "qu'"
    ],

    signals: {
      exclusiveChars: {
        weight: 40,
        patterns: [
          { regex: /œ/g, score: 10, note: "oe ligature — exclusive to FR" },
          { regex: /æ/g, score: 10, note: "ae ligature — exclusive to FR" },
          { regex: /«|»/g, score: 9, note: "guillemets — French quotation" },
          { regex: /\b\w+eux\b/g, score: 8, note: "terminal -eux plural — FR" },
          { regex: /\b\w+aux\b/g, score: 8, note: "terminal -aux plural — FR" },
          { regex: /ê/g, score: 5, note: "circumflex e — common in FR" },
          { regex: /î/g, score: 5, note: "circumflex i — common in FR" },
          { regex: /û/g, score: 5, note: "circumflex u — common in FR" },
          { regex: /ï/g, score: 6, note: "diaeresis i — common in FR" },
          { regex: /ë/g, score: 6, note: "diaeresis e — common in FR" },
        ]
      },

      charPatterns: {
        weight: 15,
        patterns: [
          // Elision — the apostrophe fingerprint
          { regex: /\bl'/g, score: 8, note: "elision l' — FR" },
          { regex: /\bd'/g, score: 7, note: "elision d' — FR" },
          { regex: /\bj'/g, score: 9, note: "elision j' — exclusive FR" },
          { regex: /\bn'/g, score: 8, note: "elision n' — FR" },
          { regex: /\bc'/g, score: 8, note: "elision c' — FR" },
          { regex: /\bqu'/g, score: 7, note: "elision qu' — FR" },
          { regex: /\bm'/g, score: 8, note: "elision m' — FR" },
          { regex: /\bs'/g, score: 6, note: "elision s' — FR" },
          // Question inversion with hyphen
          { regex: /\w+-vous\b|\w+-tu\b|\w+-il\b|\w+-elle\b/g, score: 10, note: "inversion question — FR" },
          // est-ce que
          { regex: /est-ce que/g, score: 10, note: "est-ce que — exclusive FR" },
        ]
      },

      possessives: {
        weight: 20,
        tokens: [
          { word: "mon", score: 7 },
          { word: "ma", score: 6 },
          { word: "mes", score: 7 },
          { word: "ton", score: 7 },
          { word: "ta", score: 5 },
          { word: "tes", score: 7 },
          { word: "son", score: 6 },
          { word: "sa", score: 5 },
          { word: "ses", score: 7 },
          { word: "notre", score: 8 },
          { word: "nos", score: 7 },
          { word: "votre", score: 8 },
          { word: "vos", score: 7 },
          { word: "leur", score: 9 },
          { word: "leurs", score: 9 },
          // Stressed possessives — exclusive to FR
          { word: "mien", score: 10 },
          { word: "mienne", score: 10 },
          { word: "tien", score: 10 },
          { word: "tienne", score: 10 },
          { word: "sien", score: 10 },
          { word: "sienne", score: 10 },
        ]
      },

      fusedPreps: {
        weight: 15,
        tokens: [
          { word: "au", score: 8 },   // à + le — exclusive FR form
          { word: "aux", score: 9 },  // à + les
          { word: "du", score: 7 },   // de + le
          { word: "des", score: 5 },
        ]
      },

      negation: {
        weight: 20,
        tokens: [
          { word: "pas", score: 7 },    // ne...pas sandwich
          { word: "plus", score: 5 },   // ne...plus
          { word: "jamais", score: 6 }, // ne...jamais
          { word: "rien", score: 7 },   // ne...rien
          { word: "personne", score: 6 },
          { word: "aucun", score: 7 },
          { word: "aucune", score: 7 },
        ],
        patterns: [
          { regex: /ne\s+\w+\s+pas/g, score: 10, note: "ne...pas sandwich — exclusive FR" },
          { regex: /ne\s+\w+\s+plus/g, score: 10 },
          { regex: /ne\s+\w+\s+jamais/g, score: 10 },
          { regex: /ne\s+\w+\s+rien/g, score: 10 },
          { regex: /\bsais\s+pas\b|\bveux\s+pas\b|\bpeux\s+pas\b/g, score: 9, note: "dropped ne informal — FR" },
        ]
      },

      verbPairs: {
        weight: 35,
        pairs: [
          // TO BE — être
          { pattern: /\bje\s+suis\b/g, score: 10 },
          { pattern: /\btu\s+es\b/g, score: 9 },
          { pattern: /\bil\s+est\b|\belle\s+est\b/g, score: 9 },
          { pattern: /\bnous\s+sommes\b/g, score: 10 },
          { pattern: /\bvous\s+êtes\b/g, score: 10 },
          { pattern: /\bils\s+sont\b|\belles\s+sont\b/g, score: 10 },
          { pattern: /\bc'est\b/g, score: 8 },
          { pattern: /\bil\s+y\s+a\b/g, score: 10 }, // il y a — exclusive FR
          // TO HAVE — avoir
          { pattern: /\bj'ai\b/g, score: 10 },
          { pattern: /\btu\s+as\b/g, score: 9 },
          { pattern: /\bil\s+a\b|\belle\s+a\b/g, score: 7 },
          { pattern: /\bnous\s+avons\b/g, score: 10 },
          { pattern: /\bvous\s+avez\b/g, score: 10 },
          { pattern: /\bils\s+ont\b/g, score: 10 },
          // TO KNOW — savoir/connaître
          { pattern: /\bje\s+sais\b/g, score: 10 },
          { pattern: /\bje\s+connais\b/g, score: 10 },
          { pattern: /\bje\s+ne\s+sais\s+pas\b/g, score: 10 },
          // TO GO — aller
          { pattern: /\bje\s+vais\b/g, score: 10 },
          { pattern: /\btu\s+vas\b/g, score: 10 },
          { pattern: /\bil\s+va\b|\belle\s+va\b/g, score: 9 },
          { pattern: /\bnous\s+allons\b/g, score: 10 },
          { pattern: /\bvous\s+allez\b/g, score: 10 },
          { pattern: /\bils\s+vont\b/g, score: 10 },
          // Progressive — en train de — exclusive FR
          { pattern: /en\s+train\s+de/g, score: 10 },
          // Subjunctive trigger — que + subj
          { pattern: /\bil\s+faut\s+que\b/g, score: 10 },
          { pattern: /\bpour\s+que\b/g, score: 8 },
          { pattern: /\bbien\s+que\b/g, score: 8 },
        ]
      },

      minimalPairs: {
        weight: 25,
        tokens: [
          { word: "elle", score: 8 },   // vs ela (PT) vs ella (ES)
          { word: "elles", score: 8 },
          { word: "eux", score: 10 },   // exclusive FR disjunctive
          { word: "leur", score: 9 },
          { word: "lait", score: 10 },  // vs leite (PT) vs leche (ES)
          { word: "nuit", score: 10 },  // vs noite (PT) vs noche (ES)
          { word: "fait", score: 9 },   // vs feito (PT) vs hecho (ES)
          { word: "droit", score: 9 },  // vs direito (PT) vs derecho (ES)
          { word: "rouge", score: 10 }, // vs rojo (ES) vs vermelho (PT)
          { word: "pomme", score: 10 }, // vs manzana (ES) vs maçã (PT)
          { word: "riz", score: 10 },   // vs arroz (ES/PT)
          { word: "morue", score: 10 }, // vs bacalhau (PT) vs bacalao (ES)
          { word: "huile", score: 9 },  // vs aceite (ES) vs azeite (PT)
          { word: "poivron", score: 10 }, // exclusive FR — little pepper
          { word: "poulet", score: 9 },
        ]
      },

      stopwords: {
        weight: 10,
        tokens: [
          "que", "les", "des", "une", "pour", "dans", "sur", "avec",
          "par", "est", "sont", "nous", "vous", "ils", "elles", "mais",
          "donc", "très", "aussi", "bien", "tout", "cette", "plus",
          "comme", "quand", "même", "leur", "été", "avoir", "faire",
          "dire", "voir", "monde", "politique", "culture", "semaine",
          "lettre", "texte", "article", "vie", "temps", "après", "avant",
          "entre", "toujours", "jamais", "encore", "déjà", "enfin"
        ]
      }
    }
  },

  es: {
    code: "es",
    label: "Español",
    flag: "🇪🇸",
    family: "Romance",
    launched: false,
    launchDate: "June 2026",
    accentColor: "#f59e0b",
    description: "Spain, Latin America & Hispanic world",

    searchTerms: [
      "¿", "¡", "también", "estar", "hace",
      "nosotros", "vosotros", "ustedes", "naranja", "arroz"
    ],

    signals: {
      exclusiveChars: {
        weight: 40,
        patterns: [
          { regex: /ñ/g, score: 10, note: "n tilde — exclusive to ES" },
          { regex: /¿/g, score: 10, note: "inverted question — exclusive to ES" },
          { regex: /¡/g, score: 10, note: "inverted exclamation — exclusive to ES" },
          { regex: /á/g, score: 4 },
          { regex: /é/g, score: 3 },
          { regex: /í/g, score: 4 },
          { regex: /ó/g, score: 4 },
          { regex: /ú/g, score: 4 },
        ]
      },
      charPatterns: {
        weight: 15,
        patterns: [
          { regex: /ch[aeiou]/g, score: 6, note: "ct->ch resolution — ES (leche, noche)" },
          { regex: /\blo\s+\w+/g, score: 7, note: "neuter lo — exclusive ES" },
        ]
      },
      possessives: {
        weight: 20,
        tokens: [
          { word: "mi", score: 6 }, { word: "mis", score: 7 },
          { word: "tu", score: 5 }, { word: "tus", score: 6 },
          { word: "su", score: 5 }, { word: "sus", score: 6 },
          { word: "nuestro", score: 9 }, { word: "nuestra", score: 9 },
          { word: "nuestros", score: 9 }, { word: "nuestras", score: 9 },
          { word: "vuestro", score: 10 }, // Peninsular Spanish exclusive
          { word: "mío", score: 9 }, { word: "mía", score: 9 },
          { word: "tuyo", score: 9 }, { word: "tuya", score: 9 },
        ]
      },
      fusedPreps: {
        weight: 15,
        tokens: [
          { word: "al", score: 8 },  // a + el — ES exclusive form
          { word: "del", score: 8 }, // de + el — ES exclusive form
        ]
      },
      negation: {
        weight: 20,
        tokens: [
          { word: "no", score: 5 },
          { word: "nunca", score: 6 },
          { word: "jamás", score: 9 }, // accent on final — ES exclusive
          { word: "nada", score: 5 },
          { word: "nadie", score: 8 },
          { word: "tampoco", score: 9 },
          { word: "ningún", score: 8 },
        ],
        patterns: [
          { regex: /no\s+sé\s+nada/g, score: 10, note: "double negation — ES" },
          { regex: /no\s+\w+\s+nada/g, score: 8 },
          { regex: /no\s+\w+\s+nunca/g, score: 8 },
        ]
      },
      verbPairs: {
        weight: 35,
        pairs: [
          // TO BE — ser
          { pattern: /\byo\s+soy\b/g, score: 10 },
          { pattern: /\btú\s+eres\b/g, score: 10 },
          { pattern: /\bél\s+es\b|\bella\s+es\b/g, score: 9 },
          { pattern: /\bnosotros\s+somos\b/g, score: 10 },
          { pattern: /\bellos\s+son\b|\bellas\s+son\b/g, score: 10 },
          // TO BE — estar
          { pattern: /\bestoy\b/g, score: 9 },
          { pattern: /\bestás\b|\bestá\b/g, score: 8 },
          { pattern: /\bestamos\b/g, score: 9 },
          { pattern: /\bestán\b/g, score: 9 },
          // Ser vs Estar — the philosophical split
          { pattern: /\bsoy\s+\w+\b/g, score: 7 },
          { pattern: /\bestoy\s+\w+\b/g, score: 7 },
          // TO HAVE — tener
          { pattern: /\byo\s+tengo\b/g, score: 10 },
          { pattern: /\btú\s+tienes\b/g, score: 10 },
          { pattern: /\bél\s+tiene\b/g, score: 9 },
          { pattern: /\btenemos\b/g, score: 9 },
          // TO KNOW — saber/conocer
          { pattern: /\byo\s+sé\b/g, score: 9 },
          { pattern: /\byo\s+conozco\b/g, score: 10 },
          // TO GO — ir
          { pattern: /\byo\s+voy\b/g, score: 10 },
          { pattern: /\btú\s+vas\b/g, score: 9 },
          { pattern: /\bél\s+va\b/g, score: 7 },
          { pattern: /\bvamos\b/g, score: 8 },
          // Gustar construction — exclusive ES phenomenology
          { pattern: /\bme\s+gusta\b|\bme\s+gustan\b/g, score: 10 },
          { pattern: /\bte\s+gusta\b/g, score: 10 },
          { pattern: /\ble\s+gusta\b/g, score: 9 },
          // Personal a — exclusive ES
          { pattern: /\bveo\s+a\b|\bllamo\s+a\b|\bvisito\s+a\b/g, score: 10 },
        ]
      },
      minimalPairs: {
        weight: 25,
        tokens: [
          { word: "ella", score: 8 },    // vs ela (PT) vs elle (FR)
          { word: "ellas", score: 8 },
          { word: "ellos", score: 9 },
          { word: "leche", score: 10 },  // vs leite (PT) vs lait (FR)
          { word: "noche", score: 10 },  // vs noite (PT) vs nuit (FR)
          { word: "hecho", score: 10 },  // vs feito (PT) vs fait (FR)
          { word: "naranja", score: 10 }, // vs laranja (PT) — the n/l split
          { word: "rojo", score: 10 },   // vs vermelho (PT) vs rouge (FR)
          { word: "manzana", score: 10 }, // vs maçã (PT) vs pomme (FR)
          { word: "arroz", score: 7 },   // shared with PT
          { word: "aceite", score: 10 }, // vs azeite (PT) — the c/z split
          { word: "vosotros", score: 10 }, // Peninsular exclusive
          { word: "ustedes", score: 8 },
          { word: "también", score: 8 },
          { word: "pollo", score: 7 },
        ]
      },
      stopwords: {
        weight: 10,
        tokens: [
          "que", "los", "las", "una", "para", "con", "por", "está",
          "son", "nos", "también", "todo", "esta", "más", "como",
          "cuando", "mismo", "sus", "mundo", "política", "cultura",
          "economía", "historia", "sociedad", "semana", "después",
          "antes", "entre", "siempre", "nunca", "todavía", "además"
        ]
      }
    }
  },

  it: {
    code: "it",
    label: "Italiano",
    flag: "🇮🇹",
    family: "Romance",
    launched: false,
    launchDate: "July 2026",
    accentColor: "#ef4444",
    description: "Italy & Italian-speaking world",
    searchTerms: ["sono", "siamo", "anche", "però", "quindi", "quello", "questa", "arroz", "parmigiano"],
    signals: {
      exclusiveChars: {
        weight: 40,
        patterns: [
          { regex: /\bgh/g, score: 7, note: "gh cluster — common IT" },
          { regex: /\bgli\b/g, score: 9, note: "gli — exclusive IT article" },
          { regex: /\bche\b/g, score: 6 },
          { regex: /zione\b/g, score: 8, note: "-zione suffix — IT" },
          { regex: /ità\b/g, score: 8, note: "-ità suffix — IT" },
          { regex: /utto\b|\butta\b/g, score: 6 },
        ]
      },
      charPatterns: { weight: 15, patterns: [
        { regex: /tt[aeiou]/g, score: 7, note: "ct->tt resolution — IT (latte, notte, fatto)" },
        { regex: /\bnell[ao]\b|\bdell[ao]\b|\ball[ao]\b/g, score: 9, note: "fused prepositions — IT" },
      ]},
      possessives: { weight: 20, tokens: [
        { word: "mio", score: 9 }, { word: "mia", score: 9 },
        { word: "miei", score: 9 }, { word: "mie", score: 8 },
        { word: "tuo", score: 9 }, { word: "tua", score: 8 },
        { word: "suo", score: 8 }, { word: "sua", score: 7 },
        { word: "nostro", score: 9 }, { word: "nostra", score: 9 },
        { word: "vostro", score: 10 }, // exclusive IT form
        { word: "loro", score: 8 },
      ]},
      fusedPreps: { weight: 15, tokens: [
        { word: "nel", score: 9 }, { word: "nella", score: 9 },
        { word: "nei", score: 9 }, { word: "nelle", score: 9 },
        { word: "del", score: 7 }, { word: "della", score: 9 },
        { word: "dei", score: 8 }, { word: "delle", score: 9 },
        { word: "al", score: 6 }, { word: "alla", score: 8 },
        { word: "agli", score: 10 }, // exclusive IT plural form
        { word: "sul", score: 8 }, { word: "sulla", score: 9 },
      ]},
      negation: { weight: 20, tokens: [
        { word: "non", score: 8 }, // vs no (ES) vs não (PT) vs ne/pas (FR)
        { word: "mai", score: 7 },
        { word: "niente", score: 9 },
        { word: "nessuno", score: 9 },
        { word: "neanche", score: 9 },
        { word: "mica", score: 10 }, // informal IT negation — exclusive
      ], patterns: []},
      verbPairs: { weight: 35, pairs: [
        { pattern: /\bio\s+sono\b/g, score: 10 },
        { pattern: /\btu\s+sei\b/g, score: 10 },
        { pattern: /\blui\s+è\b|\blei\s+è\b/g, score: 10 },
        { pattern: /\bnoi\s+siamo\b/g, score: 10 },
        { pattern: /\bvoi\s+siete\b/g, score: 10 }, // exclusive IT 2nd plural
        { pattern: /\bloro\s+sono\b/g, score: 10 },
        { pattern: /\bio\s+ho\b/g, score: 10 },
        { pattern: /\btu\s+hai\b/g, score: 10 },
        { pattern: /\bnoi\s+abbiamo\b/g, score: 10 },
        { pattern: /\bio\s+so\b/g, score: 9 },
        { pattern: /\bio\s+conosco\b/g, score: 10 },
        { pattern: /\bio\s+vado\b/g, score: 10 },
        { pattern: /\bnoi\s+andiamo\b/g, score: 10 },
        { pattern: /\bc'è\b|\bci\s+sono\b/g, score: 10 }, // there is/are — IT
      ]},
      minimalPairs: { weight: 25, tokens: [
        { word: "lei", score: 8 },  // she/formal you — IT
        { word: "loro", score: 8 },
        { word: "latte", score: 10 }, // vs leite/leche/lait — tt resolution
        { word: "notte", score: 10 }, // vs noite/noche/nuit
        { word: "fatto", score: 10 }, // vs feito/hecho/fait
        { word: "olio", score: 10 },  // vs azeite/aceite/huile — stayed Latin
        { word: "pollo", score: 7 },
        { word: "mela", score: 10 },  // vs maçã/manzana/pomme — unique
        { word: "rosso", score: 10 }, // vs vermelho/rojo/rouge
        { word: "riso", score: 9 },   // vs arroz/riz
        { word: "però", score: 9 },
        { word: "quindi", score: 9 },
        { word: "quello", score: 8 },
        { word: "anche", score: 7 },
        { word: "insieme", score: 8 },
      ]},
      stopwords: { weight: 10, tokens: [
        "che", "gli", "dei", "una", "per", "con", "dal", "nel", "sul",
        "alla", "alle", "sono", "anche", "tutto", "questa", "più", "come",
        "quando", "stesso", "loro", "mondo", "politica", "cultura",
        "economia", "storia", "società", "settimana", "sempre", "ancora",
        "dopo", "prima", "tra", "fra", "però", "quindi", "oppure"
      ]}
    }
  },

  ro: {
    code: "ro",
    label: "Română",
    flag: "🇷🇴",
    family: "Romance",
    launched: false,
    launchDate: "August 2026",
    accentColor: "#a855f7",
    description: "Romania & Romanian diaspora — uncharted territory",
    searchTerms: ["sunt", "este", "avem", "merge", "știu", "acum", "când", "pentru", "despre"],
    signals: {
      exclusiveChars: {
        weight: 40,
        patterns: [
          { regex: /ș/g, score: 10, note: "s with comma below — exclusive to RO" },
          { regex: /ț/g, score: 10, note: "t with comma below — exclusive to RO" },
          { regex: /ă/g, score: 9, note: "a breve — exclusive to RO" },
          { regex: /â/g, score: 7, note: "a circumflex — primarily RO" },
          { regex: /î/g, score: 7, note: "i circumflex — primarily RO" },
        ]
      },
      charPatterns: { weight: 15, patterns: [
        { regex: /\bul\b|\bului\b/g, score: 8, note: "definite article suffix — RO" },
        { regex: /\bea\b/g, score: 6 },
        { regex: /ești\b/g, score: 9, note: "-ești suffix — RO" },
      ]},
      possessives: { weight: 20, tokens: [
        { word: "meu", score: 7 }, { word: "mea", score: 8 },
        { word: "tău", score: 10 }, { word: "ta", score: 6 },
        { word: "său", score: 10 }, // exclusive RO form with diphthong
        { word: "sa", score: 5 },
        { word: "nostru", score: 9 }, { word: "noastră", score: 10 },
        { word: "vostru", score: 9 }, { word: "voastră", score: 10 },
        { word: "lor", score: 7 },
        { word: "dumneavoastră", score: 10 }, // formal you — medieval Latin fossil
      ]},
      fusedPreps: { weight: 15, tokens: [
        { word: "despre", score: 9 },
        { word: "dintre", score: 9 },
        { word: "dintr", score: 9 },
        { word: "într", score: 9 },
        { word: "printr", score: 9 },
      ]},
      negation: { weight: 20, tokens: [
        { word: "nu", score: 9 },       // primary RO negation — exclusive among Romance
        { word: "niciodată", score: 10 },
        { word: "nimic", score: 10 },
        { word: "nimeni", score: 10 },
        { word: "nici", score: 8 },
        { word: "nicio", score: 10 },
      ], patterns: [
        { regex: /\bnu\s+\w+/g, score: 8, note: "nu + verb — RO negation pattern" },
      ]},
      verbPairs: { weight: 35, pairs: [
        // TO BE — a fi
        { pattern: /\beu\s+sunt\b/g, score: 10 },
        { pattern: /\btu\s+ești\b/g, score: 10 },
        { pattern: /\bel\s+este\b|\bea\s+este\b/g, score: 10 },
        { pattern: /\bnoi\s+suntem\b/g, score: 10 },
        { pattern: /\bvoi\s+sunteți\b/g, score: 10 },
        { pattern: /\bei\s+sunt\b|\bele\s+sunt\b/g, score: 10 },
        // TO HAVE — a avea
        { pattern: /\beu\s+am\b/g, score: 9 },
        { pattern: /\btu\s+ai\b/g, score: 8 },
        { pattern: /\bel\s+are\b|\bea\s+are\b/g, score: 9 },
        { pattern: /\bnoi\s+avem\b/g, score: 10 },
        { pattern: /\bvoi\s+aveți\b/g, score: 10 },
        // TO KNOW — a ști
        { pattern: /\beu\s+știu\b/g, score: 10 },
        { pattern: /\btu\s+știi\b/g, score: 10 },
        { pattern: /\bnu\s+știu\b/g, score: 10 },
        // TO GO — a merge/a se duce
        { pattern: /\beu\s+merg\b/g, score: 10 },
        { pattern: /\btu\s+mergi\b/g, score: 10 },
        { pattern: /\bnoi\s+mergem\b/g, score: 10 },
        { pattern: /\bmă\s+duc\b/g, score: 10 }, // reflexive go — exclusive RO
      ]},
      minimalPairs: { weight: 25, tokens: [
        { word: "sunt", score: 8 },
        { word: "este", score: 7 },
        { word: "care", score: 7 },
        { word: "când", score: 8 },
        { word: "după", score: 9 },
        { word: "înainte", score: 9 },
        { word: "portocală", score: 10 }, // orange = Portugal — the etymology fossil
        { word: "lapte", score: 10 },  // milk — closest to Latin lactem of all
        { word: "noapte", score: 10 }, // night — closest to Latin noctem
        { word: "roșu", score: 10 },   // red — exclusive RO form
        { word: "merge", score: 8 },
        { word: "acum", score: 8 },
        { word: "aici", score: 8 },
        { word: "foarte", score: 9 },  // very — exclusive RO
        { word: "bine", score: 6 },
      ]},
      stopwords: { weight: 10, tokens: [
        "că", "și", "în", "cu", "de", "la", "pe", "din", "care", "este",
        "sunt", "mai", "pentru", "sau", "dar", "dacă", "când", "cum",
        "tot", "această", "lumea", "politică", "cultură", "economie",
        "istorie", "societate", "săptămână", "după", "înainte", "între",
        "mereu", "niciodată", "încă", "deja", "acum", "aici", "acolo"
      ]}
    }
  },

  de: {
    code: "de", label: "Deutsch", flag: "🇩🇪", family: "Germanic",
    launched: false, launchDate: "September 2026", accentColor: "#6b7280",
    description: "Germany, Austria & German-speaking world",
    searchTerms: [], signals: { exclusiveChars: { weight: 40, patterns: [
      { regex: /ß/g, score: 10, note: "eszett — exclusive to DE" },
      { regex: /ü/g, score: 7 }, { regex: /ö/g, score: 7 }, { regex: /ä/g, score: 6 },
    ]}, charPatterns: { weight: 15, patterns: [] },
    possessives: { weight: 20, tokens: [] }, fusedPreps: { weight: 15, tokens: [] },
    negation: { weight: 20, tokens: [{ word: "nicht", score: 10 }, { word: "kein", score: 9 }], patterns: [] },
    verbPairs: { weight: 35, pairs: [
      { pattern: /\bich\s+bin\b/g, score: 10 }, { pattern: /\bwir\s+sind\b/g, score: 10 },
      { pattern: /\bich\s+habe\b/g, score: 10 }, { pattern: /\bich\s+weiß\b/g, score: 10 },
    ]},
    minimalPairs: { weight: 25, tokens: [
      { word: "nicht", score: 10 }, { word: "auch", score: 7 }, { word: "aber", score: 7 },
    ]},
    stopwords: { weight: 10, tokens: ["der", "die", "das", "und", "ist", "ich", "wir", "sie", "nicht", "aber", "auch"] }
    }
  },

  ar: {
    code: "ar", label: "العربية", flag: "🇲🇦", family: "Semitic",
    launched: false, launchDate: "October 2026", accentColor: "#6b7280",
    description: "Arab world & MENA region",
    searchTerms: [], signals: { exclusiveChars: { weight: 40, patterns: [
      { regex: /[\u0600-\u06FF]/g, score: 10, note: "Arabic script — exclusive" },
    ]}, charPatterns: { weight: 15, patterns: [] },
    possessives: { weight: 20, tokens: [] }, fusedPreps: { weight: 15, tokens: [] },
    negation: { weight: 20, tokens: [], patterns: [] },
    verbPairs: { weight: 35, pairs: [] },
    minimalPairs: { weight: 25, tokens: [] },
    stopwords: { weight: 10, tokens: [] }
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function runFingerprint(text, lang) {
  if (!text || !lang.signals) return 0;
  const t = text.toLowerCase();
  const words = t.split(/\s+/);
  let totalScore = 0;
  let totalWeight = 0;
  const s = lang.signals;

  // Layer 1 — Exclusive chars
  if (s.exclusiveChars) {
    let layerScore = 0;
    s.exclusiveChars.patterns.forEach(({ regex, score }) => {
      const matches = (text.match(regex) || []).length;
      layerScore += Math.min(matches * score, score * 3);
    });
    totalScore += Math.min(layerScore / 30, 1) * s.exclusiveChars.weight;
    totalWeight += s.exclusiveChars.weight;
  }

  // Layer 2 — Char patterns
  if (s.charPatterns) {
    let layerScore = 0;
    s.charPatterns.patterns.forEach(({ regex, score }) => {
      const matches = (t.match(regex) || []).length;
      layerScore += Math.min(matches * score, score * 2);
    });
    totalScore += Math.min(layerScore / 20, 1) * s.charPatterns.weight;
    totalWeight += s.charPatterns.weight;
  }

  // Layer 3 — Possessives
  if (s.possessives?.tokens?.length) {
    let layerScore = 0;
    s.possessives.tokens.forEach(({ word, score }) => {
      const re = new RegExp(`\\b${word}\\b`, "gi");
      if (re.test(t)) layerScore += score;
    });
    totalScore += Math.min(layerScore / 20, 1) * s.possessives.weight;
    totalWeight += s.possessives.weight;
  }

  // Layer 4 — Fused preps
  if (s.fusedPreps?.tokens?.length) {
    let layerScore = 0;
    s.fusedPreps.tokens.forEach(({ word, score }) => {
      const re = new RegExp(`\\b${word}\\b`, "gi");
      if (re.test(t)) layerScore += score;
    });
    totalScore += Math.min(layerScore / 25, 1) * s.fusedPreps.weight;
    totalWeight += s.fusedPreps.weight;
  }

  // Layer 5 — Negation
  if (s.negation) {
    let layerScore = 0;
    (s.negation.tokens || []).forEach(({ word, score }) => {
      const re = new RegExp(`\\b${word}\\b`, "gi");
      if (re.test(t)) layerScore += score;
    });
    (s.negation.patterns || []).forEach(({ regex, score }) => {
      if (regex.test(t)) layerScore += score;
    });
    totalScore += Math.min(layerScore / 20, 1) * s.negation.weight;
    totalWeight += s.negation.weight;
  }

  // Layer 6 — Verb pairs
  if (s.verbPairs?.pairs?.length) {
    let layerScore = 0;
    s.verbPairs.pairs.forEach(({ pattern, score }) => {
      const re = new RegExp(pattern.source, "gi");
      if (re.test(t)) layerScore += score;
    });
    totalScore += Math.min(layerScore / 40, 1) * s.verbPairs.weight;
    totalWeight += s.verbPairs.weight;
  }

  // Layer 7 — Minimal pairs
  if (s.minimalPairs?.tokens?.length) {
    let layerScore = 0;
    s.minimalPairs.tokens.forEach(({ word, score }) => {
      const re = new RegExp(`\\b${word}\\b`, "gi");
      if (re.test(t)) layerScore += score;
    });
    totalScore += Math.min(layerScore / 30, 1) * s.minimalPairs.weight;
    totalWeight += s.minimalPairs.weight;
  }

  // Layer 8 — Stopwords
  if (s.stopwords?.tokens?.length) {
    const hits = words.filter(w => s.stopwords.tokens.includes(w)).length;
    const ratio = hits / Math.max(words.length, 1);
    totalScore += Math.min(ratio / 0.15, 1) * s.stopwords.weight;
    totalWeight += s.stopwords.weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

// Run all languages and return ranked results
function identifyLanguage(text) {
  const scores = Object.values(FINGERPRINTS).map(lang => ({
    lang,
    score: runFingerprint(text, lang)
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTACK API — with full diagnostic instrumentation
// ─────────────────────────────────────────────────────────────────────────────

// Failure modes we distinguish:
// CORS      — TypeError, fetch never reached server, sandbox/browser blocked it
// RATE_429  — server responded 429, we're being throttled
// TIMEOUT   — fetch hung past our threshold, ambiguous cause
// HTTP_ERR  — any other non-ok status (403, 500, etc)
// SUCCESS   — got data back

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchSubstackResults(lang, onDiagnostic) {
  const results = new Map();
  const terms = lang.searchTerms.slice(0, 5);
  const diagnostics = [];

  await Promise.allSettled(
    terms.map(async (term) => {
      const start = Date.now();
      const entry = {
        term,
        status: null,
        mode: null,       // CORS | RATE_429 | TIMEOUT | HTTP_ERR | SUCCESS
        retryAfter: null, // populated if 429 includes Retry-After header
        count: 0,
        ms: 0,
      };

      try {
        const res = await fetchWithTimeout(
          `https://substack.com/api/v1/publication/search?query=${encodeURIComponent(term)}&page=0&limit=20`,
          { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
        );

        entry.ms = Date.now() - start;
        entry.status = res.status;

        if (res.status === 429) {
          entry.mode = "RATE_429";
          // Substack may or may not send Retry-After
          const retryAfter = res.headers.get("Retry-After") || res.headers.get("X-RateLimit-Reset");
          entry.retryAfter = retryAfter ? `${retryAfter}s` : "unknown";
        } else if (!res.ok) {
          entry.mode = "HTTP_ERR";
        } else {
          const data = await res.json();
          const pubs = data.publications || data.results || [];
          entry.count = pubs.length;
          entry.mode = "SUCCESS";
          pubs.forEach(p => {
            const key = p.subdomain || p.id;
            if (key && !results.has(key)) results.set(key, p);
          });
        }
      } catch (e) {
        entry.ms = Date.now() - start;
        if (e.name === "AbortError") {
          entry.mode = "TIMEOUT";
          entry.status = "—";
        } else if (e.name === "TypeError") {
          // TypeError on fetch = network error before reaching server
          // In browser sandbox this is always CORS
          entry.mode = "CORS";
          entry.status = "—";
        } else {
          entry.mode = "HTTP_ERR";
          entry.status = "—";
        }
      }

      diagnostics.push(entry);
      // Stream updates as each term resolves
      if (onDiagnostic) onDiagnostic([...diagnostics]);
    })
  );

  // Summarize failure mode across all terms
  const modes = diagnostics.map(d => d.mode);
  let globalMode = "SUCCESS";
  if (modes.every(m => m === "CORS")) globalMode = "CORS";
  else if (modes.every(m => m === "RATE_429")) globalMode = "RATE_429";
  else if (modes.every(m => m === "TIMEOUT")) globalMode = "TIMEOUT";
  else if (modes.every(m => m !== "SUCCESS")) globalMode = "HTTP_ERR";
  else if (modes.some(m => m === "CORS")) globalMode = "PARTIAL_CORS";
  else if (modes.some(m => m === "RATE_429")) globalMode = "PARTIAL_429";

  return {
    pubs: Array.from(results.values()),
    diagnostics,
    globalMode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SCORING
// ─────────────────────────────────────────────────────────────────────────────
async function getAiScores(pubs, lang) {
  const input = pubs.slice(0, 10).map((p, i) =>
    `${i + 1}. "${p.name}": ${(p.description || "no description").slice(0, 150)}`
  ).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a multilingual editorial analyst. Analyze these Substack newsletters found via a ${lang.label}-language search (${lang.description}).

Return ONLY a JSON array — no markdown, no preamble. One object per newsletter, same order:
{ "score": 1-10, "niche": "2-3 word niche", "why": "one sharp editorial sentence in English", "language_confidence": "high|medium|low" }

Score 10 = clearly ${lang.label}, strong distinct niche, active. Score 1 = English or irrelevant.
language_confidence = how certain this is actually ${lang.label}-language content.

Newsletters:
${input}`
      }]
    })
  });

  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "[]";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ScoreDots({ score, color }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: i < Math.round(score) ? color : "#1e1e1e",
          transition: "background 0.4s",
        }} />
      ))}
    </div>
  );
}

function LangScore({ scores, color }) {
  const top = scores.slice(0, 3);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {top.map(({ lang, score }) => score > 0.15 && (
        <span key={lang.code} style={{
          fontSize: 9, fontFamily: "monospace",
          color: score > 0.5 ? color : "#888",
          letterSpacing: "0.06em",
        }}>
          {lang.flag}{Math.round(score * 100)}
        </span>
      ))}
    </div>
  );
}

function NewsletterCard({ pub, aiData, lang, index, fingerprintScores }) {
  const [hovered, setHovered] = useState(false);
  const score = aiData?.score || 0;
  const subs = pub.roughNumFreeSubscribers || pub.freeSubscriberCount || null;
  const url = pub.customDomain ? `https://${pub.customDomain}` : `https://${pub.subdomain}.substack.com`;
  const fingerScore = fingerprintScores?.[0]?.score || 0;
  const confidence = fingerScore > 0.6 ? "high" : fingerScore > 0.3 ? "medium" : "low";
  const confColor = { high: lang.accentColor, medium: "#888", low: "#888" };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#111" : "#0c0c0c",
        border: `1px solid ${hovered ? "#222" : "#141414"}`,
        borderLeft: `3px solid ${score >= 7 ? lang.accentColor : score >= 4 ? "#333" : "#141414"}`,
        borderRadius: 2, padding: "18px 22px", marginBottom: 2,
        transition: "all 0.2s ease",
        animation: "fadeUp 0.4s ease both",
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          {pub.logoUrl && (
            <img src={pub.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 3, objectFit: "cover", flexShrink: 0, border: "1px solid #1e1e1e" }}
              onError={e => e.target.style.display = "none"} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#f0ebe3", fontFamily: "'Georgia', serif", marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pub.name || "Untitled"}
            </div>
            <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>@{pub.subdomain || "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {fingerprintScores && <LangScore scores={fingerprintScores} color={lang.accentColor} />}
          <span style={{
            fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
            color: confColor[confidence], fontFamily: "monospace",
          }}>
            {confidence === "high" ? "✓" : confidence === "medium" ? "~" : "?"} {aiData?.niche || confidence}
          </span>
        </div>
      </div>

      {score > 0 && <div style={{ marginBottom: 8 }}><ScoreDots score={score} color={lang.accentColor} /></div>}

      {(aiData?.why || pub.description) && (
        <p style={{
          fontSize: 12, color: "#555", margin: "0 0 12px", lineHeight: 1.7,
          fontStyle: "italic",
          borderLeft: `1px solid #1e1e1e`, paddingLeft: 10,
        }}>
          {aiData?.why || (pub.description || "").slice(0, 140) + "…"}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 14, fontSize: 10, color: "#333", fontFamily: "monospace" }}>
          {subs && <span>👥 {subs.toLocaleString()}</span>}
          {pub.authorName && <span>✍ {pub.authorName}</span>}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 10, color: lang.accentColor, textDecoration: "none",
          letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace",
          opacity: hovered ? 1 : 0.5, transition: "opacity 0.2s",
        }}>Open →</a>
      </div>
    </div>
  );
}

function LangTab({ lang, active, onClick }) {
  return (
    <button onClick={lang.launched ? onClick : undefined} style={{
      background: active ? lang.accentColor : "transparent",
      color: active ? "#000" : lang.launched ? "#777" : "#2a2a2a",
      border: `1px solid ${active ? lang.accentColor : lang.launched ? "#1e1e1e" : "#111"}`,
      borderRadius: 2, padding: "8px 14px",
      fontFamily: "'Georgia', serif", fontSize: 12,
      cursor: lang.launched ? "pointer" : "default",
      transition: "all 0.2s",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      minWidth: 80,
    }}>
      <span style={{ fontSize: 16 }}>{lang.flag}</span>
      <span style={{ fontWeight: active ? 600 : 400 }}>{lang.label}</span>
      {!lang.launched
        ? <span style={{ fontSize: 8, color: "#333", fontFamily: "monospace", letterSpacing: "0.06em" }}>{lang.launchDate}</span>
        : !active && <span style={{ fontSize: 8, color: lang.accentColor, fontFamily: "monospace" }}>live</span>
      }
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic panel component — shows per-term request outcomes
function DiagnosticPanel({ diagnostics, globalMode, lang }) {
  const [open, setOpen] = useState(false);

  const modeColor = {
    SUCCESS: "#22c55e",
    RATE_429: "#f59e0b",
    CORS: "#ef4444",
    TIMEOUT: "#f59e0b",
    HTTP_ERR: "#ef4444",
    PARTIAL_CORS: "#f59e0b",
    PARTIAL_429: "#f59e0b",
  };

  const modeLabel = {
    SUCCESS: "✓ Connected",
    RATE_429: "⚠ Rate limited",
    CORS: "✗ CORS block — sandbox limitation",
    TIMEOUT: "⚠ Timeout",
    HTTP_ERR: "✗ HTTP error",
    PARTIAL_CORS: "~ Partial — some terms CORS blocked",
    PARTIAL_429: "~ Partial — some terms rate limited",
  };

  const modeAdvice = {
    CORS: "The browser sandbox is blocking requests before they reach Substack. Host this tool on your own domain and it will work.",
    RATE_429: `Substack throttled us. Retry-After: ${diagnostics.find(d => d.retryAfter)?.retryAfter || "unknown"}. Wait and try again.`,
    TIMEOUT: `Requests timed out after ${FETCH_TIMEOUT_MS / 1000}s. Substack may be slow or blocking. Try again shortly.`,
    HTTP_ERR: "Substack returned an unexpected error. Check the status codes below.",
    PARTIAL_CORS: "Some terms were blocked by CORS. Results are incomplete. Host on your own domain for full access.",
    PARTIAL_429: "Some terms were rate limited. Results are incomplete. Wait a moment and retry.",
    SUCCESS: null,
  };

  if (!diagnostics.length) return null;

  return (
    <div style={{ marginBottom: 16, animation: "fadeUp 0.3s ease both" }}>
      <div style={{
        background: "#0a0a0a",
        border: `1px solid ${modeColor[globalMode] || "#1e1e1e"}22`,
        borderLeft: `3px solid ${modeColor[globalMode] || "#1e1e1e"}`,
        borderRadius: 2, padding: "10px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: modeColor[globalMode] || "#555", letterSpacing: "0.08em" }}>
            {modeLabel[globalMode] || globalMode}
          </span>
          <button onClick={() => setOpen(!open)} style={{
            background: "transparent", border: "none", color: "#333",
            fontSize: 10, fontFamily: "monospace", cursor: "pointer",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {open ? "hide" : "details"} ↕
          </button>
        </div>

        {modeAdvice[globalMode] && (
          <div style={{ fontSize: 11, color: "#555", marginTop: 6, lineHeight: 1.6, fontStyle: "italic" }}>
            {modeAdvice[globalMode]}
          </div>
        )}

        {open && (
          <div style={{ marginTop: 12, borderTop: "1px solid #111", paddingTop: 12 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 80px 50px 60px",
              gap: "4px 12px",
              fontSize: 9, fontFamily: "monospace", color: "#333",
              letterSpacing: "0.08em", textTransform: "uppercase",
              marginBottom: 6,
            }}>
              <span>Term</span><span>Status</span><span>Mode</span><span>Results</span><span>Time</span>
            </div>
            {diagnostics.map((d, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 80px 50px 60px",
                gap: "4px 12px",
                fontSize: 10, fontFamily: "monospace",
                padding: "4px 0",
                borderBottom: "1px solid #0e0e0e",
                color: d.mode === "SUCCESS" ? "#555" : d.mode === "CORS" || d.mode === "HTTP_ERR" ? "#ef444488" : "#f59e0b88",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.term}</span>
                <span>{d.status ?? "—"}</span>
                <span>{d.mode}</span>
                <span>{d.count || "—"}</span>
                <span>{d.ms ? `${d.ms}ms` : "—"}</span>
              </div>
            ))}
            {diagnostics.some(d => d.retryAfter) && (
              <div style={{ marginTop: 8, fontSize: 10, color: "#f59e0b", fontFamily: "monospace" }}>
                Retry-After: {diagnostics.find(d => d.retryAfter)?.retryAfter}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const LANGS = Object.values(FINGERPRINTS);
  const [activeLang, setActiveLang] = useState(LANGS[0]);
  const [results, setResults] = useState([]);
  const [fingerprintMap, setFingerprintMap] = useState({});
  const [aiScores, setAiScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [filterHigh, setFilterHigh] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [globalMode, setGlobalMode] = useState(null);

  const runSearch = useCallback(async (lang) => {
    setLoading(true); setError(null); setResults([]);
    setFingerprintMap({}); setAiScores([]);
    setDiagnostics([]); setGlobalMode(null);
    setSearched(true);

    try {
      const { pubs, diagnostics: diag, globalMode: gm } = await fetchSubstackResults(
        lang,
        (liveDiag) => setDiagnostics(liveDiag) // stream updates as terms resolve
      );

      setDiagnostics(diag);
      setGlobalMode(gm);

      if (pubs.length === 0) {
        setLoading(false);
        return;
      }

      // Run fingerprint engine on each result
      const fpMap = {};
      pubs.forEach(p => {
        const text = (p.name || "") + " " + (p.description || "");
        fpMap[p.subdomain || p.id] = identifyLanguage(text);
      });
      setFingerprintMap(fpMap);

      // Sort by fingerprint score for this language
      const sorted = [...pubs].sort((a, b) => {
        const aKey = a.subdomain || a.id;
        const bKey = b.subdomain || b.id;
        const aScore = fpMap[aKey]?.find(x => x.lang.code === lang.code)?.score || 0;
        const bScore = fpMap[bKey]?.find(x => x.lang.code === lang.code)?.score || 0;
        return bScore - aScore;
      });

      setResults(sorted);
      setLoading(false);

      if (sorted.length > 0) {
        setAiLoading(true);
        const ai = await getAiScores(sorted, lang);
        setAiScores(ai);
        setAiLoading(false);
      }
    } catch (e) {
      setError("Unexpected error. Check diagnostics.");
      setLoading(false);
    }
  }, []);

  const handleLang = (lang) => {
    setActiveLang(lang);
    setResults([]); setAiScores([]);
    setSearched(false); setError(null);
    setDiagnostics([]); setGlobalMode(null);
  };

  const romance = LANGS.filter(l => l.family === "Romance");
  const other = LANGS.filter(l => l.family !== "Romance");

  const displayed = filterHigh
    ? results.filter((_, i) => (aiScores[i]?.score || 0) >= 7)
    : results;

  return (
    <div style={{ minHeight: "100vh", background: "#111111", color: "#e8e0d4", fontFamily: "'Georgia', serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 3px }
        ::-webkit-scrollbar-thumb { background: #1e1e1e }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #111", padding: "44px 32px 32px", maxWidth: 880, margin: "0 auto", animation: "fadeUp 0.5s ease both" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#333", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14 }}>
          The Marginal Pilgrims · Discovery Tools
        </div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 400, color: "#f0ebe3", margin: "0 0 10px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
          Lingua
        </h1>
        <p style={{ fontSize: 14, color: "#888", margin: "0 0 4px", fontStyle: "italic", lineHeight: 1.7, maxWidth: 460 }}>
          Substack discovery for the non-English world. One language at a time.
        </p>
        <p style={{ fontSize: 10, color: "#2a2a2a", fontFamily: "monospace", margin: 0, letterSpacing: "0.05em" }}>
          8-layer linguistic fingerprint engine · Romance family first
        </p>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 32px 0" }}>

        {/* Lang tabs */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#222", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Romance Family</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {romance.map(l => <LangTab key={l.code} lang={l} active={activeLang.code === l.code} onClick={() => handleLang(l)} />)}
          </div>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#1a1a1a", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Expanding Later</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {other.map(l => <LangTab key={l.code} lang={l} active={false} onClick={() => {}} />)}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderTop: "1px solid #111", borderBottom: "1px solid #111", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{activeLang.flag} <span style={{ color: "#f0ebe3" }}>{activeLang.label}</span></div>
            <div style={{ fontSize: 11, color: "#333", fontStyle: "italic" }}>{activeLang.description}</div>
          </div>
          {activeLang.launched ? (
            <button onClick={() => runSearch(activeLang)} disabled={loading} style={{
              background: loading ? "#0e0e0e" : activeLang.accentColor,
              color: loading ? "#333" : "#000",
              border: "none", borderRadius: 2, padding: "11px 24px",
              fontSize: 12, fontFamily: "'Georgia', serif", cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600, letterSpacing: "0.03em", transition: "all 0.2s",
            }}>
              {loading ? "Searching…" : `Discover ${activeLang.label}`}
            </button>
          ) : (
            <span style={{ fontSize: 10, color: "#222", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Launching {activeLang.launchDate}
            </span>
          )}
        </div>

        {/* Status */}
        {searched && !loading && results.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, animation: "fadeUp 0.3s ease both" }}>
            <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>
              {results.length} found
              {aiLoading && <span style={{ color: activeLang.accentColor, animation: "pulse 1.2s infinite", marginLeft: 10 }}>· AI scoring…</span>}
              {!aiLoading && aiScores.length > 0 && <span style={{ color: "#2a2a2a", marginLeft: 10 }}>· 8-layer fingerprint + AI scored</span>}
            </div>
            {aiScores.length > 0 && (
              <button onClick={() => setFilterHigh(!filterHigh)} style={{
                background: filterHigh ? activeLang.accentColor : "transparent",
                color: filterHigh ? "#000" : "#444",
                border: `1px solid ${filterHigh ? activeLang.accentColor : "#1e1e1e"}`,
                borderRadius: 2, padding: "4px 10px", fontSize: 10,
                fontFamily: "monospace", cursor: "pointer",
                letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.2s",
              }}>
                {filterHigh ? "Show All" : "High Confidence"}
              </button>
            )}
          </div>
        )}

        {/* Diagnostic panel — always shown after search */}
        {searched && diagnostics.length > 0 && (
          <DiagnosticPanel diagnostics={diagnostics} globalMode={globalMode} lang={activeLang} />
        )}

        {/* Generic error fallback */}
        {error && (
          <div style={{ background: "#0a0707", border: "1px solid #1a1010", borderLeft: `3px solid #ef4444`, padding: "14px 18px", borderRadius: 2, marginBottom: 14, fontSize: 12, color: "#666", lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: "#0c0c0c", border: "1px solid #111", borderRadius: 2, padding: "18px 22px", marginBottom: 2, opacity: 1 - i * 0.12 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, background: "#141414", borderRadius: 3, animation: "pulse 1.5s infinite" }} />
              <div>
                <div style={{ width: 140, height: 12, background: "#141414", borderRadius: 2, marginBottom: 5, animation: "pulse 1.5s infinite" }} />
                <div style={{ width: 70, height: 8, background: "#0e0e0e", borderRadius: 2, animation: "pulse 1.5s infinite" }} />
              </div>
            </div>
            <div style={{ width: "75%", height: 10, background: "#0e0e0e", borderRadius: 2, animation: "pulse 1.5s infinite" }} />
          </div>
        ))}

        {/* Results */}
        {!loading && displayed.map((pub, i) => {
          const key = pub.subdomain || pub.id;
          return (
            <NewsletterCard key={key} pub={pub} aiData={aiScores[results.indexOf(pub)] || null}
              lang={activeLang} index={i} fingerprintScores={fingerprintMap[key] || null} />
          );
        })}

        {/* Empty */}
        {!loading && searched && results.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#222", fontStyle: "italic", fontSize: 14, animation: "fadeUp 0.4s ease both" }}>
            No results. Substack may be rate-limiting.<br />
            <span style={{ fontSize: 11, color: "#1a1a1a", marginTop: 6, display: "block" }}>Try again in a moment.</span>
          </div>
        )}

        {/* Pre-search — fingerprint methodology */}
        {!searched && !loading && (
          <div style={{ paddingTop: 40, animation: "fadeUp 0.5s ease both 0.15s both" }}>
            <div style={{ borderLeft: `2px solid ${activeLang.accentColor}`, paddingLeft: 18, marginBottom: 36 }}>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.9, marginBottom: 8 }}>
                Lingua uses an 8-layer linguistic fingerprint engine — not keywords — to find newsletters written in each language.
              </div>
              <div style={{ fontSize: 11, color: "#2a2a2a", fontFamily: "monospace", lineHeight: 2 }}>
                1. Exclusive characters & nasal vowels<br />
                2. Special character patterns & elision<br />
                3. Possessive pronouns<br />
                4. Fused prepositions<br />
                5. Negation particles & patterns<br />
                6. Pronoun + existential verb pairs<br />
                7. Minimal pairs between languages<br />
                8. Stopword confirmation
              </div>
            </div>

            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#1a1a1a", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14 }}>Roadmap</div>
            {LANGS.map(l => (
              <div key={l.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #0e0e0e" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 14 }}>{l.flag}</span>
                  <span style={{ fontSize: 12, color: l.launched ? "#d0c8be" : "#222" }}>{l.label}</span>
                  <span style={{ fontSize: 10, color: "#222", fontStyle: "italic" }}>{l.description}</span>
                </div>
                <span style={{ fontSize: 9, fontFamily: "monospace", color: l.launched ? activeLang.accentColor : "#1a1a1a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {l.launched ? "● Live" : l.launchDate}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #0e0e0e", fontSize: 11, color: "#1a1a1a", fontStyle: "italic", lineHeight: 1.8 }}>
              "The grammar is archaeology. Every word is a dig site."<br />
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "#161616" }}>— The Marginal Pilgrims</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #0e0e0e", fontSize: 10, color: "#1a1a1a", fontFamily: "monospace", display: "flex", justifyContent: "space-between", letterSpacing: "0.08em" }}>
          <span>LINGUA · THE MARGINAL PILGRIMS</span>
          <span>v2.0 · 8-LAYER ENGINE</span>
        </div>
      </div>
    </div>
  );
}
