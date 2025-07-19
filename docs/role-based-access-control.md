# 🔐 Tài liệu Phân Quyền Hệ Thống

## 📋 **Yêu cầu Backend - Tạo tài khoản Officer**

### **🎯 Tổng quan:**
- **Admin** → `/test-queue` (quản lý tất cả 4 quầy)
- **Officer** → `/officer` (chỉ quản lý quầy được gán)

### **👥 Tài khoản cần tạo:**

#### **1. Admin Account (đã có):**
```json
{
  "username": "admin",
  "password": "admin123",
  "role": "admin",
  "full_name": "Quản trị viên",
  "counter_id": null
}
```

#### **2. Officer Accounts (cần tạo 4 tài khoản):**

**Officer 1 - Tư pháp:**
```json
{
  "username": "officer1",
  "password": "officer123",
  "role": "officer", 
  "full_name": "Nguyễn Văn A",
  "counter_id": 1
}
```

**Officer 2 - Kinh tế:**
```json
{
  "username": "officer2", 
  "password": "officer123",
  "role": "officer",
  "full_name": "Trần Thị B", 
  "counter_id": 2
}
```

**Officer 3 - Đất đai:**
```json
{
  "username": "officer3",
  "password": "officer123", 
  "role": "officer",
  "full_name": "Lê Văn C",
  "counter_id": 3
}
```

**Officer 4 - Văn hóa:**
```json
{
  "username": "officer4",
  "password": "officer123",
  "role": "officer", 
  "full_name": "Phạm Thị D",
  "counter_id": 4
}
```

### **🔧 SQL Commands (nếu cần):**
```sql
-- Tạo tài khoản Officer 1
INSERT INTO users (username, password, role, full_name, counter_id, is_active) 
VALUES ('officer1', 'hashed_password', 'officer', 'Nguyễn Văn A', 1, true);

-- Tạo tài khoản Officer 2
INSERT INTO users (username, password, role, full_name, counter_id, is_active) 
VALUES ('officer2', 'hashed_password', 'officer', 'Trần Thị B', 2, true);

-- Tạo tài khoản Officer 3  
INSERT INTO users (username, password, role, full_name, counter_id, is_active)
VALUES ('officer3', 'hashed_password', 'officer', 'Lê Văn C', 3, true);

-- Tạo tài khoản Officer 4
INSERT INTO users (username, password, role, full_name, counter_id, is_active)
VALUES ('officer4', 'hashed_password', 'officer', 'Phạm Thị D', 4, true);
```

---

## 🎭 **Luồng hoạt động:**

### **1. Admin Login Flow:**
```
admin đăng nhập → API trả về role: "admin" → FE redirect đến /test-queue
→ Có thể pause/resume/call-next tất cả 4 quầy
```

### **2. Officer Login Flow:**
```
officer1 đăng nhập → API trả về role: "officer", counter_id: 1 → FE redirect đến /officer
→ Chỉ có thể pause/resume/call-next quầy 1
```

### **3. API Response Requirements:**

**GET `/auths/me` cần trả về:**
```json
{
  "id": 1,
  "username": "officer1", 
  "full_name": "Nguyễn Văn A",
  "role": "officer",
  "counter_id": 1,
  "is_active": true
}
```

**Quan trọng:** `counter_id` là bắt buộc cho officer!

---

## 🛡️ **Security Implementation:**

### **Frontend Protection:**
- ✅ **AuthGuard component** - kiểm tra role và redirect
- ✅ **Route middleware** - bảo vệ server-side
- ✅ **Role-based UI** - ẩn/hiện chức năng theo quyền

### **Backend Requirements:**
- 🔒 **JWT Authentication** - verify token ở mọi API endpoint
- 🔒 **Role validation** - kiểm tra role trước khi thực hiện action
- 🔒 **Counter ownership** - officer chỉ được thao tác với counter được gán

### **API Endpoint Security:**

**Counter Operations:**
```typescript
// ✅ Valid: Officer 1 pause counter 1
POST /counters/1/pause
Headers: Authorization: Bearer officer1_token

// ❌ Invalid: Officer 1 pause counter 2 
POST /counters/2/pause  
Headers: Authorization: Bearer officer1_token
→ Should return 403 Forbidden
```

**Suggested Backend Validation:**
```python
def validate_counter_access(user_id: int, counter_id: int):
    user = get_user(user_id)
    
    if user.role == 'admin':
        return True  # Admin has access to all counters
    elif user.role == 'officer':
        return user.counter_id == counter_id  # Officer only their counter
    else:
        return False
```

---

## 🧪 **Testing Scenarios:**

### **Test Case 1: Admin Access**
```bash
# Login as admin
curl -X POST /auths/auth/token -d "username=admin&password=admin123"

# Should access all endpoints
curl -X POST /counters/1/pause -H "Authorization: Bearer admin_token"
curl -X POST /counters/2/pause -H "Authorization: Bearer admin_token"
curl -X POST /counters/3/pause -H "Authorization: Bearer admin_token"
curl -X POST /counters/4/pause -H "Authorization: Bearer admin_token"
```

### **Test Case 2: Officer Restricted Access**
```bash
# Login as officer1
curl -X POST /auths/auth/token -d "username=officer1&password=officer123"

# Should work (counter 1)
curl -X POST /counters/1/pause -H "Authorization: Bearer officer1_token"

# Should fail (counter 2)
curl -X POST /counters/2/pause -H "Authorization: Bearer officer1_token"
# Expected: 403 Forbidden
```

### **Test Case 3: Cross-Role Navigation**
```bash
# Officer tries to access admin endpoint
GET /test-queue with officer token → Should redirect to /officer

# Admin tries to access officer endpoint  
GET /officer with admin token → Should redirect to /test-queue
```

---

## 📱 **UI/UX Changes:**

### **Officer Interface Features:**
- ✅ **Single counter view** - chỉ hiển thị quầy được gán
- ✅ **Real-time queue** - danh sách chờ + đang phục vụ
- ✅ **Call next button** - gọi vé tiếp theo
- ✅ **Pause/Resume** - tạm dừng/tiếp tục quầy
- ✅ **User info display** - tên + role + quầy được gán

### **Test-queue (Admin) Features:**
- ✅ **Multi-counter dashboard** - hiển thị tất cả 4 quầy
- ✅ **Global controls** - tác động lên bất kỳ quầy nào
- ✅ **System statistics** - tổng quan toàn hệ thống

---

## 🚀 **Deployment Checklist:**

### **Backend Tasks:**
- [ ] Tạo 4 tài khoản officer với counter_id tương ứng
- [ ] Validate API `/auths/me` trả về đúng format
- [ ] Implement counter access validation
- [ ] Test security endpoints

### **Frontend Tasks:**  
- [x] ✅ Officer interface implementation
- [x] ✅ Role-based routing
- [x] ✅ AuthGuard with role checking
- [x] ✅ Login redirect logic

### **Testing Tasks:**
- [ ] Test admin → test-queue access
- [ ] Test officer1 → officer access (counter 1 only)
- [ ] Test officer2 → officer access (counter 2 only) 
- [ ] Test officer3 → officer access (counter 3 only)
- [ ] Test officer4 → officer access (counter 4 only)
- [ ] Test cross-role access restrictions

---

## 📞 **Contact & Support:**

Nếu có vấn đề với implementation:
1. Kiểm tra browser console logs
2. Verify API response format cho `/auths/me`
3. Test token validation
4. Check counter_id assignment cho officers

**Happy Coding! 🎯**
