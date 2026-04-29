---

## [EN] Summary
Teachenza is a universal online learning platform designed to give learners access to courses across many subjects in one place. It focuses on practical outcomes, flexible study paths, and a consistent learning experience that scales from single-skill goals to long-term upskilling.

## Brand
Name: Teachenza
Domain: teachenza.com
Tagline: Learn More, In One Place.

## MVP Scope
In scope for v1:
- Student registration, profile creation, and subject selection.
- Tutor registration, profile creation (including video introduction, qualifications, availability, and hourly rate).
- Search and filter functionality for students to find tutors based on subject, price, availability, and ratings.
- Integrated virtual classroom with video, chat, and whiteboard features.
- Secure payment processing for booking and conducting lessons.
Out of scope:
- Group lessons or cohort-based learning.
- Mobile native applications (web-only for v1).
- AI-powered lesson plan generation or progress tracking.

## Key Pages / Screens
1. Landing page
2. Student Dashboard (My Lessons, Find Tutors, Messages)
3. Tutor Profile Page (Public view with bio, video, subjects, reviews, availability)
4. Virtual Classroom Interface (Live lesson screen)
5. Tutor Dashboard (My Schedule, Earnings, Student Requests)

## Design Direction
Style: Modern Professional with Engaging Accents
Tone: Trusted, Empowering, and Approachable
References: Preply.com
Color mood:
- Primary Accent: `#ff7aac` (Vibrant Pink)
- Dominant Background: `#121117` (Deep Charcoal)
- Secondary Accent: `#99c5ff` (Soft Sky Blue)
- Neutral Text/UI: `#ffffff` (White), `#384047` (Dark Grey), `#4d4c5c` (Medium Grey)
- Font Family: Figtree (for body and general text), Platform (for headings and prominent elements)
- Border Radius: `md` (8px) for cards and interactive elements, `lg` (16px) for larger containers.
- Box Shadows: Subtle `sm` shadow for cards and interactive elements, `xl` for modals or highlighted sections.

## Personas
**Primary:** Anya Sharma, University Student, struggles to find specialized tutoring for advanced calculus that fits her erratic class schedule and budget.
**Secondary:** Mark Chen, Experienced Language Tutor, finds it difficult to reach a broader student base beyond local referrals and manage scheduling across different time zones.

## Pricing
Plan A: Basic Learner - $0/mo — Access to tutor directory, free messaging, pay-per-lesson. (Tutors pay 30% commission)
Plan B: Premium Learner - $19/mo — All Basic features + 10% discount on all lessons, priority support, advanced scheduling tools. (Tutors pay 20% commission)
Plan C: Pro Tutor - $39/mo — All Premium features + 5% discount on all lessons, dedicated account manager, enhanced profile visibility, analytics dashboard. (Tutors pay 10% commission)

## Tech Stack
Auth: Clerk
DB: Postgres
Deployment: Vercel
Payments: Stripe

## Launch Success Metric
Definition of "Launched": The platform is publicly accessible, fully functional for both students and tutors to register, find/offer lessons, conduct virtual sessions, and process payments, with at least 100 active tutors and 50 completed lessons within the first month post-launch.