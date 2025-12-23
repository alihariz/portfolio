# Ali Hariz Portfolio Website

A modern, responsive portfolio website built with React, TypeScript, and Tailwind CSS showcasing my skills, projects, and experience as a Software Engineering student.

## Features

- **Modern Design**: Clean, minimalist interface with dark/light mode support
- **Fully Responsive**: Optimized for mobile, tablet, and desktop devices
- **Type-Safe**: Built with TypeScript for enhanced code quality
- **Dynamic Content**: All content managed through JSON data files for easy updates
- **Project Filtering**: Advanced search and filter functionality for projects
- **Smooth Animations**: Subtle animations using Tailwind CSS and Framer Motion
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation support

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: React Icons
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
portfolio/
├── public/
│   └── assets/
│       └── resume/          # Resume PDF
├── src/
│   ├── components/
│   │   ├── layout/          # Header, Footer, Navigation
│   │   ├── sections/        # Main content sections
│   │   ├── ui/              # Reusable UI components
│   │   └── features/        # Feature-specific components
│   ├── contexts/            # React contexts (Theme)
│   ├── hooks/               # Custom React hooks
│   ├── data/                # JSON content files
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Global styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/portfolio.git
cd portfolio
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

The website will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Updating Content

All website content is managed through JSON files in the `src/data/` directory:

- `profile.json` - Personal information and contact details
- `education.json` - Educational background
- `experience.json` - Work experience and accomplishments
- `projects.json` - Project portfolio
- `skills.json` - Technical skills by category
- `certificates.json` - Certifications and qualifications
- `leadership.json` - Leadership activities and achievements

Simply edit these files to update the content on your website. The changes will be reflected automatically.

### Adding a New Project

1. Open `src/data/projects.json`
2. Add a new project object to the `projects` array:
```json
{
  "id": "proj-10",
  "title": "Your Project Title",
  "subtitle": "Project Context",
  "category": "Full-Stack Development",
  "type": "Personal",
  "status": "Completed",
  "featured": false,
  "startDate": "2024-01",
  "endDate": "2024-06",
  "shortDescription": "Brief description",
  "description": "Detailed description",
  "technologies": ["React", "Node.js"],
  "achievements": ["Achievement 1", "Achievement 2"],
  "responsibilities": ["Responsibility 1"],
  "links": {},
  "images": [],
  "tags": ["Web Development"]
}
```

## Color Customization

The color scheme can be customized in `tailwind.config.js`:

- `primary`: Main brand color (Blue by default)
- `secondary`: Secondary accent color (Violet by default)
- `background`: Page background colors
- `surface`: Card/container backgrounds
- `text`: Text colors for different hierarchy levels

## Deployment

### Netlify (Recommended)

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Deploy!

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Framework preset: Vite
4. Deploy!

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Lighthouse Performance: >90
- Lighthouse Accessibility: >95
- First Contentful Paint: <1.5s
- Time to Interactive: <3s

## License

This project is open source and available under the MIT License.

## Contact

Ali Hariz Bin Anuari
- Email: thisalihariz08@gmail.com
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/alihariz)
- GitHub: [Your GitHub](https://github.com/alihariz)

---

Built with ❤️ using React + TypeScript + Tailwind CSS
