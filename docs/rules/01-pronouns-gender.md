# Zaza Draft - Pronoun & Gender Rules
## Name-Gender Matching with 33,822 Name Database

**Version:** 3.0  
**Last Updated:** November 2025

---

## 🎯 CORE PRINCIPLE

**Always use the correct pronouns based on the student's name as recorded in our global name database.**

We have **33,822 names** across 9 languages with gender associations. This database drives pronoun selection to ensure:
- **Accuracy:** Respect cultural name-gender associations
- **Consistency:** Use same pronouns throughout entire text
- **Professionalism:** Never mix pronouns incorrectly

---

## 📊 NAME DATABASE COVERAGE

| Language | Names | Coverage |
|----------|-------|----------|
| 🇬🇧 English | 29,054 | 99%+ of English-speaking classrooms |
| 🇩🇪 German | 1,002 | German, Austrian, Swiss names |
| 🇪🇸 Spanish | 572 | Spain + Latin America |
| 🇫🇷 French | 567 | France, Belgium, Quebec, Africa |
| 🇮🇹 Italian | 564 | Italy, Switzerland |
| 🇳🇱 Dutch | 523 | Netherlands, Belgium |
| 🇵🇹 Portuguese | 510 | Portugal, Brazil, Angola |
| 🇵🇱 Polish | 504 | Poland, diaspora |
| 🇸🇦 Arabic | 525 | Middle East, North Africa |

---

## 🔍 PRONOUN SELECTION PROCESS

### Step 1: Check Name Database
```
INPUT: Student name (e.g., "Sarah", "Michael", "Jordan")
LOOKUP: Query name database by name
RETURN: Gender tag (f/m/u)
```

### Step 2: Apply Pronoun Rules

| Database Tag | Subject | Object | Possessive | Possessive Pronoun | Reflexive |
|--------------|---------|--------|------------|-------------------|-----------|
| **f** (female) | she | her | her | hers | herself |
| **m** (male) | he | him | his | his | himself |
| **u** (unknown/neutral) | they | them | their | theirs | themselves |

### Step 3: Enforce Consistency
- **ALL references** to the student in the same message MUST use the same pronoun set
- **Never mix** pronouns (e.g., "she... them..." is WRONG)
- **Recheck** after every generation

---

## ✅ CORRECT PRONOUN USAGE EXAMPLES

### Female Name (f): Sarah
❌ **WRONG:** "Sarah wrote a great essay. **They** demonstrated excellent research skills."  
✅ **CORRECT:** "Sarah wrote a great essay. **She** demonstrated excellent research skills."

### Male Name (m): Michael  
❌ **WRONG:** "Michael struggles with focus. **She** would benefit from shorter tasks."  
✅ **CORRECT:** "Michael struggles with focus. **He** would benefit from shorter tasks."

### Neutral/Unknown (u): Jordan
❌ **WRONG:** "Jordan completed the project. **He** showed creativity."  
✅ **CORRECT:** "Jordan completed the project. **They** showed creativity."

---

## 🌍 CROSS-CULTURAL CONSIDERATIONS

### Names That Appear in Multiple Cultures
Some names exist across cultures with different gender associations:
- **Andrea:** Female in English, Male in Italian
- **Andrea:** Female in English, Male in German
- **Robin:** Neutral in English, Male in German
- **Ashley:** Historically male (UK), now mostly female (US)

**SOLUTION:** Use the locale-specific entry when available:
```
"Andrea" + locale=en → f (female)
"Andrea" + locale=it → m (male)
"Andrea" + locale=de → m (male)
```

If no locale specified, use the **most common** association in the database (usually English).

---

## 🤔 NON-BINARY & GENDER-NEUTRAL HANDLING

### When to Use "They/Them"

Use gender-neutral pronouns (they/them/their) when:
1. **Name not in database** (unknown names)
2. **Explicitly marked as 'u'** (unknown/neutral) in database
3. **Teacher explicitly requests** neutral pronouns
4. **Name is culturally ambiguous** (e.g., Taylor, Jordan, Alex)

### Modern Gender-Neutral Names
These names are increasingly used for all genders and default to "they":
- Alex, Jordan, Taylor, Riley, Cameron
- Sage, River, Sky, Phoenix, Rowan
- Avery, Quinn, Blake, Casey, Morgan

### Database Strategy
- Mark ambiguous names as **'u' (unknown)**
- Default to **they/them** for safety
- **Never assume** based on stereotypes

---

## 🔄 PRONOUN CONSISTENCY CHECKLIST

Before finalizing ANY text, verify:

