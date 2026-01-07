# Ruangku — Personal Publishing Platform

A minimalist, Medium-inspired personal publishing platform built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Paper Design Concept**: Each article is displayed as a physical sheet of paper with soft shadows and subtle borders
- **Markdown/MDX Support**: Write articles in Markdown with frontmatter metadata
- **SEO Optimized**: Built-in metadata generation for each page
- **Static Generation**: All pages are statically generated for optimal performance
- **Responsive Design**: Beautiful on all screen sizes
- **Clean Typography**: Editorial-style typography for excellent readability

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Markdown** for content

## Project Structure

```
ruangku/
├── app/
│   ├── globals.css          # Global styles and Tailwind directives
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Home page with paper cards
│   ├── not-found.tsx        # 404 page
│   └── posts/
│       └── [slug]/
│           └── page.tsx     # Dynamic article page
├── components/
│   ├── PaperCard.tsx        # Article preview card component
│   ├── ArticleLayout.tsx    # Full article layout wrapper
│   └── MDXContent.tsx       # Markdown content renderer
├── content/
│   └── posts/               # Markdown article files
│       ├── the-art-of-simplicity.md
│       ├── on-writing-and-thinking.md
│       └── building-in-public.md
├── lib/
│   ├── posts.ts             # Post fetching and parsing utilities
│   └── types.ts             # TypeScript type definitions
└── tailwind.config.ts       # Tailwind configuration with paper theme
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Create production build
npm run build

# Start production server (if not using static export)
npm start
```

## Writing Articles

Create a new Markdown file in `content/posts/` with the following frontmatter:

```markdown
---
title: "Your Article Title"
slug: "your-article-slug"
date: "2026-01-07"
excerpt: "A brief description of your article that appears on the homepage."
---

# Your Article Content

Write your content here using Markdown syntax...
```

### Supported Markdown Features

- Headers (h1-h3)
- Paragraphs
- Bold and italic text
- Links
- Unordered and ordered lists
- Blockquotes
- Code blocks and inline code
- Horizontal rules

## Customization

### Colors

Edit `tailwind.config.ts` to customize the color palette:

- `paper`: Card background colors
- `background`: Page background colors  
- `ink`: Text colors

### Typography

The platform uses Georgia (serif) for body text and system fonts for UI elements. Modify `app/globals.css` to adjust typography styles.

## License

MIT License
