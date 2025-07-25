# 🎯 Kiosk Queue Management System

A modern queue management system for Vietnamese government administrative centers built with **Next.js 15** and **TypeScript**.

## 🚀 Quick Start

### Environment Setup

1. Copy environment file:
```bash
cp .env.example .env.local
```

2. Configure API URL in `.env.local`:
```bash
# Production (default)
NEXT_PUBLIC_API_URL=https://detect-seat.onrender.com/app

# For local development
# NEXT_PUBLIC_API_URL=http://localhost:8000/app
```

### Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Architecture

### 4 Main Interfaces:
- **`/kiosk`** - Public self-service queue generation
- **`/tv`** - Real-time queue status display  
- **`/officer`** - Staff queue management
- **`/admin`** - System administration
- **`/test-queue`** - Debug interface for testing

### API Integration:
- **Backend URL**: https://detect-seat.onrender.com/app
- **Documentation**: `docs/frontend-api-documentation.md`
- **Timeout**: 30 seconds (for deployed server)

## 🔧 Configuration

### Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://detect-seat.onrender.com/app
NEXT_PUBLIC_APP_NAME=Kiosk Queue Management System
NEXT_PUBLIC_ENABLE_VOICE_INPUT=true
NEXT_PUBLIC_ENABLE_VIRTUAL_KEYBOARD=true
```

### Switching Between Environments:
- **Production**: Use `https://detect-seat.onrender.com/app`
- **Development**: Use `http://localhost:8000/app`

## 📱 Features

- ✅ Voice recognition (Vietnamese)
- ✅ Virtual keyboard
- ✅ Real-time queue updates
- ✅ Multi-interface design
- ✅ API integration with backend
- ✅ TypeScript support

## 🛠️ Development

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
#   L S T D _ A u t o T i c k e t 
 
 #   L S T D _ A u t o T i c k e t 
 
 