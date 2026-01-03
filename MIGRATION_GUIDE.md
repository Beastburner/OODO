# Migration Guide - Insights System

## Issue
You're seeing 404 errors because the `insights` table doesn't exist in your Supabase database:
```
Could not find the table 'public.insights' in the schema cache
```

## Solution: Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`xhdqnoiznivkoxosrooj`)
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20260103150000_insights_system.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
8. Verify success - you should see "Success. No rows returned"

### Option 2: Using Supabase CLI

#### Installing Supabase CLI on Windows

**Method 1: Using Scoop (Recommended for Windows)**

1. Install Scoop (if you don't have it):
   ```powershell
   # Run in PowerShell (as Administrator)
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. Add Supabase bucket:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   ```

3. Install Supabase CLI:
   ```powershell
   scoop install supabase
   ```

4. Verify installation:
   ```powershell
   supabase --version
   ```

**Method 2: Using npm (If you have Node.js)**

```powershell
# Install globally
npm install -g supabase

# Or use npx (no installation needed)
npx supabase --help
```

**Method 3: Direct Download**

1. Go to [Supabase CLI Releases](https://github.com/supabase/cli/releases)
2. Download the Windows executable (`.exe` file)
3. Add it to your PATH or place it in a folder that's in your PATH

#### Using Supabase CLI to Run Migrations

Once installed:

```powershell
# Make sure you're in the project root
cd C:\Users\parth\Desktop\hackathons\OODO\project

# Login to Supabase (first time only)
supabase login

# Link to your project
supabase link --project-ref xhdqnoiznivkoxosrooj

# Push migrations
supabase db push
```

**Note:** You'll need your Supabase access token for `supabase login`. Get it from:
- Supabase Dashboard → Account Settings → Access Tokens

## Verify Migration

After running the migration, verify it worked:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see the `insights` table listed
3. Check that it has the following columns:
   - `id` (uuid)
   - `insight_type` (enum)
   - `severity` (enum)
   - `title` (text)
   - `summary` (text)
   - `explanation` (text, nullable)
   - `affected_user_ids` (uuid[])
   - `affected_roles` (text[])
   - `summary_data` (jsonb)
   - `is_ai_enhanced` (boolean)
   - `created_at` (timestamptz)
   - `acknowledged_at` (timestamptz, nullable)
   - `acknowledged_by` (uuid, nullable)

## After Migration

Once the migration is complete:
1. Refresh your browser/app
2. The 404 errors should disappear
3. The insights system should work properly

## Troubleshooting

### If you get permission errors:
- Make sure you're running the migration as a database owner/admin
- Check that the `has_role` function exists (it should be created in the first migration)

### If you get "type already exists" errors:
- The enums might already exist. You can modify the migration to use `CREATE TYPE IF NOT EXISTS` or skip those lines

### If RLS policies fail:
- Make sure the `has_role` function exists and works correctly
- You can test it with: `SELECT public.has_role(auth.uid(), 'admin');`

