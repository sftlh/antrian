<!-- Queue Management System with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma -->

## Project Overview
This is a queue management system for Indonesian tax service centers with the following roles:
- **Receptionist**: Input taxpayer NPWP, name, interests, and service needs (Helpdesk, TPT, or Both), then generate queue numbers
- **Helpdesk**: View and call taxpayers from their queue for general tax assistance
- **TPT (Tempat Pelayanan Terpadu)**: View and call taxpayers from their queue for technical tax service assistance
- **Kepala Seksi**: Supervise and view all queues

## Service Types
- **HELPDESK**: General assistance and information about tax services
- **TPT (Tempat Pelayanan Terpadu)**: Technical support for tax-related processes, systems, and procedures
- **BOTH**: Taxpayers needing both general help and technical assistance

## Tech Stack
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- JWT Authentication

## Architecture
- **App Router Structure**: API routes in `src/app/api/`, pages in `src/app/`, components in `src/components/`
- **Authentication**: JWT tokens stored in localStorage, verified server-side in API routes using `verifyToken` from `src/lib/auth/utils.ts`
- **Database Access**: Singleton Prisma client exported from `src/lib/prisma.ts`
- **State Management**: Client-side auth state with React Context in `src/lib/auth/context.tsx`, wrapped in `src/components/providers.tsx`

## Database Schema
- **Users** (roles: RECEPTIONIST, HELPDESK, TPT, KEPALA_SEKSI) - see `prisma/schema.prisma`
- **Customers/Taxpayers** (NPWP, name, interests)
- **Queues** (queue number, service type, status, timestamps, ratings, escalation)
- **QueueCounters** (daily counters for queue numbering)
- **ServiceTemplates** (reusable service descriptions)
- **Announcements** (public notices)

## Key Patterns
- **API Routes**: Authenticate requests with Bearer token, use Prisma for DB operations. Example: `src/app/api/auth/login/route.ts`
- **Queue Numbering**: Increment `QueueCounter` for each service type daily, format as "H001" for Helpdesk
- **Status Tracking**: Update `Queue.status` through lifecycle (WAITING → CALLED → IN_PROGRESS → COMPLETED)
- **Escalation**: For BOTH services, create sequence with `parentQueueId` and `serviceOrder`
- **Validation**: Use Zod schemas for input validation (currently minimal, expand in `src/lib/validations.ts`)
- **Components**: Client components use 'use client', access auth via `useAuth()` hook

## Development Workflow
- **Start Server**: `npm run dev` (runs on port 3003)
- **Database Setup**: `npx prisma migrate dev` for schema changes, `npx prisma db seed` for test data
- **View Data**: `npx prisma studio` to inspect/edit database
- **Build**: `npm run build` for production build
- **Test Users**: receptionist/password123, helpdesk/password123, etc.

## Key Features
- Role-based authentication and authorization
- Customer registration with NPWP validation
- Service selection (Helpdesk, TPT, Both)
- Automatic queue number generation
- Real-time queue status updates
- Role-specific dashboards and views
- Login form as the main entry point