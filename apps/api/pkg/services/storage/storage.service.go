package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"path"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/logger"
)

// verifyTimeout — เวลารอสูงสุดของการตรวจ R2 ตอนบูต
const verifyTimeout = 10 * time.Second

type StorageService struct {
	client *s3.Client
	config core.R2Config
}

// New สร้าง storage service — ถ้าตั้งค่าไม่ครบจะคืน service ที่ปิดการทำงาน
// (คืน error เมื่อถูกเรียกใช้ แทนที่จะทำให้ startup ล้ม)
func New(cfg core.Config) *StorageService {
	s := &StorageService{config: cfg.R2}

	if cfg.R2.AccessKey == "" || cfg.R2.Endpoint == "" {
		logger.Warn("R2 credentials not configured — storage service disabled")
		return s
	}

	client, err := NewR2Client(cfg.R2)
	if err != nil {
		logger.Error("cannot init R2 client: ", err)
		return s
	}
	s.client = client
	// ยืนยันว่าคีย์ใช้ได้จริงและ bucket มีอยู่ โดยไม่บล็อก startup —
	// ถ้ารอ HeadBucket ตอนบูตแล้ว R2 ช้าหรือล่ม API จะขึ้นช้าตามไปด้วยโดยไม่จำเป็น
	go s.logVerification()
	return s
}

func (s *StorageService) Enabled() bool { return s.client != nil }

// Upload อัปโหลดไฟล์และคืน key ที่ใช้อ้างอิงภายหลัง
func (s *StorageService) Upload(ctx context.Context, bucket, prefix, filename string, body io.Reader, contentType string) (string, error) {
	if !s.Enabled() {
		return "", ErrStorageDisabled
	}

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, body); err != nil {
		return "", err
	}

	key := path.Join(prefix, uuid.NewString()+path.Ext(filename))
	data := buf.Bytes()

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &key,
		Body:        bytes.NewReader(data),
		ContentType: &contentType,
	})
	if err != nil {
		return "", err
	}
	return key, nil
}

func (s *StorageService) Delete(ctx context.Context, bucket, key string) error {
	if !s.Enabled() {
		return ErrStorageDisabled
	}
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: &bucket, Key: &key})
	return err
}

// PresignedURL สร้างลิงก์ชั่วคราวสำหรับดาวน์โหลด
func (s *StorageService) PresignedURL(ctx context.Context, bucket, key string, ttl time.Duration) (string, error) {
	if !s.Enabled() {
		return "", ErrStorageDisabled
	}
	presigner := s3.NewPresignClient(s.client)
	req, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{Bucket: &bucket, Key: &key},
		s3.WithPresignExpires(ttl))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

func (s *StorageService) ImageBucket() string { return s.config.ImageBucket }
func (s *StorageService) VideoBucket() string { return s.config.VideoBucket }

// Verify ยิง HeadBucket ทีละ bucket เพื่อพิสูจน์ว่าคีย์ถูกและ bucket มีอยู่จริง
//
// ต่างจาก Enabled() ที่บอกแค่ว่า "ตั้งค่าครบ" — คีย์ที่พิมพ์ผิด, endpoint ผิด account
// หรือ token ที่ไม่มีสิทธิ์กับ bucket นั้น จะเงียบสนิทจนกว่าจะมีคนอัปโหลดไฟล์แรก
func (s *StorageService) Verify(ctx context.Context) error {
	if !s.Enabled() {
		return ErrStorageDisabled
	}
	for _, bucket := range []string{s.config.ImageBucket, s.config.VideoBucket} {
		if bucket == "" {
			continue
		}
		if _, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: &bucket}); err != nil {
			return fmt.Errorf("bucket %s: %w", bucket, err)
		}
	}
	return nil
}

// logVerification เขียนผลการตรวจลง log ตอนบูต — บรรทัดนี้คือหลักฐานเดียวที่บอกว่า
// ตั้งค่า R2 บน production สำเร็จหรือไม่ ตราบใดที่ยังไม่มี endpoint อัปโหลดให้ลองยิง
func (s *StorageService) logVerification() {
	ctx, cancel := context.WithTimeout(context.Background(), verifyTimeout)
	defer cancel()

	if err := s.Verify(ctx); err != nil {
		logger.Error("R2: ต่อไม่ติด — ตรวจ R2_ENDPOINT / R2_ACCESS_KEY / R2_SECRET_KEY และชื่อ bucket: ", err)
		return
	}
	logger.Info("R2: ต่อติดแล้ว — bucket ", s.config.ImageBucket, " และ ", s.config.VideoBucket, " พร้อมใช้งาน")
}
