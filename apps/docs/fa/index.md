# راهنمای شروع با Project Forge

<div dir="rtl">

## Project Forge چیست؟

Project Forge یک ابزار خط فرمان (CLI) رایگان و متن‌باز است که پروژه‌های full-stack آمادهٔ تولید را از ماژول‌های قابل ترکیب می‌سازد. به جای هفته‌ها تنظیم boilerplate، در چند دقیقه یک پروژهٔ کامل با TypeScript، React، Hono، Cloudflare Workers، احراز هویت، کنترل دسترسی و… تحویل می‌گیرید.

**ویژگی‌های اصلی:**

- **محلی و مستقل:** هیچ سرویس ابری یا حساب کاربری نیاز ندارد.
- **قطعی (Deterministic):** هر بار با ورودی یکسان، خروجی یکسان تولید می‌کند.
- **تراکنشی (Transactional):** یا همه‌چیز با موفقیت اعمال می‌شود، یا همه‌چیز به حالت قبل برمی‌گردد.
- **مالکیت شما:** تمام کد تولیدشده متعلق به شماست؛ هیچ قفل فروشندگی (vendor lock-in) وجود ندارد.
- **افزودن ماژول:** احراز هویت، پایگاه داده، کنترل دسترسی، داشبورد و… را با یک دستور اضافه کنید.

## پیش‌نیازها

- **Node.js** نسخهٔ ۲۴ یا بالاتر
- **pnpm** نسخهٔ ۱۱ یا بالاتر

برای نصب pnpm:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## ساخت اولین پروژه

یک پوشهٔ موقت بسازید و پروژه را ایجاد کنید:

```bash
mkdir my-workspace
cd my-workspace
projectforge create my-app
```

خروجی مورد انتظار:

```
Created project "my-app" with starter "default" at .../my-workspace/my-app
```

با `--dry-run` می‌توانید نقشهٔ عملیات را بدون اعمال تغییر ببینید:

```bash
projectforge create my-app --dry-run
```

## افزودن ماژول

وارد پوشهٔ پروژه شوید و ماژول اضافه کنید:

```bash
cd my-app
projectforge add comments
```

این دستور `comments` را به همراه وابستگی‌هایش (`auth` و `database-d1`) نصب می‌کند.

ماژول‌های موجود:

| ماژول | توضیح |
|---|---|
| `database-d1` | پایگاه داده D1 با Drizzle ORM و migration |
| `auth` | احراز هویت با Better Auth |
| `rbac` | کنترل دسترسی مبتنی بر نقش |
| `user-dashboard` | داشبورد کاربر |
| `admin-dashboard` | داشبورد مدیریت |
| `comments` | سیستم نظرات |

برای دیدن نقشهٔ عملیات پیش از اجرا:

```bash
projectforge plan comments --json
projectforge explain comments
```

## اجرای Migration

بعد از افزودن ماژول‌های پایگاه داده، migrationها را اجرا کنید:

```bash
node migrations/runner.mjs
```

## اجرای بررسی‌ها

پس از نصب وابستگی‌ها و اجرای migration:

```bash
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

## فایل‌های پروژه: مدیریت‌شده، تولیدشده و متعلق به کاربر

Project Forge سه نوع فایل را مدیریت می‌کند:

### فایل‌های مدیریت‌شده توسط ماژول (Module-managed)

فایل‌هایی که ماژول‌ها ایجاد می‌کنند — مانند `apps/api/src/features/auth/index.ts`. این فایل‌ها توسط Factory ردیابی می‌شوند و **نباید مستقیماً ویرایش شوند**. اگر آن‌ها را تغییر دهید، Factory از overwrite خودداری می‌کند و خطای `PF_USER_MODIFIED_MANAGED_FILE` می‌دهد.

### فایل‌های تولیدشده توسط Factory (Factory-generated)

فایل‌هایی که Factory به‌طور خودکار از روی اطلاعات ماژول‌ها می‌سازد — مانند `apps/api/src/features/index.ts` و `apps/web/src/features/index.tsx`. این فایل‌ها **هرگز نباید دستی ویرایش شوند**. Factory در هر عملیات `add` یا `sync` آن‌ها را بازتولید می‌کند.

### فایل‌های متعلق به کاربر (User-owned)

تمام فایل‌هایی که خودتان ایجاد می‌کنید یا در template اولیه وجود دارند و توسط Factory ردیابی نمی‌شوند. این فایل‌ها **هرگز توسط Factory حذف یا overwrite نمی‌شوند**.

## رفتار Lock و جلوگیری از overwrite

فایل `projectforge-lock.json` شامل checksum و provenance برای هر فایل مدیریت‌شده است. پیش از هر تغییر، Factory checksum فعلی را با مقدار ثبت‌شده مقایسه می‌کند. اگر فایلی توسط کاربر تغییر کرده باشد، عملیات متوقف می‌شود تا از دست رفتن تغییرات شما جلوگیری شود.

## مسیر رفع خطاهای رایج

| خطا | علت | راه‌حل |
|---|---|---|
| `PF_NOT_A_PROJECT` | در پوشه‌ای که پروژه نیست دستور اجرا کرده‌اید | وارد پوشهٔ پروژه شوید (جایی که `projectforge.json` دارد) |
| `PF_USER_MODIFIED_MANAGED_FILE` | فایل مدیریت‌شده را دستی تغییر داده‌اید | فایل را به حالت اول برگردانید یا از یک مسیر extension استفاده کنید |
| `PF_PROJECT_LOCKED` | یک عملیات Factory دیگر در حال اجراست | صبر کنید تا عملیات قبلی تمام شود |
| `PF_MODULE_NOT_FOUND` | نام ماژول اشتباه است | با `projectforge list` لیست ماژول‌ها را ببینید |

برای دیدن کدهای خطای کامل: [Error Codes Reference](/reference/errors)

## هشدار: قابلیت‌های موجود و قابلیت‌های آینده

**قابلیت‌های موجود در نسخهٔ فعلی:**

- ساخت پروژه با `create`
- افزودن ماژول با `add`
- بررسی وضعیت با `status` و `doctor`
- اجرای migration با `migrations/runner.mjs`
- خروجی JSON برای automation

**قابلیت‌هایی که هنوز پیاده‌سازی نشده‌اند:**

- `sync` کامل مبتنی بر diff
- bundled registry (در حال حاضر registry از مسیر محلی خوانده می‌شود)
- اجرای خودکار migration توسط executor
- remote registry
- deploy automation

اگر در مستندات به این قابلیت‌ها برخوردید، بدانید که برای نسخه‌های آینده برنامه‌ریزی شده‌اند.

## گام بعدی

- [راهنمای سریع](/start/quickstart) — مسیر پنج‌دقیقه‌ای
- [رفع خطاهای Windows](/troubleshooting/windows) — اگر روی Windows هستید

</div>
