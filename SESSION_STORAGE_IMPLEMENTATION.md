# 🔐 Session Storage Implementation - Multi-Tab Authentication

## 📋 **Tổng quan**

Thay đổi từ **localStorage** sang **sessionStorage** để giải quyết vấn đề đăng nhập nhiều tài khoản trên cùng một trình duyệt.

## 🚨 **Vấn đề trước đây**

### **Hiện tượng:**
- Đăng nhập admin trên tab 1
- Đăng nhập officer trên tab 2  
- Reload tab 1 → Bị chuyển thành trang officer
- Token bị ghi đè giữa các tab

### **Nguyên nhân:**
```typescript
// ❌ localStorage được chia sẻ giữa tất cả tabs
localStorage.setItem('auth_token', token); // Tab 2 ghi đè token của Tab 1
```

## ✅ **Giải pháp đã triển khai**

### **1. SessionStorage cho mỗi tab**
```typescript
// ✅ Mỗi tab có sessionStorage riêng
sessionStorage.setItem('auth_token', token);
sessionStorage.setItem('user_data', JSON.stringify(userData));
```

### **2. Files được cập nhật:**

#### **🔐 Authentication Files:**
- ✅ `src/app/login/page.tsx` - Login page
- ✅ `src/components/shared/AuthGuard.tsx` - Auth guard component  
- ✅ `src/libs/rootApi.ts` - Root API interceptors
- ✅ `src/libs/api.ts` - Legacy API interceptors

#### **📄 Page Components:**
- ✅ `src/app/officer/page.tsx` - Officer dashboard
- ✅ `src/app/test-queue/page.tsx` - Admin queue management

#### **🔧 Utility Files:**
- ✅ `src/libs/sessionManager.ts` - **NEW** Session management utility

## 🎯 **Chi tiết thay đổi**

### **Login Page (`src/app/login/page.tsx`)**
```typescript
// ❌ Trước đây
localStorage.setItem('auth_token', token);

// ✅ Bây giờ
sessionStorage.setItem('auth_token', token);
sessionStorage.setItem('user_data', JSON.stringify(userData));
```

### **AuthGuard (`src/components/shared/AuthGuard.tsx`)**
```typescript
// ✅ Cached user data
const cachedUserData = sessionStorage.getItem('user_data');
if (cachedUserData) {
  userData = JSON.parse(cachedUserData);
  setCurrentUser(userData);
} else {
  // Fetch fresh data và cache lại
  const response = await rootApi.get('/auths/me');
  sessionStorage.setItem('user_data', JSON.stringify(response.data));
}
```

### **API Interceptors**
```typescript
// ✅ Request interceptor
const token = sessionStorage.getItem('auth_token');

// ✅ Response interceptor (401 errors)
if (error.response?.status === 401) {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user_data');
  window.location.href = '/login';
}
```

### **Logout Functions**
```typescript
// ✅ Tất cả logout functions
const handleLogout = () => {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user_data');
  router.push('/login');
};
```

## 🚀 **Session Manager Utility**

### **Features:**
- ✅ **Singleton pattern** - Một instance duy nhất
- ✅ **Type-safe** - TypeScript interfaces đầy đủ
- ✅ **Caching** - Giảm API calls không cần thiết
- ✅ **Session ID** - Unique identifier cho mỗi tab
- ✅ **Multi-tab detection** - Cảnh báo khi login từ tab khác

### **Usage:**
```typescript
import { sessionManager, useMultiTabDetection } from '@/libs/sessionManager';

// Basic usage
sessionManager.setAuthToken(token);
sessionManager.setUserData(userData);
sessionManager.isAuthenticated();
sessionManager.getUserRole();
sessionManager.isAdmin();
sessionManager.isOfficer();

// Multi-tab detection hook
export default function MyComponent() {
  useMultiTabDetection(); // Tự động detect và warning
}
```

## 📊 **Kết quả sau khi triển khai**

### **✅ Multi-tab Support:**
- **Tab 1**: Login admin → sessionStorage có admin_token → `/test-queue` 
- **Tab 2**: Login officer → sessionStorage có officer_token → `/officer`
- **Reload Tab 1**: Vẫn có admin_token → Giữ nguyên `/test-queue`
- **Reload Tab 2**: Vẫn có officer_token → Giữ nguyên `/officer`

### **✅ Enhanced Security:**
- 🔒 **Auto-clear khi đóng tab** - sessionStorage tự xóa
- 🔄 **Token refresh** không ảnh hưởng tabs khác
- ⚠️ **Multi-tab warning** - Thông báo khi detect login từ tab khác

### **✅ Performance Improvements:**
- 📋 **User data caching** - Giảm API calls `/auths/me`
- ⚡ **Faster page loads** - Sử dụng cached data trước
- 🔍 **Smart fallback** - Fetch fresh nếu cache invalid

## 🧪 **Testing Scenarios**

### **Test Case 1: Basic Multi-tab**
1. ✅ Mở tab 1 → Login admin → Vào `/test-queue`
2. ✅ Mở tab 2 → Login officer → Vào `/officer`  
3. ✅ Reload tab 1 → Vẫn ở `/test-queue` (admin)
4. ✅ Reload tab 2 → Vẫn ở `/officer` (officer)

### **Test Case 2: Session Security**
1. ✅ Login trên tab 1
2. ✅ Đóng tab 1 → Session tự động clear
3. ✅ Mở tab mới → Phải login lại

### **Test Case 3: Token Expiration**
1. ✅ Login thành công
2. ✅ Token expire → 401 response
3. ✅ Auto redirect to `/login`
4. ✅ SessionStorage được clear

## 🔄 **Migration từ localStorage**

### **Automatic Cleanup:**
```typescript
// ✅ Code tự động check và migrate
const oldToken = localStorage.getItem('auth_token');
if (oldToken && !sessionStorage.getItem('auth_token')) {
  // Migrate từ localStorage sang sessionStorage
  sessionStorage.setItem('auth_token', oldToken);
  localStorage.removeItem('auth_token'); // Cleanup
}
```

## 📝 **Notes for Developers**

### **1. Không cần thay đổi API calls**
- Tất cả API calls giữ nguyên
- Interceptors tự động thêm token từ sessionStorage

### **2. Backward Compatibility**
- `authStorage` utilities vẫn hoạt động
- Legacy code không cần refactor ngay

### **3. Development vs Production**
- Development: Multi-tab debugging dễ dàng
- Production: Enhanced security và performance

## 🎉 **Tóm tắt**

✅ **Đã triển khai thành công sessionStorage**  
✅ **Multi-tab authentication hoạt động**  
✅ **Enhanced security và performance**  
✅ **Backward compatibility maintained**  
✅ **Session management utility added**  

**Bây giờ bạn có thể login nhiều tài khoản khác nhau trên các tab khác nhau mà không bị conflict! 🚀**
