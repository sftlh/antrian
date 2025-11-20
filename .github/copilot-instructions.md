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

## Database Schema
- Users (roles: RECEPTIONIST, HELPDESK, TPT, KEPALA_SEKSI)
- Customers/Taxpayers (NPWP, name, interests)
- Queues (queue number, service type, status, timestamps)
- QueueAssignments (customer-queue relationships)

## Key Features
- Role-based authentication and authorization
- Customer registration with NPWP validation
- Service selection (Helpdesk, TPT, Both)
- Automatic queue number generation
- Real-time queue status updates
- Role-specific dashboards and views
- Login form as the main entry point