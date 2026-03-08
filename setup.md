# Scapia Command Centre -- Complete Setup Guide

Deploy the Scapia Command Centre app on the internet for free. This guide is written for **complete beginners** -- no coding experience needed.

### What we're setting up

| Tool | What it does | Cost |
|------|-------------|------|
| **GitHub** | Stores your project files online (like Google Drive for code) | Free |
| **Supabase** | Your database -- stores all callbacks, users, logs (replaces Google Sheets) | Free |
| **Vercel** | Hosts your app on the internet so anyone can access it via a URL | Free |

### What you'll need before starting
- A computer (Mac or Windows)
- An internet connection
- About 30-45 minutes

---
---

# PART 0: PREREQUISITES

Before we start, you need two programs installed on your computer: **Node.js** and **Git**. You also need three free online accounts.

---

## 0.1 -- What is "Terminal" / "Command Prompt"?

Throughout this guide, you'll see commands to type. These are typed into a special program on your computer:

**If you use a Mac:**
- The program is called **Terminal**
- To open it: Press `Cmd + Space` on your keyboard, type the word `Terminal`, press `Enter`
- A window will appear with a blinking cursor -- this is where you type commands

**If you use Windows:**
- The program is called **Command Prompt**
- To open it: Press the `Windows` key on your keyboard, type `cmd`, click on **Command Prompt**
- A black window will appear with a blinking cursor -- this is where you type commands

> Think of Terminal/Command Prompt as a way to talk to your computer by typing instructions instead of clicking buttons. You type a command, press `Enter`, and the computer does what you asked.

**Keep this program open** throughout the setup process. You'll switch between it and your web browser.

---

## 0.2 -- Check if Node.js is already installed

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

Type this and press `Enter`:
```
node --version
```

**If you see** a number like `v18.17.0` or `v20.10.0` --> Node.js is already installed. Skip to section 0.3.

**If you see** `command not found` or `'node' is not recognized` --> You need to install Node.js. Follow the steps below.

### How to install Node.js

> **Where to do this:** In your **web browser** (Chrome, Safari, Edge, etc.)

1. Open your browser and go to **https://nodejs.org**
2. You'll see two big green download buttons. Click the one that says **LTS** (which stands for Long Term Support -- the stable version)
3. A file will start downloading:
   - On Mac: it will be something like `node-v20.x.x.pkg`
   - On Windows: it will be something like `node-v20.x.x-x64.msi`
4. Once downloaded, find the file in your Downloads folder and **double-click** it
5. An installer window will open. Follow it:
   - Click **Continue** (Mac) or **Next** (Windows) on each screen
   - Accept the license agreement when asked
   - Click **Install**
   - On Mac: enter your computer password when prompted
   - Click **Close** / **Finish** when done

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

6. **IMPORTANT: Close Terminal/Command Prompt completely, then reopen it** (this refreshes it so it can find the newly installed program)
7. Type this command and press `Enter` to verify:
```
node --version
```
8. You should now see a version number like `v20.10.0`

> **Checkpoint:** If you see a version number, Node.js is installed successfully. If you still see an error, restart your computer and try step 7 again.

---

## 0.3 -- Check if Git is already installed

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

Type this and press `Enter`:
```
git --version
```

**If you see** something like `git version 2.39.0` --> Git is already installed. Skip to section 0.4.

**If you see** an error --> You need to install Git. Follow the steps below for your operating system.

### How to install Git on Mac

> **Where to do this:** In **Terminal**

1. Type `git --version` and press `Enter`
2. A popup window should appear saying "The 'git' command requires the command line developer tools. Would you like to install the tools now?"
3. Click **Install** on the popup
4. Wait for the installation to complete (this can take 5-10 minutes -- be patient)
5. Once it says "The software was installed", click **Done**
6. Now type `git --version` again and press `Enter`
7. You should see something like `git version 2.39.0`

> **Checkpoint:** If you see a version number, Git is installed. If the popup didn't appear, go to https://git-scm.com/download/mac in your browser and download the installer from there.

### How to install Git on Windows

> **Where to do this:** In your **web browser**, then run the downloaded file

1. Open your browser and go to **https://git-scm.com/download/win**
2. The download should start automatically. If not, click the download link on the page.
3. Find the downloaded file (something like `Git-2.x.x-64-bit.exe`) in your Downloads folder
4. **Double-click** the file to run the installer
5. The installer has many screens. **Just click "Next" on every screen** -- the default settings are fine
6. On the last screen, click **Install**
7. When finished, click **Finish**

