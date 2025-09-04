# TRE1929 Date & Crash Triage Report
**Timestamp:** 1756989718  
**Phase:** Emergency hotfix for event card dates + production crashes

## Phase 1 - READ-ONLY Analysis Results

### 1. DB Snapshot (Events 43, 44, 45)
```
id=43: "An Evening of Fine Dining & Music: Sophia Su with Artists of The Arizona Opera"
date: "2025-09-10 01:30:00" (DB format - no timezone)
is_active: true

id=44: "An Evening of Fine Dining & Music: Sophia Su with Artists of The Arizona Opera"  
date: "2025-09-13 01:30:00" (DB format - no timezone)
is_active: true

id=45: "An Evening of Fine Dining & Music: Featuring Renowned Pianist Dr. Fanya Lin"
date: "2025-09-20 01:30:00" (DB format - no timezone)
is_active: true
```

### 2. Phoenix Timezone Conversions (Expected)
- Event 43: **Tue, Sep 9 at 6:30 PM**
- Event 44: **Fri, Sep 12 at 6:30 PM**  
- Event 45: **Fri, Sep 19 at 6:30 PM**

### 3. Frontend Date Pipeline Analysis

**EventCard.tsx** (Line 67):
```typescript
<div className="font-semibold text-foreground">{formatPhoenixDate(event.date, "EEEE, MMMM d, yyyy")}</div>
```

**EventDetails.tsx** (Line 118):
```typescript
<span className="text-2xl md:text-3xl leading-relaxed font-semibold">
  {formatPhoenixDate(event.date, "EEEE, MMMM d, yyyy")}
</span>
```

**timezone.ts** (Line 10):
```typescript
export function formatPhoenixDate(date: Date | string, format: string = 'EEEE, MMMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, PHOENIX_TZ, format);
}
```

### 4. Root Cause Classification

**PRIMARY: TZ_PARSE**
- DB returns "YYYY-MM-DD HH:mm:ss" format (no timezone indicator)
- `new Date("2025-09-10 01:30:00")` may be interpreted in browser's local timezone
- This can cause incorrect timezone conversion in `formatInTimeZone()`

**SECONDARY: CONST_FALLBACK** 
- Found hardcoded "August 14, 2025" in email template: `send-template-emails.cjs:193`
- Could indicate shared date constants affecting other components

### 5. Production Build & Crash Analysis

✅ **Build Status:** Production build completed successfully  
⚠️ **Potential Crash Vectors:**
- `event.image` access without null check (EventCard.tsx:51)
- `formatPriceDisplay(event)` without function existence check
- Missing optional chaining for undefined event properties

### 6. Hardcoded Date Search Results
- ❌ No literal "Aug 14" found in current EventCard/EventDetails components
- ⚠️ Found in email templates and documentation files only
- ✅ Event rendering uses dynamic `event.date` field

## Minimal Fix Plan

### Phase 2 Actions Required:

1. **Create timezone-safe date utility** - Replace `new Date(string)` with UTC-aware parsing
2. **Add null-safety guards** - Protect against undefined event properties  
3. **Test Phoenix date rendering** - Verify Sept 9/12/19 display correctly
4. **Crash hardening** - Add optional chaining for `event.image`, `event.artists` etc.

### Files to Modify:
- `client/src/lib/datetime.ts` (create/replace)
- `client/src/components/events/EventCard.tsx` (null safety)
- `client/src/components/events/EventDetails.tsx` (null safety)

**Confidence Level:** HIGH - Root cause identified as timezone parsing issue with secondary crash safety concerns.