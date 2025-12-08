# Replit Merge & Deployment Instructions

## Current Situation
There are divergent branches between local (Windows/WSL) and Replit. Both environments have made changes that need to be merged.

## Problem
```
git pull https://github.com/ZubeidHendricks/AvatarHumanCapital.git
fatal: Unable to write index.
```

## Solution Steps for Replit

### 1. Check Disk Space & Permissions
```bash
df -h
ls -la .git/
```

If disk is full or permission issues exist, clean up:
```bash
# Remove node_modules and reinstall later
rm -rf node_modules
# Clean git cache
git gc --prune=now --aggressive
```

### 2. Fix Git Index Issues
```bash
# Remove the corrupted index
rm -f .git/index
# Restore it from HEAD
git reset HEAD
```

### 3. Stash Any Local Changes
```bash
git stash push -m "Replit local changes before merge"
```

### 4. Pull Latest Changes (Merge Strategy)
```bash
git config pull.rebase false
git pull https://github.com/ZubeidHendricks/AvatarHumanCapital.git main
```

### 5. If Merge Conflicts Occur
```bash
# View conflicted files
git status

# For each conflicted file, choose:
# Option A: Keep their version (from GitHub)
git checkout --theirs <file>

# Option B: Keep our version (Replit)
git checkout --ours <file>

# After resolving all conflicts
git add .
git commit -m "Merge remote changes from GitHub"
```

### 6. Reinstall Dependencies
```bash
npm install
```

### 7. Run Database Migration
```bash
# Connect to your PostgreSQL database and run:
psql $DATABASE_URL -f migrations/0010_add_lms_tables.sql
```

Or use the Replit database tool to execute the migration.

### 8. Test the Application
```bash
npm run dev
```

### 9. Push Changes Back to GitHub
```bash
git push origin main
```

## What Was Added in Latest Changes

### 1. **LMS Module** (Learning Management System)
- **Courses**: Create and manage training courses with modules
- **Assessments**: Regular tests delivered via email/WhatsApp
- **Gamification**: Badges, leaderboards, achievements
- **AI Lecturers**: Generate training videos with AI personas
- **Certificates**: Upload templates, auto-generate and issue certificates

### 2. **Admin Tenant Management**
- Select any tenant from admin dashboard
- View their payment status (Trial/Active/Suspended/Cancelled)
- Control modules per tenant:
  - Toggle LMS on/off
  - Toggle Gamification on/off
  - Toggle AI Lecturers on/off
  - Toggle Certificates on/off
- Change subscription tier (Basic/Professional/Enterprise)
- View tenant dashboard from admin perspective

### 3. **New UI Pages**
- `/certificates` - Certificate management and templates
- `/courses` - Course catalogue
- `/leaderboard` - Gamification leaderboard
- `/system-docs` - Complete platform documentation

### 4. **New API Endpoints**
```
GET  /api/admin/tenants                     - List all tenants
GET  /api/admin/tenants/:id                 - Get tenant details
PATCH /api/admin/tenants/:id/modules        - Update tenant modules

GET  /api/lms/courses                       - List courses
POST /api/lms/courses                       - Create course
POST /api/lms/courses/:id/enroll            - Enroll in course

GET  /api/lms/assessments                   - List assessments
POST /api/lms/assessments                   - Create assessment
POST /api/lms/assessments/:id/submit        - Submit assessment

GET  /api/gamification/leaderboard          - Get leaderboard
GET  /api/gamification/achievements/:userId - Get user achievements

GET  /api/certificates/templates            - List certificate templates
POST /api/certificates/templates            - Upload new template
POST /api/certificates/issue                - Issue a certificate
GET  /api/certificates/verify/:code         - Verify certificate
```

### 5. **Database Schema**
New tables added via migration `0010_add_lms_tables.sql`:
- `courses` - Course content
- `course_enrollments` - User enrollments
- `assessments` - Test/quiz definitions
- `assessment_attempts` - User test submissions
- `user_achievements` - Badges and awards
- `leaderboard` - Gamification scores
- `certificate_templates` - Certificate designs
- `certificates` - Issued certificates
- `ai_lecturers` - AI persona configurations
- `lesson_videos` - AI-generated videos

Also adds columns to `tenants` table:
- `lms_enabled`
- `gamification_enabled`
- `ai_lecturers_enabled`
- `certificates_enabled`
- `payment_status`
- `subscription_tier`
- `subscription_expires_at`

## Common Issues & Solutions

### Issue: "Unable to write index"
**Solution**: Free up disk space or fix permissions
```bash
rm -rf node_modules
git gc --prune=now
rm -f .git/index
git reset HEAD
```

### Issue: Merge conflicts
**Solution**: Decide on each file - usually keep GitHub version for code, keep Replit version for environment configs
```bash
git checkout --theirs <code-file>
git checkout --ours .env
```

### Issue: Database not updated
**Solution**: Run migration manually
```bash
psql $DATABASE_URL -f migrations/0010_add_lms_tables.sql
```

### Issue: Missing dependencies
**Solution**: Clean install
```bash
rm -rf node_modules package-lock.json
npm install
```

## Verification Checklist

After merge, verify:
- [ ] Application starts without errors: `npm run dev`
- [ ] Database migration applied successfully
- [ ] Admin dashboard loads at `/admin-dashboard`
- [ ] Tenant Management tab visible in admin dashboard
- [ ] Can select a tenant and see module toggles
- [ ] New routes work: `/certificates`, `/courses`, `/leaderboard`, `/system-docs`
- [ ] No console errors in browser

## Environment Variables to Check

Ensure these are set in Replit Secrets:
```
DATABASE_URL=postgresql://...
SESSION_SECRET=...
OPENAI_API_KEY=...
HUME_API_KEY=...
HUME_SECRET_KEY=...
```

## Need Help?

If issues persist:
1. Check Replit console for error messages
2. Check browser console (F12) for frontend errors
3. Verify database connection: `psql $DATABASE_URL -c "SELECT version();"`
4. Check file permissions: `ls -la`
5. Ensure adequate disk space: `df -h`