> **Where to do this:** In **Command Prompt** (close it and reopen it first!)

8. **Close Command Prompt completely, then reopen it** (this is important!)
9. Type this and press `Enter`:
```
git --version
```
10. You should see something like `git version 2.43.0.windows.1`

> **Checkpoint:** If you see a version number, Git is installed successfully.

---

## 0.4 -- Create three free online accounts

> **Where to do this:** In your **web browser**

You need accounts on three websites. All are free.

### Account 1: GitHub

1. Go to **https://github.com**
2. Click **Sign up** (top-right corner)
3. Enter your email address, create a password, and choose a username
4. Complete the verification puzzle they show you
5. Check your email inbox -- GitHub will send a verification email. Click the link inside it.
6. You now have a GitHub account

### Account 2: Supabase

1. Go to **https://supabase.com**
2. Click **Start your project** (or **Sign In** if already shown)
3. Click **Continue with GitHub** (this connects your Supabase account to GitHub -- much easier than creating a separate login)
4. If asked, click **Authorize** to let Supabase access your GitHub account
5. You now have a Supabase account

### Account 3: Vercel

1. Go to **https://vercel.com**
2. Click **Sign Up**
3. Click **Continue with GitHub** (same idea -- links to your GitHub)
4. If asked, click **Authorize** to let Vercel access your GitHub account
5. You now have a Vercel account

> **Checkpoint:** You should now have accounts on github.com, supabase.com, and vercel.com -- all linked to the same GitHub login.

---
---

# PART 1: UPLOAD YOUR CODE TO GITHUB

We need to put the app's code files on GitHub so that Vercel can find them and host the app.

---

## Step 1.1 -- Create a new repository on GitHub

> **Where to do this:** In your **web browser**

1. Make sure you're logged in to GitHub
2. Go to **https://github.com/new**
3. You'll see a form. Fill in these fields:
   - **Repository name**: Type `scapia-command-centre`
   - **Description**: Type `Callback management system` (optional, but helpful)
   - **Public / Private**: Select **Private** (this means only you can see it)
