# Dark Mode Implementation Issue

## Problem Identified: 2025-11-02 10:36

Dark mode only affects header component. Rest of app stays in light mode.

## Specific Issues:
1. **Main Editor**
   - Text input card: white background (should be dark:bg-gray-800)
   - Placeholder text: barely visible
   
2. **Insights Dashboard** (CRITICAL)
   - All metric cards: white backgrounds
   - Chart text: hard to read
   - Badge cards: white backgrounds
   - Footer: INVISIBLE (light text on light background)

3. **Footer** (ACCESSIBILITY ISSUE)
   - Links are unreadable in dark mode
   - Copyright text invisible
   - Social icons hard to see

## Solution:
Apply dark: variants to EVERY Tailwind class across ALL components.

Pattern:
- bg-white → add dark:bg-gray-800
- text-gray-900 → add dark:text-gray-100
- border-gray-200 → add dark:border-gray-700

## Testing Checklist:
- [ ] Toggle dark mode on main editor
- [ ] Toggle dark mode on insights dashboard
- [ ] Check footer readability
- [ ] Verify chart axes are visible
- [ ] Test all card backgrounds
- [ ] Verify all text is readable

Status: Prompt created for v0
