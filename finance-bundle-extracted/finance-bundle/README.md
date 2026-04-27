# Finance + Member-Search + Transparency — Portable Bundle

3টি page (Finance, MemberSearch, Transparency) এবং তাদের সব dependency একসাথে — অন্য React/Vite/Supabase project-এ drop করে ব্যবহার করার জন্য তৈরি।

> **Note:** কোডের ভেতরে "Chandanaish Darbar Sharif" hard-coded আছে কয়েক জায়গায় (PDF header, hero text)। Search-replace করে নিজের সংস্থার নাম বসিয়ে নিন।

---

## ১. কী আছে এই bundle-এ

```
src/
├── pages/
│   ├── Finance.tsx          ← অর্থব্যবস্থাপনা ড্যাশবোর্ড (charts + admin)
│   ├── MemberSearch.tsx     ← সদস্য কোড দিয়ে বার্ষিক বিবরণী খুঁজুন
│   ├── MemberProfile.tsx    ← /member/:id (MemberSearch এ link করা)
│   └── Transparency.tsx     ← স্বচ্ছতা / পাবলিক সারসংক্ষেপ
├── lib/
│   ├── statement.ts         ← সব PDF/CSV report builder (jsPDF)
│   ├── pdfFont.ts           ← Bengali font loader
│   ├── dues.ts              ← বকেয়া হিসাব
│   ├── validation.ts        ← Data integrity report
│   ├── bangla.ts, months.ts, utils.ts
├── components/
│   ├── layout/              ← Header, Footer, Layout, NoticeBar
│   ├── ui/                  ← shadcn-ui (button, input, dialog, ...)
│   ├── SectionHeader.tsx, NavLink.tsx
├── hooks/                   ← useAuth, use-toast, use-mobile
├── integrations/supabase/   ← client + types
└── index.css                ← Design tokens (gold/dark theme)

public/fonts/
└── NotoSansBengali-Regular.ttf

supabase/migrations/
└── 00000000000000_finance_schema.sql   ← Drop-in DB schema + RLS

.env.example
package.snippet.json        ← যেগুলো install করতে হবে
tailwind.config.ts, postcss.config.js, components.json
```

---

## ২. Setup (নতুন project-এ)

### Step 1 — Files copy করুন
```bash
# নতুন project root থেকে
cp -r path/to/this-bundle/src/* ./src/
cp -r path/to/this-bundle/public/fonts ./public/
cp -r path/to/this-bundle/supabase ./
cp path/to/this-bundle/tailwind.config.ts ./
cp path/to/this-bundle/.env.example ./.env
```

### Step 2 — Dependencies install
`package.snippet.json` থেকে dependencies merge করে:
```bash
bun install   # বা npm install
```

### Step 3 — Supabase
- নতুন Supabase project বানান।
- `supabase/migrations/00000000000000_finance_schema.sql` SQL Editor-এ run করুন।
- `.env`-এ আপনার project URL ও anon key বসান।

### Step 4 — Routes
আপনার `App.tsx`-এ যোগ করুন:
```tsx
import Finance from '@/pages/Finance';
import MemberSearch from '@/pages/MemberSearch';
import MemberProfile from '@/pages/MemberProfile';
import Transparency from '@/pages/Transparency';

<Routes>
  <Route path="/finance" element={<Finance />} />
  <Route path="/member-search" element={<MemberSearch />} />
  <Route path="/member/:id" element={<MemberProfile />} />
  <Route path="/transparency" element={<Transparency />} />
</Routes>
```

`AuthProvider`-এ wrap করুন:
```tsx
import { AuthProvider } from '@/hooks/useAuth';
<AuthProvider><App /></AuthProvider>
```

---

## ৩. Customize করার জায়গা

| জিনিস | ফাইল | লাইন |
|------|------|------|
| সংস্থার নাম (PDF header) | `src/lib/statement.ts` | `'Chandanaish Darbar Sharif'` খুঁজে replace |
| সংস্থার নাম (page hero) | `src/pages/Finance.tsx` | `অর্থ সংগ্রহ ও ব্যবস্থাপনা` line |
| Theme color (gold) | `src/index.css` | `--primary`, `--gradient-gold` |
| Default monthly rate | `supabase/migrations/...sql` | `monthly_rate numeric DEFAULT 500` |
| Layout / Header logo | `src/components/layout/Header.tsx` | নিজের logo বসান |

---

## ৪. Initial data

প্রথমে একজন admin বানাতে — সদস্য signup করার পর Supabase SQL Editor:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('আপনার-auth-user-id', 'admin');
```

তারপর `/finance` থেকে admin-mode চালু করে সদস্য + payment + expense যোগ করতে পারবেন।

---

## ৫. Features

- **Finance dashboard:** ৬ tab — সারসংক্ষেপ, ব্যক্তিগত হিসাব, বকেয়া, স্বচ্ছতা, র‍্যাঙ্কিং, অ্যাডমিন
- **Recharts:** বার্ষিক প্রবাহ (income/expense/balance), বকেয়া trend, ক্যাটাগরি pie, এলাকা bar
- **PDF rendering:** Bengali font সহ মাসিক/বার্ষিক/area-wise/combined রিপোর্ট, individual receipt, validation report
- **Member search:** কোড দিয়ে বার্ষিক বিবরণী, status filter, print-friendly layout
- **Transparency page:** public view — মোট আয়/খরচ/balance/সক্রিয় সদস্য + recent transactions

---

## ৬. Known caveats

- `useAuth.tsx` Supabase auth-নির্ভর — অন্য auth system হলে এই hook re-write করতে হবে।
- PDF গুলো Noto Sans Bengali font embed করে — `public/fonts/NotoSansBengali-Regular.ttf` অবশ্যই deploy-এ থাকতে হবে।
- Charts dark theme এর জন্য টিউন করা; light theme-এ axis কালার `index.css` থেকে adjust করুন।
- কিছু shadcn ui component file বাকি থাকতে পারে — error দেখালে `bunx shadcn@latest add <name>` দিয়ে যোগ করুন।