4. Scroll down. Under "Initialize this repository with:", make sure **all checkboxes are UNCHECKED** (don't add a README, .gitignore, or license)
5. Click the green **Create repository** button
6. You'll see a page with some instructions and a URL. **Don't close this page** -- you'll need the URL shown on it

> **Checkpoint:** You should see a page titled "Quick setup" with a URL like `https://github.com/your-username/scapia-command-centre.git`

---

## Step 1.2 -- Download the repository to your computer

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

We're going to "clone" (download) the empty repository to your computer. Type these commands one at a time, pressing `Enter` after each:

**Command 1 -- Go to your Desktop:**

On Mac:
```
cd ~/Desktop
```
On Windows:
```
cd %USERPROFILE%\Desktop
```
> **What this does:** `cd` stands for "change directory" -- it tells the computer to go to a specific folder. This takes you to your Desktop folder.

**Command 2 -- Clone (download) the repository:**
```
git clone https://github.com/YOUR_USERNAME/scapia-command-centre.git
```
> **IMPORTANT:** Replace `YOUR_USERNAME` with your actual GitHub username.
> For example, if your GitHub username is `siddharthk`, the command would be:
> `git clone https://github.com/siddharthk/scapia-command-centre.git`
>
> **Tip:** You can find the exact URL to copy from the GitHub page you left open in Step 1.1. Look for the URL under "Quick setup" -- make sure "HTTPS" is selected (not SSH), then click the copy icon.

When you press `Enter`:
- If this is your first time using Git, it may ask for your **GitHub username** and **password**
- Type your GitHub username and press Enter
- For the password, you need a **Personal Access Token** (GitHub doesn't accept regular passwords anymore). See the "Troubleshooting" section at the bottom of this guide for how to create one.
- You should see a message like `Cloning into 'scapia-command-centre'...`

**Command 3 -- Go into the new folder:**
```
cd scapia-command-centre
```
> **What this does:** Moves you into the `scapia-command-centre` folder that was just created on your Desktop.

> **Checkpoint:** You should now see a folder called `scapia-command-centre` on your Desktop. It's empty (or has just a `.git` hidden folder).

---

## Step 1.3 -- Copy the app files into the repository folder

> **Where to do this:** Using **Finder** (Mac) or **File Explorer** (Windows)

This is the easiest way -- no commands needed:

1. **Open the `Hosting_Setup` folder** (the folder containing this setup.md file)
   - On Mac: Open **Finder**, navigate to the folder
   - On Windows: Open **File Explorer**, navigate to the folder

2. **Select ALL files and folders inside it:**
   - On Mac: Press `Cmd + A` to select everything
   - On Windows: Press `Ctrl + A` to select everything
   - Make sure you're selecting the files INSIDE the Hosting_Setup folder, not the folder itself

3. **Copy them:**
   - On Mac: Press `Cmd + C`
   - On Windows: Press `Ctrl + C`

4. **Open the `scapia-command-centre` folder on your Desktop:**
   - On Mac: In Finder, go to Desktop, open the `scapia-command-centre` folder
   - On Windows: In File Explorer, go to Desktop, open the `scapia-command-centre` folder

5. **Paste everything:**
   - On Mac: Press `Cmd + V`
   - On Windows: Press `Ctrl + V`
   - If asked about replacing files, click **Replace**

> **Checkpoint:** Your `scapia-command-centre` folder on the Desktop should now contain files like `package.json`, `vite.config.js`, `vercel.json`, a `src` folder, an `api` folder, etc. If you see `setup.md` (this file) in there, you've done it right.

> **Important:** Make sure hidden files are also copied. Files starting with a dot (`.env.example`, `.gitignore`) are hidden by default.
> - **Mac:** In Finder, press `Cmd + Shift + .` (period) to show hidden files, then copy them too
> - **Windows:** In File Explorer, click **View** tab at the top, then check **Hidden items**, then copy them too

---

## Step 1.4 -- Upload the files to GitHub

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

Make sure you're still inside the `scapia-command-centre` folder. If you're not sure, run this command first:

On Mac:
```
cd ~/Desktop/scapia-command-centre
```
On Windows:
```
cd %USERPROFILE%\Desktop\scapia-command-centre
```

Now run these **three commands one at a time** (type each one, press `Enter`, wait for it to finish, then type the next):

**Command 1:**
```
git add .
```
> **What this does:** Tells Git "I want to upload all these files." The dot (`.`) means "everything in this folder."
> You won't see any output -- that's normal. It just silently processes.

**Command 2:**
```
git commit -m "Initial commit"
```
> **What this does:** Creates a "save point" of your files (like pressing Save on a document). The text in quotes is a note describing what you did.
> You should see a list of files being committed.

**Command 3:**
```
git push origin main
```
> **What this does:** Uploads everything to GitHub.
> You should see progress messages like `Writing objects: 100%`.

**If you get an error** saying `error: src refspec main does not exist`, try this instead:
```
git push origin master
```

> **Checkpoint:** Go to your browser and open **https://github.com/YOUR_USERNAME/scapia-command-centre** (replace YOUR_USERNAME). You should see all your project files listed on the page. If you see files like `package.json`, `src/`, `api/`, etc., this step is complete!

---
---

# PART 2: SET UP THE DATABASE (SUPABASE)

Supabase provides a free database to store all your app data (callbacks, users, logs). Think of it as a super-fast spreadsheet that your app can read and write to.

---

## Step 2.1 -- Create a Supabase project

> **Where to do this:** In your **web browser**

1. Go to **https://app.supabase.com** and log in (use "Continue with GitHub")
2. **First-time users:** You'll be asked to create an **organization** first
   - Click **New Organization**
   - **Name**: Type `Scapia` (or your name / company name)
   - **Type of organization**: Select **Personal** (or Company if applicable)
   - **Plan**: Select **Free** (the first option)
   - Click **Create organization**
3. Now click the green **New Project** button
4. Fill in these fields:
   - **Project name**: Type `scapia-command-centre`
   - **Database Password**: Type a strong password, for example: `ScapiaDB!2024secure`
     > **Write this password down** and save it somewhere safe (like a note on your phone or a password manager). You can't see it again after this screen.
   - **Region**: Select the region closest to your users. For India, choose **South Asia (Mumbai)** or **Southeast Asia (Singapore)**
5. Click the green **Create new project** button
6. **Wait 1-2 minutes.** You'll see a loading animation. Don't close the tab.
7. When it's ready, you'll see the project dashboard with a welcome message.

> **Checkpoint:** You should be on the Supabase project dashboard. You'll see the project name at the top and a left sidebar with options like "Table Editor", "SQL Editor", etc.

---

## Step 2.2 -- Create the database tables

> **Where to do this:** In your **web browser** (Supabase dashboard -- same page from step 2.1)

The database needs tables (like sheets in a spreadsheet) to store your data. We'll create them by running a pre-written script.

1. In the Supabase **left sidebar**, click on **SQL Editor** (look for the icon that looks like `>_`)
2. Click the **+ New query** button (top area of the page)
3. You should see a blank text area where you can type -- this is where we'll paste our script

Now we need to open a file from your computer:

> **Where to do this:** On your **computer** (Finder/File Explorer)

4. Go to the `scapia-command-centre` folder on your Desktop
5. Find the file named `supabase-schema.sql`
6. **Right-click** on the file:
   - On Mac: Click **Open With** > **TextEdit**
   - On Windows: Click **Open with** > **Notepad**
   - If neither option appears, right-click > Open With > choose any text editor
7. The file will open showing a lot of text (SQL commands). **Select ALL the text:**
   - On Mac: Press `Cmd + A`
   - On Windows: Press `Ctrl + A`
8. **Copy the text:**
   - On Mac: Press `Cmd + C`
   - On Windows: Press `Ctrl + C`

> **Where to do this:** Back in your **web browser** (Supabase SQL Editor)

9. Click inside the blank text area in the SQL Editor
10. **Paste the text:**
    - On Mac: Press `Cmd + V`
    - On Windows: Press `Ctrl + V`
11. You should see the SQL code appear in the editor
12. Click the green **Run** button (bottom-right of the editor, or press `Ctrl + Enter`)
13. Wait a few seconds. You should see a green message at the bottom: **"Success. No rows returned"**

> **"No rows returned" sounds like an error, but it's not!** It means the commands ran successfully. They created tables (structures), not data rows, so "no rows returned" is the expected result.

> **Checkpoint:** The message says "Success". If you see any red error messages instead, double-check that you copied ALL the text from the file (scroll up/down to make sure nothing was cut off), then try running it again.

---

## Step 2.3 -- Get your Supabase keys

> **Where to do this:** In your **web browser** (Supabase dashboard)

Your app needs three pieces of information to connect to the database. Think of these as "secret passwords."

1. In the Supabase **left sidebar**, click **Project Settings** (the gear icon near the bottom)
2. On the Settings page, look at the left side menu and click **API** (under "Configuration")
3. You should now see a page with your project's connection details. **We need 3 values from this page.**

**Open a blank text file** on your computer to save these values:
- On Mac: Open **TextEdit** (Cmd + Space, type TextEdit, Enter), create a new file
- On Windows: Open **Notepad** (press Windows key, type Notepad, Enter)
- Keep this file open -- you'll paste values into it

Now copy these 3 values:

---

**VALUE 1: Project URL**
- On the API settings page, find the section labeled **Project URL**
- You'll see a URL that looks like: `https://abcdefghij.supabase.co`
- Click the **copy icon** next to it (or select it and copy manually)
- Go to your text file and paste it on a new line. Label it:
  ```
  Project URL: https://abcdefghij.supabase.co
  ```

---

**VALUE 2: anon public key**
- On the same page, scroll down to the section labeled **Project API keys**
- Find the row labeled **anon** and **public**
- Click the **copy icon** next to the key
- It's a very long string that starts with `eyJ...`
- Go to your text file and paste it:
  ```
  Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

---

**VALUE 3: service_role secret key**
- On the same page, in the same **Project API keys** section
- Find the row labeled **service_role** and **secret**
- This key is hidden by default. Click the **Reveal** button (or the eye icon) to show it
- Click the **copy icon** next to the key
- Go to your text file and paste it:
  ```
  Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

> **IMPORTANT: Keep the service_role key secret!** It has full access to your database. Never share it publicly, post it online, or put it in any code file. We'll only paste it into Vercel's secure environment variables.

---

**Save your text file** somewhere you can find it easily. You'll need all 3 values in the next section.

> **Checkpoint:** Your text file should have 3 values -- a URL and two long keys starting with `eyJ...`. The anon key and service_role key are different from each other (compare the last few characters to make sure you copied two different keys).

---

## Step 2.4 -- Verify the database is set up correctly

> **Where to do this:** In your **web browser** (Supabase dashboard)

1. In the Supabase **left sidebar**, click **Table Editor** (the grid icon)
2. On the left side, you should see a list of 4 tables:
   - `callbacks`
   - `config`
   - `logs`
   - `users`
3. Click on **users**
4. You should see one row of data:
   - **name**: Admin
   - **email**: admin@scapia.cards
   - **role**: Admin
   - **active**: true

> **Checkpoint:** If you see all 4 tables and the Admin user row, your database is ready! If you don't see any tables, go back to Step 2.2 and run the SQL script again.

---
---

# PART 3: DEPLOY TO VERCEL (PUT THE APP ON THE INTERNET)

Vercel reads your code from GitHub and turns it into a live website that anyone can access.

---

## Step 3.1 -- Import your GitHub repository into Vercel

> **Where to do this:** In your **web browser**

1. Go to **https://vercel.com/new**
2. Log in if needed (use "Continue with GitHub")
3. You should see a section called **Import Git Repository** with a list of your GitHub repositories
4. Find **scapia-command-centre** in the list and click **Import**

> **Don't see your repo?** Click the **Adjust GitHub App Permissions** link. A GitHub page will open -- scroll down and under "Repository access", select **All repositories** (or specifically add `scapia-command-centre`), then click **Save**. Go back to the Vercel page and refresh it.

5. You'll see a configuration page. Vercel should have auto-detected the settings:
   - **Framework Preset**: Should say **Vite** (if not, select Vite from the dropdown)
   - **Root Directory**: Should be `./` (leave it as is)

**DO NOT click "Deploy" yet!** You need to add environment variables first (next step).

---

## Step 3.2 -- Add your secret keys (environment variables)

> **Where to do this:** In your **web browser** (same Vercel page from step 3.1)

Environment variables are secret settings (like passwords) that your app needs to work. They're stored securely on Vercel's servers -- they never appear in your code.

1. On the same Vercel configuration page, scroll down until you see a section called **Environment Variables**
2. Click on it to expand it
3. You'll see two input boxes: **Key** (on the left) and **Value** (on the right), and an **Add** button

You need to add **8 variables**, one at a time. For each variable:
- Type the **Key** exactly as shown (copy-paste to avoid typos)
- Paste the **Value**
- Click **Add**
- The variable will appear in a list below

---

**Variable 1:**
- Key: `SUPABASE_URL`
- Value: Your **Project URL** from the text file (e.g., `https://abcdefghij.supabase.co`)

**Variable 2:**
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Your **service_role secret key** from the text file (the long `eyJ...` string)

**Variable 3:**
- Key: `VITE_SUPABASE_URL`
- Value: Your **Project URL** again -- **same value as Variable 1**

**Variable 4:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: Your **anon public key** from the text file (the other long `eyJ...` string)

**Variable 5:**
- Key: `FRESHDESK_DOMAIN`
- Value: `scapia-support`
  > This is the part before `.freshdesk.com` in your Freshdesk URL. If your Freshdesk is at `https://scapia-support.freshdesk.com`, the domain is `scapia-support`.

**Variable 6:**
- Key: `FRESHDESK_API_KEY`
- Value: Your Freshdesk API key
  > **How to find your Freshdesk API key:**
  > 1. Log in to Freshdesk (https://scapia-support.freshdesk.com)
  > 2. Click your **profile picture** in the top-right corner
  > 3. Click **Profile Settings**
  > 4. Look at the right side of the page -- you'll see **Your API Key**
  > 5. Copy the key and paste it as the value

**Variable 7:**
- Key: `SLACK_WEBHOOK_URL`
- Value: Your Slack webhook URL (looks like `https://hooks.slack.com/services/T.../B.../xxx`)
  > If you don't use Slack notifications, you can type any placeholder like `https://example.com` -- it won't break anything, notifications just won't be sent.

**Variable 8:**
- Key: `ALERT_EMAILS`
- Value: `admin@scapia.cards`
  > This is the email address that will receive alert emails. You can add multiple emails separated by commas, like `admin@scapia.cards,manager@scapia.cards`

---

> **Double-check:** Make sure you've added all 8 variables. Look at the list below the input boxes -- you should see 8 entries. Pay special attention to:
> - Variable 1 and 3 should have the **same** URL value
> - Variable 2 (service_role) and Variable 4 (anon) should have **different** key values
> - No extra spaces before or after any value

---

## Step 3.3 -- Deploy the app

> **Where to do this:** In your **web browser** (same Vercel page)

1. Click the **Deploy** button
2. You'll see a build log with scrolling text -- this is Vercel building your app. **Wait 1-2 minutes.**
3. When it's done, you'll see a **"Congratulations!"** page with a confetti animation and a screenshot of your app
4. You'll see your app's URL, something like:
   **https://scapia-command-centre.vercel.app**
   or
   **https://scapia-command-centre-abc123.vercel.app**
5. Click on the URL or the screenshot to open your live app

> **Checkpoint:** Your app should open in a new tab showing a login page with "Scapia Command Centre" branding. If you see a blank page or an error, check the Troubleshooting section at the bottom.

---

## Step 3.4 -- Log in for the first time

> **Where to do this:** In your **web browser** (on the app you just deployed)

1. On the login page, enter:
   - **Email**: `admin@scapia.cards`
   - **Password**: `Welcome@1234`
2. Click **Login**
3. You should see the Command Centre with the Live Queue, Dashboard, and other pages

> **Congratulations! Your app is now live on the internet!** Anyone with the URL can access it (they'll need a login to get in).

---
---

# PART 4: OPTIONAL SETUP

The following steps are optional but recommended.

---

## 4.1 -- Set up Freshdesk Webhook

This makes Freshdesk automatically create callbacks in your app when agents tag tickets. Skip this if you don't use Freshdesk.

**Your webhook URL is:** `https://YOUR-APP.vercel.app/api/webhook`
> Replace `YOUR-APP.vercel.app` with your actual Vercel URL from Step 3.3.

> **Where to do this:** In your **web browser** (Freshdesk admin panel)

1. Log in to Freshdesk at **https://scapia-support.freshdesk.com**
2. Click the **Admin** gear icon in the left sidebar
3. Under **Helpdesk Productivity**, click **Automations**
4. Click the **Ticket Updates** tab at the top
5. Click **New Rule**
6. Fill in the rule:
   - **Rule Name**: `Callback Request Webhook`
   - **When an action performed by**: Select **Agent**
7. Under **involves any of these events**:
   - Select **Field Update**
   - Field: **CallBack Request Type**
   - Changes from: **---** (the blank/empty option)
   - Changes to: **Any Value**
8. Under **perform these actions**, click **Add Action** > **Trigger Webhook**:
   - **Request Type**: POST
   - **URL**: Paste your webhook URL (e.g., `https://scapia-command-centre.vercel.app/api/webhook`)
   - **Requires Authentication**: Leave **unchecked**
   - **Content**: Select **JSON**
   - **Body**: Copy and paste this exactly:
   ```json
   {
     "ticket_id": "{{ticket.id}}",
     "requester_name": "{{ticket.requester.name}}",
     "ticket_subject": "{{ticket.subject}}",
     "ticket_type": "{{ticket.cf_callback_request_type}}",
     "cf_time_promised_in_hrs": "{{ticket.cf_time_promised_in_hrs}}",
     "cf_category": "{{ticket.cf_category}}",
     "ticket_agent_name": "{{ticket.agent.name}}",
     "ticket_status": "{{ticket.status}}"
   }
   ```
9. Click **Save**

**To test:** Open any Freshdesk ticket, set the **CallBack Request Type** field to any value (e.g., "Normal"), and save. Check your Command Centre's Live Queue -- a new callback should appear.

---

## 4.2 -- Set up Periodic Summary Notifications

The app can send automatic summaries via Slack and/or email.

### Option A: Manual (no setup needed)

> **Where to do this:** In your **web browser** (your Command Centre app)

1. Log in to your app
2. Go to the **Configuration** page (left sidebar)
3. Scroll down to the **Notifications** section
4. Click the **Send Summary Now** button

### Option B: Automatic every 3 hours (free, using cron-job.org)

> **Where to do this:** In your **web browser**

1. Go to **https://cron-job.org** and create a free account
2. Click **Create Cronjob** (or **+ New**)
3. Fill in:
   - **Title**: `Scapia Summary`
   - **URL**: `https://YOUR-APP.vercel.app/api/notifications` (replace with your actual Vercel URL)
4. Under **Schedule**, set it to **Every 3 hours** (or whatever frequency you prefer)
5. Under **Advanced** (or **Request Settings**), change the **Request Method** to **POST**
6. Click **Create** (or **Save**)

This service will now automatically trigger your app's summary every 3 hours.

---

## 4.3 -- Add more users

> **Where to do this:** In your **web browser** (your Command Centre app)

1. Log in as the Admin (`admin@scapia.cards` / `Welcome@1234`)
2. Click **Configuration** in the left sidebar
3. Scroll to the **User Management** section
4. Under **Add New User**:
   - Type the person's **Full Name**
   - Type their **Email Address**
   - Select their **Role**:
     - **Agent** -- Can pick up and complete callbacks
     - **Supervisor** -- Can also assign/unassign/reassign callbacks and force-release them
     - **Admin** -- Full access to everything, including settings
5. Click **Add User**
6. Tell the new user to log in with their email and the default password: **Welcome@1234**
7. They should change their password from the Configuration page after first login

---
---

# HOW TO UPDATE THE APP AFTER MAKING CHANGES

If someone makes changes to the code files, here's how to deploy the updated version.

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

**Step 1 -- Open Terminal/Command Prompt and navigate to the project folder:**

On Mac:
```
cd ~/Desktop/scapia-command-centre
```
On Windows:
```
cd %USERPROFILE%\Desktop\scapia-command-centre
```

**Step 2 -- Run these 3 commands one at a time:**

```
git add .
```
> Tells Git to include all changed files.

```
git commit -m "Updated the app"
```
> Saves a snapshot of the changes.

```
git push origin main
```
> Uploads the changes to GitHub.

**Step 3 -- Wait ~2 minutes.**

> **Where to do this:** Nothing to do -- just wait! Vercel automatically detects changes on GitHub and redeploys your app. You can check the progress at **https://vercel.com** > your project > **Deployments** tab.

---
---

# RUNNING THE APP ON YOUR COMPUTER (OPTIONAL, FOR DEVELOPERS)

If you want to test the app on your own computer before deploying:

> **Where to do ALL these steps:** In **Terminal** (Mac) or **Command Prompt** (Windows)

**Step 1 -- Navigate to the project folder:**

On Mac:
```
cd ~/Desktop/scapia-command-centre
```
On Windows:
```
cd %USERPROFILE%\Desktop\scapia-command-centre
```

**Step 2 -- Install required packages (only needed the first time):**
```
npm install
```
> **What this does:** Downloads all the code libraries the app needs. Takes about 1 minute. You'll see lots of text scrolling -- that's normal. Wait until you see a message saying packages were added.

**Step 3 -- Create your local settings file:**

On Mac:
```
cp .env.example .env
```
On Windows:
```
copy .env.example .env
```
> **What this does:** Creates a `.env` file from the template. This file holds your secret keys for local development.

**Step 4 -- Edit the .env file with your Supabase keys:**

On Mac:
```
open -a TextEdit .env
```
On Windows:
```
notepad .env
```
> This opens the `.env` file in a text editor. Replace the placeholder values with your actual Supabase keys from Step 2.3. Save the file and close the editor.

> **Tip:** If you skip this step, the app runs in "mock mode" with fake sample data. This is fine for just exploring the interface.

**Step 5 -- Start the app:**
```
npm run dev
```
> You'll see a message that says something like:
> ```
>   VITE v7.x.x  ready in 500 ms
>   -> Local: http://localhost:3000/
> ```

**Step 6 -- Open the app:**

> **Where to do this:** In your **web browser**

Go to **http://localhost:3000** -- you'll see the app running on your own computer.

**To stop the app:** Go back to Terminal/Command Prompt and press `Ctrl + C`.

---
---

# TROUBLESHOOTING

## Git asks for a password but won't accept mine

GitHub no longer accepts regular passwords for Git operations. You need a **Personal Access Token (PAT):**

> **Where to do this:** In your **web browser**

1. Go to **https://github.com/settings/tokens**
2. Click **Generate new token** > **Generate new token (classic)**
3. Fill in:
   - **Note**: Type `scapia-deploy` (this is just a label for you to remember)
   - **Expiration**: Select **90 days** (or **No expiration** for convenience)
   - Under **Select scopes**, check the box for **repo** (first checkbox -- this gives Git access to your repositories)
4. Scroll down and click **Generate token**
5. You'll see a token starting with `ghp_...` -- **copy it immediately**. You won't see it again once you leave this page.

> **Where to do this:** In **Terminal** / **Command Prompt**

6. When Git asks for your password, **paste this token** instead of your regular GitHub password
   - On Mac Terminal: `Cmd + V` to paste
   - On Windows Command Prompt: right-click to paste

---

## App shows a blank white page

> **Where to do this:** In your **web browser** (on the app page that shows blank)

1. Press **F12** on your keyboard (or right-click anywhere on the page > click **Inspect**)
2. A panel will open at the bottom or side of the screen. Click the **Console** tab.
3. Look for red error messages. Common issues:
   - `VITE_SUPABASE_URL is not defined` --> The environment variable wasn't set. Go to Vercel > your project > **Settings** > **Environment Variables** and check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly.
   - After fixing, redeploy: Vercel > **Deployments** tab > click **...** on the latest > **Redeploy**

---

## Login page shows but login doesn't work

> **Where to do this:** In your **web browser** (Supabase dashboard)

1. Go to **https://app.supabase.com**, open your project
2. Click **Table Editor** in the left sidebar
3. Click on the **users** table
4. Check that there's at least one row with `admin@scapia.cards`
5. If the table is empty, the SQL script from Step 2.2 didn't run properly. Go back and run it again.

Default login: **admin@scapia.cards** / **Welcome@1234**

---

## Buttons don't work or data doesn't save (API errors)

> **Where to do this:** In your **web browser** (Vercel dashboard)

1. Go to **https://vercel.com** and click on your project
2. Click the **Deployments** tab
3. Click on the most recent deployment
4. Click **Functions** tab
5. Look for functions with errors (highlighted in red)
6. Most common cause: the `SUPABASE_SERVICE_ROLE_KEY` environment variable is missing or wrong
   - Go to **Settings** > **Environment Variables** and verify it's set
   - Make sure it's the **service_role** key (not the anon key -- they're different!)
   - After fixing, go to **Deployments** tab, click **...** on the latest, click **Redeploy**

---

## Environment variables not taking effect after changing them

> **Where to do this:** In your **web browser** (Vercel dashboard)

After adding or changing environment variables in Vercel, you must **redeploy**:
1. Go to your project in Vercel
2. Click the **Deployments** tab
3. Click the three dots (**...**) next to the most recent deployment
4. Click **Redeploy**
5. Wait 1-2 minutes for the new build to finish

---

## "npm install" fails with errors

> **Where to do this:** In **Terminal** (Mac) or **Command Prompt** (Windows)

1. Check your Node.js version: `node --version`
   - It must be version 18 or higher. If it's lower, download the latest from https://nodejs.org
2. Try deleting the packages folder and reinstalling:

On Mac:
```
rm -rf node_modules
npm install
```
On Windows:
```
rmdir /s /q node_modules
npm install
```

---

## Freshdesk webhook isn't creating callbacks

1. Check that the Freshdesk automation rule is **active** (not paused)
2. Check that the webhook URL is exactly right (your Vercel URL + `/api/webhook`)
3. Try using the **Retrigger Missed Webhook** feature in your app's Configuration page -- enter a Freshdesk ticket ID to manually create the callback

---
---

# QUICK REFERENCE CARD

| What | Where to find it |
|------|-----------------|
| Your app URL | Vercel dashboard > your project (e.g., `https://scapia-command-centre.vercel.app`) |
| Vercel dashboard | https://vercel.com/dashboard |
| Supabase dashboard | https://app.supabase.com |
| GitHub repo | https://github.com/YOUR_USERNAME/scapia-command-centre |
| Default admin login | Email: `admin@scapia.cards`, Password: `Welcome@1234` |
| Webhook URL for Freshdesk | Your app URL + `/api/webhook` |
| Freshdesk API key | Freshdesk > click profile picture > Profile Settings > right side |

---

# GLOSSARY

| Word | What it means |
|------|---------------|
| **Terminal** | The Mac app where you type commands (black/white window) |
| **Command Prompt** | The Windows app where you type commands (black window) |
| **Repository (repo)** | A project folder stored on GitHub |
| **Clone** | Download a repository from GitHub to your computer |
| **Commit** | Save a snapshot of your code changes (like pressing "Save") |
| **Push** | Upload your saved changes from your computer to GitHub |
| **Deploy** | Take code and turn it into a live website on the internet |
| **Environment variable** | A secret setting (like a password) stored on the server, not in your code |
| **npm** | A tool for downloading code packages your app needs (comes with Node.js) |
| **npm install** | The command that downloads all required packages |
| **npm run dev** | The command that starts the app on your computer for testing |
| **API key** | A password that lets one app talk to another (like your app talking to Supabase) |
| **Webhook** | An automatic message from one service to another (Freshdesk tells your app about new tickets) |
| **Database** | Where all your data is stored (like a super-fast spreadsheet) |
| **SQL** | The language used to create and manage database tables |
| **Build** | The process of turning your code into a website that browsers can display |
