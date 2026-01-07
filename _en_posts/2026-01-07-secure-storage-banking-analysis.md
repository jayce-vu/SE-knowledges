---
title: "DETAILED ANALYSIS: BANKING GRADE SECURE STORAGE (ANDROID & iOS)"
date: 2026-01-07
tags: [android, ios, security, banking]
summary: "Detailed analysis of Banking Grade Secure Storage on Android and iOS, including Android Keystore, iOS Keychain, Secure Enclave, and critical security standards."
pair_id: secure-storage-banking-analysis
---

## Context

In banking application development, data security is vital. One of the most important questions from Auditors is: "How is sensitive data (tokens, keys) stored?". This article provides a detailed analysis of Banking Grade Secure Storage on both Android and iOS platforms.

## I. ANDROID – ANDROID KEYSTORE (BANKING GRADE)

### 1️⃣ What is Android Keystore (Correct Understanding)

Android Keystore is not a place to store data, but a place to store **KEYS**.

- **Data (token)** → encrypted
- **Encrypted data** → stored in normal file/db/SharedPreferences
- **Key for decryption** → resides in Keystore

👉 **An attacker with the data file cannot decrypt it without the key.**

### 2️⃣ Hardware-backed (TEE / StrongBox) – Why it's critical

**TEE (Trusted Execution Environment)**
- Key resides in a secure hardware area
- OS, app, root cannot read it
- Crypto operations happen inside the TEE

**StrongBox (Higher Level)**
- Separate secure chip
- Resistant to physical attacks
- Supported by some high-end devices

📌 **Auditor will ask:**
> "Is the key hardware-backed?"

- If ❌ Software-only key → high risk
- If ✅ Hardware-backed → passes most banks

### 3️⃣ Key non-exportable – Vital

**What does it mean?**
The key cannot be exported outside. It cannot be:
- memory dumped
- backed up
- copied to another device

**Why is it important?**
- Root + memory dump → still cannot retrieve the key
- Token copied to another machine → decryption fails

👉 **If key is exportable → audit fail**

### 4️⃣ Token encrypt → store encrypted blob (Standard Flow)

**Correct Flow:**
```
[API Response]
    ↓
Encrypt token using Keystore key
    ↓
Encrypted blob (Base64)
    ↓
Store in file / db / SharedPreferences
```

📌 **Important:**
- Never store raw tokens
- SharedPreferences should only contain the encrypted blob

**Auditor will check:**
- Dump filesystem
- If raw token is found → fail

### 5️⃣ Tie key with User Authentication

**What does it mean?**
Key can only be used after user authentication:
- PIN
- Password
- Biometrics

**Result:**
- App opened but not authenticated → decryption fails
- App in background for a long time → must re-authenticate

👉 **Prevents:**
- Stolen device usage
- Dangerous app auto-login

### 6️⃣ Tie key with Device Lock

**Meaning:**
- Device must have a lock screen
- If user disables lock → key is invalidated

📌 **Banking apps usually:**
- Require device to have PIN/Pattern
- If not → block the app

### 7️⃣ Tie key with Biometric (Optional but strong)

Key is only usable after biometric success. Used for:
- Transfers
- Viewing sensitive data

📌 **Important:**
- Biometrics do not replace PIN
- Only adds a layer of convenience + extra security

## II. iOS – KEYCHAIN + SECURE ENCLAVE (BANKING GRADE)

### 1️⃣ iOS Keychain – How is it different from UserDefaults?

| | Keychain | UserDefaults |
|---|---|---|
| **Encrypt** | Plain text |
| **OS protected** | File |
| **Hardware support** | No |
| **Audit accepted** | ❌ |

Keychain is the official secure storage of iOS.

### 2️⃣ kSecAttrAccessibleWhenUnlockedThisDeviceOnly

**Explaining each part:**
- **WhenUnlocked:** Only accessible when the device is unlocked
- **ThisDeviceOnly:**
  - No backup
  - No iCloud sync
  - No restore to another device

👉 **This is a mandatory flag in banking**

**Auditor will ask:**
> “Can the Keychain item be restored?”

### 3️⃣ Secure Enclave – Highest level on iOS

**What is Secure Enclave?**
- Separate security chip
- Key resides in hardware
- OS cannot read it

**How Banking uses it:**
- Key generated inside Secure Enclave
- Key non-exportable
- Crypto operations inside the enclave

📌 **Not all devices have it, but:**
- If available → should be used
- If not → Software-backed Keychain (still OK)

### 4️⃣ No iCloud sync – Why?

If iCloud sync is enabled:
- Token → uploads to cloud
- Restore → another device can decrypt
❌ **Fail banking policy**

👉 **Must:**
- Disable iCloud sync
- Use `ThisDeviceOnly`

### 5️⃣ Device-only binding (Core)

**Meaning:**
Token is bound to:
- App instance
- Device hardware

Copying to another device → useless

📌 **Combined with backend:**
- Backend stores device_id
- Token is valid only for that device

## III. What Auditors look for?

**Android:**
- Key hardware-backed?
- Non-exportable?
- Does raw token exist?
- Key tied with auth?
- Root detect → wipe key?

**iOS:**
- Keychain access control?
- iCloud disabled?
- Secure Enclave used?
- Backup/restore test?

## IV. Common Mistakes causing AUDIT FAIL

- Using SharedPreferences/UserDefaults for tokens
- Key software-only
- Allowing backup
- Token decryptable when app is in background
- Not wiping key upon root/JB

## V. Brief Conclusion

- Token is less important than the **KEY**
- If Key is not in hardware → **not banking-grade**