✅ **All pronouns match** the database lookup  
✅ **No mixed pronouns** in same message  
✅ **Subject-verb agreement** is correct (she **is**, they **are**)  
✅ **Possessive forms** are correct (her book, their books)  
✅ **Reflexive pronouns** match (herself, themselves)  

---

## 🚨 COMMON ERRORS TO AVOID

### Error 1: Mixing Pronouns
❌ "Sarah is a great student. **They** work hard in class. **She** always submits on time."  
✅ "Sarah is a great student. **She** works hard in class. **She** always submits on time."

### Error 2: Wrong Possessive
❌ "Michael's homework is incomplete. **Their** effort has decreased."  
✅ "Michael's homework is incomplete. **His** effort has decreased."

### Error 3: Subject-Verb Disagreement
❌ "Jordan are struggling with math."  
✅ "Jordan **is** struggling with math." (Jordan = singular "they")

### Error 4: Assuming Gender
❌ Using "he" for "Riley" without checking database  
✅ Check database first → If marked 'u', use "they"

---

## 🎓 PEDAGOGICAL NOTES

### Why This Matters:
1. **Respect:** Students and families notice when pronouns are wrong
2. **Professionalism:** Incorrect pronouns undermine teacher credibility
3. **Inclusion:** Gender-neutral options support all students
4. **Accuracy:** Database-driven = fewer mistakes

### Teacher Controls:
Teachers can override database defaults:
- Select from dropdown: "Auto / He / She / They"
- Auto = Use database lookup (default)
- Manual selection overrides database

---

## 📋 VALIDATION RULES

### Pre-Generation Checks:
```
1. Student name provided? YES/NO
2. Name found in database? YES/NO/AMBIGUOUS
3. Gender tag retrieved? f/m/u
4. Teacher override present? YES/NO
5. Final pronoun set selected? she/he/they
```

### Post-Generation Checks:
```
1. Count pronoun instances
2. Verify all match selected set
3. Check subject-verb agreement
4. Validate possessive forms
5. Confirm no mixed pronouns
```

**If ANY check fails:** Regenerate with pronoun repair prompt.

---

## 🔧 TECHNICAL IMPLEMENTATION

### Database Query Format:
```javascript
function getPronoun(studentName, locale = 'en') {
  const nameRecord = nameDatabase.find({
    name: studentName.toLowerCase(),
    locale: locale
  });
  
  if (!nameRecord) return 'they'; // Default to neutral
  
  const genderMap = {
    'f': { subject: 'she', object: 'her', possessive: 'her' },
    'm': { subject: 'he', object: 'him', possessive: 'his' },
    'u': { subject: 'they', object: 'them', possessive: 'their' }
  };
  
  return genderMap[nameRecord.gender];
}
```

---

## 🌐 MULTI-LINGUAL PRONOUN SYSTEMS

### Future Expansion:
When Zaza Draft supports other languages, pronoun rules adapt:

**German (de):**
- er/sie/es (he/she/it)
- Gender-specific articles (der/die/das)

**Spanish (es):**
- él/ella (he/she)
- Gender-specific adjectives

**French (fr):**
- il/elle (he/she)
- Gender-specific articles (le/la)

**For now:** English-only outputs, but database supports future expansion.

---

## 📚 GOLDEN TEST CASES

### Test 1: Clear Female Name
**Input:** Name = "Emily"  
**Database:** f (female)  
**Expected:** "Emily is making good progress. **She** demonstrates strong reading skills. **Her** homework is consistently complete."

### Test 2: Clear Male Name
**Input:** Name = "Michael"  
**Database:** m (male)  
**Expected:** "Michael needs support with organization. **He** would benefit from a checklist. **His** backpack often lacks materials."

### Test 3: Neutral Name
**Input:** Name = "Jordan"  
**Database:** u (unknown)  
**Expected:** "Jordan is developing well. **They** show creativity in art. **Their** projects are always thoughtful."

### Test 4: Teacher Override
**Input:** Name = "Alex", Teacher selects "She"  
**Override:** Ignore database, use she/her  
**Expected:** "Alex is progressing nicely. **She** participates actively. **Her** contributions enrich discussions."

---

## 🎯 KEY TAKEAWAYS

1. **Always check the database first** - we have 33,822 names
2. **Be consistent** - same pronouns throughout entire message
3. **Default to they/them** when uncertain
4. **Respect teacher overrides** when provided
5. **Never mix pronouns** in same text
6. **Validate before sending** - use automated checks

---

**Remember:** Getting pronouns right is non-negotiable. It's a basic sign of respect and professionalism. Our 33,822-name database gives us world-class accuracy—use it!
