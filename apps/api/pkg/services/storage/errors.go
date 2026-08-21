package storage

import "errors"

// ErrStorageDisabled เกิดเมื่อเรียกใช้ storage โดยที่ยังไม่ได้ตั้งค่า R2
var ErrStorageDisabled = errors.New("storage service is not configured")
