# drivingklass.com

Build a fully responsive, production-ready website for DRIVINGKLASS using the uploaded desktop and mobile UI designs as the exact visual reference.




GLOBAL DESIGN RULES (CRITICAL):
	•	The final UI must visually match the uploaded designs exactly
	•	Maintain:
	•	rich metallic gold
	•	reflective surfaces
	•	dark & light theme parity
	•	luxury automotive aesthetic
	•	Do not redesign the look — translate it into editable UI components




⸻




🎨 THEME & LAYOUT
	•	Implement Dark Mode & Light Mode
	•	Auto-switch based on system preference, with optional manual toggle
	•	Gold palette:
	•	deep metallic gold
	•	champagne highlights
	•	soft glow halos
	•	Backgrounds:
	•	dark mode: black with subtle gold particles
	•	light mode: ivory / champagne gradient




⸻




🚗 HERO SECTION (DESKTOP & MOBILE)
	•	Center the gold car with circular service buttons surrounding it
	•	Header:
	•	Text: DRIVINGKLASS
	•	Five gold stars beneath
	•	Continuous animations (all breakpoints):
	•	Gold stars orbit slowly like a galaxy
	•	Headlights softly flicker on/off continuously
	•	Subtle ambient gold particles floating




⸻




🔘 SERVICE BUTTON SYSTEM (CORE FUNCTIONALITY)




For each circular service button (1 HR, 2 HR, 4 HR, etc.):




Button Behavior:
	•	Hover:
	•	gentle lift
	•	glow intensifies
	•	slight scale animation
	•	Click:
	•	opens a service detail modal / slide-up panel




Service Detail Panel (Editable):




Each service must have:
	•	Editable Title
	•	Editable Price
	•	Editable Description
	•	Editable Square Payment Link




Include an “Add” button below the description:
	•	When clicked, it opens the Square payment link in a new tab




🔧 All service content must be editable from the Lovable editor without code.




⸻




💳 PAYMENTS (SQUARE)
	•	Each service “Add” button links to a unique Square Payment Link
	•	Links are editable fields
	•	Square handles checkout externally (secure redirect)




⸻




📋 CONTACT US SECTION (FUNCTIONAL FORM)




Add a scroll-down Contact Us section with:




Form Fields:
	•	Full Name (required)
	•	Phone Number (required)
	•	City
	•	Email (required)
	•	Message
	•	File Attachment (allow images & PDFs)




Form Requirements:
	•	Fully functional
	•	Validate required fields
	•	Show success message after submission




Backend Behavior:
	•	Store all submissions securely
	•	Store uploaded files
	•	Create an Admin View where admins can:
	•	view all submissions
	•	download attachments
	•	see timestamps




⸻




🧑‍💼 ADMIN CAPABILITIES




Provide an admin-only interface that allows:
	•	Viewing contact form submissions
	•	Managing service titles, prices, descriptions
	•	Updating Square links




⸻




🎞️ ANIMATIONS & INTERACTIONS




Apply across the entire site:
	•	Buttons animate on hover
	•	Modals open smoothly (fade + slide)
	•	Gold elements shimmer subtly
	•	Animations must be smooth, premium, and continuous
	•	No aggressive motion or gimmicks




⸻




📱 RESPONSIVENESS
	•	Mobile: use uploaded 9:16 designs
	•	Desktop: use uploaded 16:9 designs
	•	Tablet: intelligently adapt between both
	•	Ensure no overlap, clipping, or distortion




⸻




⚙️ TECH & QUALITY
	•	High performance
	•	Clean component structure
	•	SEO-friendly headings
	•	Accessible contrast and text sizes




⸻




🎯 FINAL GOAL




Deliver a fully built, editable, animated luxury website where:
	•	UI matches uploaded designs exactly
	•	Services are interactive and sellable
	•	Payments open via Square
	•	Contact form works end-to-end
	•	Admins can manage content without code




This site should feel premium, confident, modern, and professional, suitable for a high-end driving school brand.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://drivingklass.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d9554c7f-6bfa-4824-8d60-0836bb30b872).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
