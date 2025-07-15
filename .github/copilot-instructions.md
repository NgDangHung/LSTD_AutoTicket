# Copilot Instructions - Vietnamese Government Kiosk System

## Architecture Overview

This is a **Next.js 15 multi-interface queue management system** for Vietnamese government administrative centers. The system has 4 distinct user interfaces:
- **Kiosk Interface** (`/kiosk`) - Public self-service queue generation
- **TV Display** (`/tv`) - Real-time queue status display  
- **Officer Interface** (`/officer`) - Staff queue management
- **Admin Panel** (`/admin`) - System administration

**Key Pattern**: Each interface has its own route in `src/app/` and corresponding components in `src/components/`. Components are organized by interface type, not by functionality.

## Core Kiosk System (`src/components/kiosk/`)

The main kiosk interface consists of 3 integrated components working together:

### 1. KioskMainScreen.tsx
- **Central state management** for voice recognition, virtual keyboard, and service selection
- **Unique ticket generation** using `Set<number>` for collision avoidance (4-digit format: 1000-9999)
- **Dual input modes**: Voice triggers differ based on entry point:
  - `outside-click` trigger: Icon click → stop on outside click
  - `enter-key` trigger: Keyboard voice button → stop on Enter key

### 2. SpeechToText.tsx  
- **Headless component** (returns `null`) - pure logic, no UI
- **Vietnamese Web Speech API** integration with `vi-VN` locale
- **Real-time transcription** via `onTranscript` callback
- **Global Window interface extension** for browser speech recognition support

### 3. VirtualKeyboard.tsx
- **react-simple-keyboard** integration with Vietnamese character support
- **Dynamic Enter key behavior**: Shows "🛑 Dừng Voice" in voice mode vs "↵ Enter" normally
- **Click-outside dismissal** with ref-based detection

## CSS Architecture

**Dual CSS system**: Tailwind utilities + custom CSS classes

### Tailwind (@layer components in globals.css)
```css
.kiosk-card {
  min-width: 368px; min-height: 192px;
  @apply bg-white rounded-2xl shadow-lg /* ... */;
}
```

### Custom animations (index.css)
- **Modal animations**: `modalFadeIn`, `modalFadeOut` with scale+translate
- **Keyboard animations**: `keyboardSlideUp` with cubic-bezier easing
- **Custom scrollbars**: `.service-grid-container::-webkit-scrollbar-*` pattern

**Scroll container pattern**: Max height containers (448px for 2 rows, 300px for 6 items) with `overflow-y-auto` and custom webkit scrollbars.

## State Management Patterns

**Local component state + localStorage queue system** - no global state management. Key patterns:

1. **Modal visibility**: Boolean flags (`showConfirmCounter`, `showVirtualKeyboard`)
2. **Voice state coordination**: 
   ```tsx
   const [isVoiceActive, setIsVoiceActive] = useState(false);
   const [voiceStopTrigger, setVoiceStopTrigger] = useState<'outside-click' | 'enter-key' | 'manual'>('manual');
   ```
3. **Unique ID tracking**: `Set` for collision detection rather than arrays
4. **Queue synchronization**: MockQueueManager with localStorage + CustomEvent broadcasting for real-time TV updates

## Queue Management System

**Real-time kiosk ↔ TV communication** via localStorage and custom events:

- **MockQueueManager** (`src/libs/mockQueue.ts`) - localStorage-based queue state
- **Custom events** - `queueUpdated` dispatched when queue changes
- **TV auto-refresh** - useQueuePolling listens for storage changes and custom events
- **Test page** (`/test-queue`) - Debug interface for queue management

## Integration Points

### Toast Notifications (react-toastify)
- **Container configured globally** in `layout.tsx` with custom width (600px)
- **Success pattern**: Multi-line JSX with service info, counter assignment, and ticket number
- **Position**: `top-center` for kiosk visibility

### External Dependencies
- **Lucide React**: Consistent icon system (`AudioLines`, `Printer`, `Mic`, etc.)
- **react-simple-keyboard**: Virtual keyboard with custom layouts and Vietnamese support
- **Web Speech API**: Browser-native voice recognition (Chrome/Edge required)

## Development Workflow

```bash
npm run dev        # Development server on :3000
npm run build      # Production build
npm run lint       # ESLint checking
```

**Route structure**: `/kiosk`, `/tv`, `/officer`, `/admin` - each with dedicated page components.

## Vietnamese Localization

- **All UI text in Vietnamese** - including placeholders, error messages, button labels
- **Speech recognition**: Configured for `vi-VN` locale
- **Example phrases**: "Thuế", "Cấp giấy tờ", "Đăng ký kinh doanh"
- **Mock government services**: Realistic Vietnamese administrative service names

## Component Communication

**Props drilling pattern** - parent components pass callbacks down:
```tsx
// KioskMainScreen coordinates between components
<VirtualKeyboard onVoiceClick={() => setIsVoiceActive(true)} />
<SpeechToText onTranscript={setSearchValue} onStop={handleSpeechStop} />
```

**No context or global state** - all communication through props and callbacks.

## Key Files to Understand

- `src/components/kiosk/KioskMainScreen.tsx` - Main state orchestration + queue creation
- `src/libs/mockQueue.ts` - localStorage queue management with real-time events
- `src/hooks/useQueuePolling.ts` - Queue data polling with localStorage sync
- `src/components/tv/QueueDisplay.tsx` - Real-time TV display with announcements
- `src/app/globals.css` - Tailwind component classes  
- `src/app/index.css` - Custom animations and scrollbar styling
- `src/app/test-queue/page.tsx` - Debug interface for testing queue system
