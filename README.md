# Nawaitu (Nagawa Antrian Untukmu)

A comprehensive queue management system for Indonesian tax service centers built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.

## Features

- **Role-based Authentication**: Support for Receptionist, Helpdesk, TPT (Tempat Pelayanan Terpadu), and Kepala Seksi roles
- **Taxpayer Management**: Input taxpayer NPWP, name, interests, and service requirements
- **Queue Generation**: Automatic queue number generation for Helpdesk, TPT, or Both services
- **Real-time Queue Management**: View and manage queues for different service types
- **Dashboard Views**: Role-specific dashboards with appropriate functionality

## Service Types

- **HELPDESK**: General assistance and information about tax services
- **TPT (Tempat Pelayanan Terpadu)**: Technical support for tax-related processes, systems, and procedures
- **BOTH**: Taxpayers needing both general help and technical assistance

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with local storage
- **Styling**: Tailwind CSS

## Database Setup

### Option 1: Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL** on your system:
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres`

2. **Create database**:
   ```sql
   CREATE DATABASE antrian_db;
   CREATE USER antrian_user WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE antrian_db TO antrian_user;
   ```

3. **Update `.env`** with your database connection:
   ```
   DATABASE_URL="postgresql://antrian_user:password123@localhost:5432/antrian_db"
   ```

### Option 2: Cloud Database (Production)

You can use services like:
- **Supabase** (free tier available)
- **Neon** (serverless PostgreSQL)
- **Railway** or **PlanetScale**

Update your `DATABASE_URL` in `.env` accordingly.

### Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with initial data
npm run db:seed
```

### View Database (Optional)

```bash
# Open Prisma Studio to view/edit data
npm run db:studio
```

### Test Users

After seeding, you can login with these credentials:

- **Receptionist**: `receptionist` / `password123`
- **Helpdesk**: `helpdesk` / `password123`
- **TPT**: `tpt` / `password123`
- **Kepala Seksi**: `kepala_seksi` / `password123`

### Access the Application

After starting the development server with `npm run dev`, open [http://localhost:3000](http://localhost:3000) in your browser. You'll be presented with the login form where you can sign in using any of the test accounts above.

The system uses the following main entities:

- **Users**: Staff members with different roles
- **Customers**: Service center customers
- **Queues**: Queue entries with status tracking
- **QueueCounters**: Counter for generating queue numbers

## User Roles

### Receptionist
- Input customer information (NPWP, name, interests)
- Select service type (Helpdesk, TPT, or Both)
- Generate queue numbers

### Helpdesk
- View waiting customers in Helpdesk queue
- Call next customer
- Mark service as completed

### TPT (Teknisi Pelayanan Teknis)
- View waiting customers in TPT queue
- Call next customer
- Mark service as completed

### Kepala Seksi
- View overall queue statistics
- Monitor all service queues
- Access to system-wide metrics

## API Routes

- `POST /api/auth/login` - User login (returns JWT token)
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/queues` - Get queues (role-based)
- `POST /api/customers` - Create customer and queue
- `PUT /api/queues/:id` - Update queue status

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio

### Database Migrations

When you make changes to `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name your-migration-name
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.