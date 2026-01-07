# Firebase Setup Guide for Ruangku

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "ruangku")
4. Disable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Firestore Database

1. In Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode"
4. Select your preferred location (closest to your users)
5. Click "Enable"

## 3. Enable Authentication

1. Go to "Build" > "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click "Google" and enable it
5. Add your email as the support email
6. Click "Save"

## 4. Get Client SDK Config

1. Go to "Project settings" (gear icon)
2. Scroll to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register app with a nickname (e.g., "ruangku-web")
5. Copy the firebaseConfig values to your `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 5. Generate Admin SDK Service Account

1. In Project settings, go to "Service accounts" tab
2. Click "Generate new private key"
3. Download the JSON file
4. Extract these values to your `.env.local`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** The private key contains `\n` characters. Keep them as-is in the env file (with quotes around the entire value).

## 6. Set Admin Email

Add your Google account email (the one you'll use to sign in):

```env
NEXT_PUBLIC_ADMIN_EMAIL=your-email@gmail.com
ADMIN_EMAIL=your-email@gmail.com
```

## 7. Deploy Firestore Security Rules

Update `firestore.rules` with your admin email:

```
allow read, write: if request.auth != null 
                   && request.auth.token.email == 'your-email@gmail.com';
```

Then deploy rules using Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # Select your project, use existing rules file
firebase deploy --only firestore:rules
```

## 8. Create Firestore Index (if needed)

The app queries posts by `status` and orders by `publishedAt`. If you get an index error, Firebase will provide a link to create it automatically.

You can also create it manually:
1. Go to Firestore > Indexes
2. Create composite index:
   - Collection: `posts`
   - Fields: `status` (Ascending), `publishedAt` (Descending)

## 9. Run the App

```bash
npm run dev
```

Visit `http://localhost:3000/admin/login` and sign in with your Google account.

## Firestore Data Structure

Collection: `posts`

```json
{
  "title": "My First Post",
  "slug": "my-first-post",
  "excerpt": "A brief description...",
  "content": "# Markdown content here...",
  "status": "published",  // or "draft"
  "publishedAt": Timestamp,  // null if draft
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

## Security Notes

- Only the admin email can create/edit/delete posts
- Public users can only read published posts
- All write operations go through the server (Admin SDK)
- Client SDK is only used for authentication
