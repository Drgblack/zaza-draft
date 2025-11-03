---
title: Wireframe Planning for Zaza Promptly (MVP)
---

**App Purpose:**\
To let teachers quickly:

-   Generate AI-powered feedback phrases

-   Save & organise them in a personal Snippet Bank

# App Structure & Navigation (Wireframe Skeleton)

**1. Welcome / Login Screen**

-   Google Login (Firebase Auth)

-   Option: "Continue as Guest" (if we want to delay Auth)

**2. Home Screen -- Phrase Generator**

-   **Input Field**: "Describe the situation" (e.g. "Year 6, Maths,
    needs encouragement")

-   **Generate Button**

-   **AI Output**: List of 3--5 suggested phrases

-   **Action Icons**: Save ✦ / Regenerate 🔁 / Copy 📋

**3. Saved Snippets Screen**

-   List of user-saved snippets

-   Tags visible (e.g. "growth mindset", "report card")

-   Edit / Delete icons for each snippet

-   "Add Tag" or filter by tag

**4. Settings / Profile (Optional for MVP)**

-   View plan (Free/Pro)

-   API usage stats (optional)

-   Logout

**🔁 Bottom Navigation (3 Tabs for MVP)**

-   🪄 Generate

-   💾 Snippets

-   ⚙️ Settings (optional)

**🛠️ MVP Features to Map to Screens**

  -----------------------------------------------------------------------
  **Feature**                             **Wireframe Section**
  --------------------------------------- -------------------------------
  AI Comment Generator                    Home Screen

  Save to Snippet Bank                    Save button next to output

  View & manage saved phrases             Snippets Screen

  Tags / Filters (basic tagging only)     Snippets Screen (tag view)

  Authentication                          Login/Welcome

  Freemium gating (5 generations/mo)      Usage counter or popup alert
  -----------------------------------------------------------------------

**Next Steps:**

1.  **Create these wireframe pages** in FlutterFlow (or pen/paper
    first):

    -   Welcome / Login

    -   Home (Generator)

    -   Snippet Bank

    -   Settings

2.  **Use drag-and-drop widgets** in FlutterFlow to build each screen's
    layout

3.  Once wireframed, we'll connect:

    -   Firestore DB for saving snippets

    -   OpenAI API for generation

    -   Firebase Auth for user login

    -   Usage tracking logic for freemium model
