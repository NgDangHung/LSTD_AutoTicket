# Kiosk System Configuration Guide

## 🏛️ Vietnamese Government Kiosk System - Production Setup

### System Requirements
- **OS**: Windows 10/11 (Chrome kiosk-printing support)
- **Browser**: Chrome 88+ with `--kiosk-printing` flag support
- **Printer**: 80mm thermal printer (set as default Windows printer)
- **Hardware**: Touch screen display, network connectivity
- **Node.js**: Version 18+ with npm

### Installation Steps

#### 1. 📦 Initial Setup
```bash
# Clone and install dependencies
npm install
npm run build
```

#### 2. 🖨️ Printer Configuration
1. Install thermal printer drivers
2. Set thermal printer as **default Windows printer**
3. Configure printer settings:
   - Paper size: 80mm x continuous
   - Print quality: Draft (for speed)
   - Margins: 0mm all sides

#### 3. 🚀 Deployment Scripts
Run the build script to create all deployment files:
```bash
build-kiosk.bat
```

This creates:
- `server-launcher.bat` - Next.js production server
- `kiosk-launcher.bat` - Chrome kiosk mode launcher
- `deploy-kiosk.bat` - Complete kiosk deployment

### Chrome Kiosk Configuration

#### Required Chrome Flags
```bash
--kiosk                                    # Full screen kiosk mode
--kiosk-printing                          # Enable silent printing
--disable-web-security                    # Allow local API calls
--disable-features=VizDisplayCompositor   # Better touch screen support
--autoplay-policy=no-user-gesture-required # Enable auto-play audio
--disable-background-timer-throttling     # Keep timers active
--disable-renderer-backgrounding          # Prevent performance throttling
--disable-backgrounding-occluded-windows  # Maintain full performance
```

#### Kiosk Mode Features
- ✅ **Silent Printing**: No print dialogs
- ✅ **Full Screen**: No browser UI
- ✅ **Touch Optimized**: Enhanced touch interaction
- ✅ **Auto-play Audio**: Voice feedback enabled
- ✅ **Performance**: No background throttling

### System Interfaces

#### 🖥️ Kiosk Interface (`/kiosk`)
- **Purpose**: Public self-service queue generation
- **Features**: Voice recognition, virtual keyboard, service selection
- **Printing**: Silent thermal printing with optimized templates
- **Authentication**: Public access (no login required)

#### 📺 TV Display (`/tv`)  
- **Purpose**: Real-time queue status display
- **Features**: Auto-refreshing queue display, announcements
- **Hardware**: Large TV/monitor for public viewing
- **Authentication**: Public access

#### 👮 Officer Interface (`/officer`)
- **Purpose**: Staff queue management
- **Features**: Call next ticket, pause service, manage queue
- **Authentication**: Officer role required
- **Hardware**: Staff computer/tablet

#### 👑 Admin Panel (`/admin`)
- **Purpose**: System administration
- **Features**: User management, system settings, reports
- **Authentication**: Admin role required
- **Access**: Secure admin credentials

### Production Deployment

#### 1. Environment Setup
```bash
# Production environment variables
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-server.gov.vn
NEXT_PUBLIC_KIOSK_MODE=true
```

#### 2. Network Configuration
- Configure firewall for port 3000
- Set up SSL certificates for HTTPS (recommended)
- Configure API endpoint URLs

#### 3. Hardware Setup
- Connect and test thermal printer
- Calibrate touch screen
- Test audio output for voice feedback
- Verify network connectivity

#### 4. Launch Kiosk System
```bash
# Start complete system
deploy-kiosk.bat
```

### Printing System Details

#### Silent Printing Detection
```javascript
// Automatic kiosk mode detection
const isKioskMode = window.chrome?.runtime?.onStartup !== undefined &&
                   navigator.userAgent.includes('Chrome') &&
                   window.location.protocol === 'http:';
```

#### Thermal Printer Optimization
- **Paper Width**: 80mm (302px at 96 DPI)
- **Ticket Height**: ~60mm based on content
- **Font Size**: 12pt for readability
- **Margins**: 8px for thermal printer clearance
- **Encoding**: UTF-8 for Vietnamese characters

#### Print Templates
- **Header**: Government logo and office name
- **Service Info**: Service name and description
- **Queue Details**: Ticket number, counter assignment
- **Footer**: Estimated wait time and instructions

### Troubleshooting

#### Common Issues

1. **Print dialog appears**
   - ❌ Chrome not in kiosk-printing mode
   - ✅ Verify `--kiosk-printing` flag is set
   - ✅ Check Chrome version (88+ required)

2. **Thermal printer not working**
   - ❌ Printer not set as default
   - ✅ Set thermal printer as Windows default
   - ✅ Test print from Windows settings

3. **Voice recognition not working**
   - ❌ Microphone permissions denied
   - ✅ Allow microphone access in Chrome
   - ✅ Check microphone hardware connection

4. **Touch screen issues**
   - ❌ Touch calibration needed
   - ✅ Calibrate touch screen in Windows
   - ✅ Verify touch driver installation

### Security Considerations

#### Kiosk Security
- **Browser isolation**: Chrome runs in restricted kiosk mode
- **No file access**: Disabled file system access
- **Limited navigation**: Locked to kiosk interface
- **Auto-restart**: Automatic recovery from crashes

#### Network Security
- **HTTPS recommended**: Use SSL certificates in production
- **API authentication**: Secure backend API endpoints
- **Rate limiting**: Prevent API abuse
- **Audit logging**: Track all system interactions

### Maintenance

#### Daily Checks
- [ ] Thermal printer paper level
- [ ] Network connectivity
- [ ] Touch screen responsiveness
- [ ] Audio output functionality

#### Weekly Maintenance
- [ ] Clear browser cache and data
- [ ] Restart kiosk system
- [ ] Check system logs
- [ ] Update queue statistics

#### Monthly Updates
- [ ] Chrome browser updates
- [ ] System security patches
- [ ] Backup configuration files
- [ ] Performance optimization

### Support Information

#### System Logs
- **Chrome logs**: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\`
- **Application logs**: Check browser console for errors
- **Network logs**: Monitor API call success rates

#### Contact Information
- **Technical Support**: IT Department
- **Hardware Issues**: Facilities Management  
- **Software Updates**: Development Team
- **Emergency**: System Administrator

---

**Last Updated**: Production Deployment Guide v1.0
**Compatible**: Chrome 88+, Windows 10/11, Next.js 15
